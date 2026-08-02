// ============================================================================
//  Fondos: inversiones y metas de ahorro.
// ----------------------------------------------------------------------------
//  Un fondo es un bolsillo donde apartás plata. Se le hacen cuatro cosas:
//  aportar, retirar, valuar (anotar cuánto vale hoy) y acreditar intereses.
//
//  La cuenta que importa:
//      aportado    = lo que pusiste menos lo que sacaste
//      valor       = lo que vale hoy
//      rendimiento = valor − aportado (+ los intereses que ya cobraste)
//
//  Un aporte NO es un gasto y un rendimiento NO es un ingreso hasta que lo
//  cobrás. Por eso los aportes se registran como transferencias y los intereses
//  solo entran al flujo del mes cuando se marcan como cobrados.
// ============================================================================

import { hoyISO } from './format'

export const TIPOS_INVERSION = [
  { id: 'plazo_fijo', nombre: 'Plazo fijo', emoji: '🏦' },
  { id: 'fci', nombre: 'Fondo común / billetera', emoji: '📊' },
  { id: 'dolares', nombre: 'Dólares guardados', emoji: '💵' },
  { id: 'cripto', nombre: 'Cripto', emoji: '🪙' },
  { id: 'acciones', nombre: 'Acciones / bonos', emoji: '📈' },
  { id: 'otro', nombre: 'Otro', emoji: '📦' },
]

// Estado de un fondo a partir de sus operaciones.
export function estadoFondo(fondo, ops) {
  const propias = ops
    .filter((o) => o.fondoId === fondo.id)
    .sort((a, b) => a.fecha.localeCompare(b.fecha) || (a.id ?? 0) - (b.id ?? 0))

  let aportado = 0
  let interesesCobrados = 0
  let ultimaValuacion = null

  for (const op of propias) {
    if (op.tipo === 'aporte') aportado += op.monto
    else if (op.tipo === 'retiro') aportado -= op.monto
    else if (op.tipo === 'interes' && op.cobrado) interesesCobrados += op.monto
    else if (op.tipo === 'valuacion') ultimaValuacion = op
  }

  // El valor sale de la última valuación, ajustada por lo que pasó después:
  // si valuaste el 1 y aportaste el 10, hoy vale la valuación más ese aporte.
  let valor
  if (ultimaValuacion) {
    valor = ultimaValuacion.monto
    for (const op of propias) {
      if (op.fecha < ultimaValuacion.fecha) continue
      if (op.id <= ultimaValuacion.id && op.fecha === ultimaValuacion.fecha) continue
      if (op.tipo === 'aporte') valor += op.monto
      else if (op.tipo === 'retiro') valor -= op.monto
      else if (op.tipo === 'interes' && !op.cobrado) valor += op.monto
    }
  } else {
    // Sin ninguna valuación, lo mejor que sabemos es lo que pusiste más lo que
    // rindió y quedó adentro.
    valor = aportado
    for (const op of propias) {
      if (op.tipo === 'interes' && !op.cobrado) valor += op.monto
    }
  }

  const rendimiento = valor - aportado + interesesCobrados
  return {
    fondo,
    ops: propias,
    aportado,
    valor,
    rendimiento,
    interesesCobrados,
    // Sin plata puesta no hay porcentaje que calcular.
    rendimientoPct: aportado > 0 ? rendimiento / aportado : null,
    ultimaValuacion,
    // Una valuación vieja hace que el número mostrado sea viejo: conviene avisar.
    diasDesdeValuacion: ultimaValuacion ? diasEntre(ultimaValuacion.fecha, hoyISO()) : null,
    // Solo para metas.
    progreso: fondo.objetivo > 0 ? Math.min(valor / fondo.objetivo, 1) : null,
    falta: fondo.objetivo > 0 ? Math.max(fondo.objetivo - valor, 0) : null,
  }
}

// Cuánto habría que apartar por mes para llegar a la meta en fecha.
export function aporteMensualSugerido(estado) {
  const { fondo, falta } = estado
  if (!fondo.objetivo || !fondo.fechaObjetivo || falta == null) return null
  const meses = mesesHasta(fondo.fechaObjetivo)
  if (meses <= 0) return null
  return falta / meses
}

// Totales de todos los fondos, convertidos a una sola moneda.
export function resumenFondos(fondos, ops, conversor, moneda) {
  let valor = 0
  let aportado = 0
  let rendimiento = 0
  const estados = []

  for (const f of fondos) {
    const e = estadoFondo(f, ops)
    estados.push(e)
    // Los montos del fondo están en SU moneda: se convierten con la cotización
    // de hoy, porque representan plata que existe ahora, no un gasto pasado.
    const aMoneda = (n) =>
      conversor.enMoneda({ monto: n, moneda: f.moneda ?? 'ARS', fecha: hoyISO() }, moneda) ?? 0
    valor += aMoneda(e.valor)
    aportado += aMoneda(e.aportado)
    rendimiento += aMoneda(e.rendimiento)
  }

  return {
    estados,
    valor,
    aportado,
    rendimiento,
    rendimientoPct: aportado > 0 ? rendimiento / aportado : null,
  }
}

// ---------------------------------------------------------------------------
//  Deuda en cuotas
// ---------------------------------------------------------------------------

// Lo que todavía queda por pagar de las compras financiadas: son las cuotas con
// fecha posterior a hoy. Responde "¿cuánto debo?" y "¿cuánto se me viene?".
export function deudaEnCuotas(movimientos, compras, hoy = hoyISO()) {
  const porCompra = new Map()
  let total = 0
  const porMes = new Map()

  for (const m of movimientos) {
    if (!m.compraId || m.fecha <= hoy) continue
    total += m.monto
    porCompra.set(m.compraId, (porCompra.get(m.compraId) ?? 0) + m.monto)
    const mes = m.fecha.slice(0, 7)
    porMes.set(mes, (porMes.get(mes) ?? 0) + m.monto)
  }

  const detalle = (compras ?? [])
    .map((c) => {
      const pendiente = porCompra.get(c.id) ?? 0
      const cuotas = movimientos.filter((m) => m.compraId === c.id)
      const pagadas = cuotas.filter((m) => m.fecha <= hoy).length
      return {
        compra: c,
        pendiente,
        pagadas,
        total: cuotas.length,
        // La cuota que viene: la primera que todavía no venció.
        proxima: cuotas
          .filter((m) => m.fecha > hoy)
          .sort((a, b) => a.fecha.localeCompare(b.fecha))[0],
      }
    })
    .filter((d) => d.pendiente > 0)
    .sort((a, b) => b.pendiente - a.pendiente)

  return {
    total,
    detalle,
    porMes: [...porMes.entries()].sort((a, b) => a[0].localeCompare(b[0])),
  }
}

// ---------------------------------------------------------------------------
//  Proyección de cierre de mes
// ---------------------------------------------------------------------------

// Con cuánto vas a cerrar el mes. No extrapola: suma lo que ya pasó más lo que
// SE SABE que falta (los fijos que no confirmaste y las cuotas que vencen),
// y solo estima la parte variable a partir del ritmo de los días transcurridos.
export function proyeccionCierre({ movsDelMes, fijos, mes, hoy = hoyISO(), diasDelMes }) {
  const esMesActual = mes === hoy.slice(0, 7)
  if (!esMesActual) return null

  const diaHoy = Number(hoy.slice(8, 10))
  let gastosHasta = 0
  let ingresosHasta = 0
  let gastosFuturosCargados = 0
  let ingresosFuturosCargados = 0
  let variablesHasta = 0

  for (const m of movsDelMes) {
    const futuro = m.fecha > hoy
    if (m.tipo === 'gasto') {
      if (futuro) gastosFuturosCargados += m.monto
      else {
        gastosHasta += m.monto
        // Lo que no es cuota ni fijo es gasto variable: eso es lo único que
        // tiene sentido proyectar por ritmo.
        if (!m.compraId && !m.fijoId) variablesHasta += m.monto
      }
    } else if (m.tipo === 'ingreso') {
      if (futuro) ingresosFuturosCargados += m.monto
      else ingresosHasta += m.monto
    }
  }

  // Fijos que todavía no se confirmaron este mes.
  let fijosGastoPendientes = 0
  let fijosIngresoPendientes = 0
  for (const f of fijos ?? []) {
    if (!f.activo || f.ultimoMes === mes) continue
    if (f.tipo === 'gasto') fijosGastoPendientes += f.monto
    else fijosIngresoPendientes += f.monto
  }

  const diasRestantes = Math.max(diasDelMes - diaHoy, 0)
  const variablesProyectados = diaHoy > 0 ? (variablesHasta / diaHoy) * diasRestantes : 0

  const gastosProyectados =
    gastosHasta + gastosFuturosCargados + fijosGastoPendientes + variablesProyectados
  const ingresosProyectados = ingresosHasta + ingresosFuturosCargados + fijosIngresoPendientes

  return {
    gastos: gastosProyectados,
    ingresos: ingresosProyectados,
    balance: ingresosProyectados - gastosProyectados,
    // Lo comprometido es lo que ya está decidido: no depende de cómo te portes.
    comprometido: gastosFuturosCargados + fijosGastoPendientes,
    variablesProyectados,
    diasRestantes,
    confiable: diaHoy >= 5,
  }
}

// ---------------------------------------------------------------------------

function diasEntre(desde, hasta) {
  return Math.round((Date.parse(hasta) - Date.parse(desde)) / 86400000)
}

function mesesHasta(fechaISO) {
  const hoy = hoyISO()
  const [a1, m1] = hoy.split('-').map(Number)
  const [a2, m2] = fechaISO.split('-').map(Number)
  return (a2 - a1) * 12 + (m2 - m1)
}
