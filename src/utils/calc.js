// ============================================================================
//  Motor de cálculo del panel.
//  Todo trabaja sobre el array plano de movimientos que ya vive en memoria:
//  para un uso personal (miles de registros) es instantáneo y evita consultas
//  raras a IndexedDB. Las fechas son 'YYYY-MM-DD', así que se comparan como
//  texto sin necesidad de construir Date (más rápido y sin líos de zona horaria).
// ============================================================================

import { hoyISO, mesActualISO } from './format'

// ---------------------------------------------------------------------------
//  Períodos
// ---------------------------------------------------------------------------

export const PERIODOS = [
  { id: 'mes', label: 'Mes' },
  { id: 'trimestre', label: '3 meses' },
  { id: 'anio', label: 'Año' },
  { id: 'todo', label: 'Todo' },
]

export function sumarMeses(mesISO, delta) {
  const [a, m] = mesISO.split('-').map(Number)
  const d = new Date(a, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function diasDelMes(mesISO) {
  const [a, m] = mesISO.split('-').map(Number)
  return new Date(a, m, 0).getDate()
}

// Devuelve el rango [desde, hasta] (inclusive, en ISO) de un período.
// `mes` es el mes de referencia: el período siempre TERMINA en ese mes.
export function rangoDe(periodo, mes) {
  switch (periodo) {
    case 'mes':
      return { desde: `${mes}-01`, hasta: `${mes}-${String(diasDelMes(mes)).padStart(2, '0')}` }
    case 'trimestre': {
      const ini = sumarMeses(mes, -2)
      return { desde: `${ini}-01`, hasta: `${mes}-${String(diasDelMes(mes)).padStart(2, '0')}` }
    }
    case 'anio': {
      const anio = mes.slice(0, 4)
      return { desde: `${anio}-01-01`, hasta: `${anio}-12-31` }
    }
    default:
      return { desde: '0000-01-01', hasta: '9999-12-31' }
  }
}

// El mismo período corrido hacia atrás, para comparar contra "lo anterior".
//
// Con el mes en curso el período anterior se RECORTA al mismo tramo: el día 3
// de agosto se compara contra el 1–3 de julio, no contra julio entero. Si no,
// todos los meses arrancarían con un engañoso "gastás 90% menos".
export function rangoAnterior(periodo, mes) {
  switch (periodo) {
    case 'mes': {
      const previo = sumarMeses(mes, -1)
      const completo = rangoDe('mes', previo)
      if (mes !== mesActualISO()) return completo
      const dia = Math.min(Number(hoyISO().slice(8, 10)), diasDelMes(previo))
      return {
        desde: `${previo}-01`,
        hasta: `${previo}-${String(dia).padStart(2, '0')}`,
        parcial: true,
      }
    }
    case 'trimestre':
      return rangoDe('trimestre', sumarMeses(mes, -3))
    case 'anio': {
      const anio = String(Number(mes.slice(0, 4)) - 1)
      return { desde: `${anio}-01-01`, hasta: `${anio}-12-31` }
    }
    default:
      return null
  }
}

export function etiquetaPeriodo(periodo, mes) {
  const nombre = (m) => {
    const [a, mm] = m.split('-').map(Number)
    return new Date(a, mm - 1, 1)
      .toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
      .replace(/^./, (c) => c.toUpperCase())
  }
  switch (periodo) {
    case 'mes':
      return nombre(mes)
    case 'trimestre': {
      const ini = sumarMeses(mes, -2)
      const corto = (m) => {
        const [a, mm] = m.split('-').map(Number)
        return new Date(a, mm - 1, 1).toLocaleDateString('es-AR', { month: 'short' })
      }
      return `${corto(ini)} – ${corto(mes)} ${mes.slice(0, 4)}`
    }
    case 'anio':
      return `Año ${mes.slice(0, 4)}`
    default:
      return 'Todo el historial'
  }
}

export function enRango(movs, { desde, hasta }) {
  return movs.filter((m) => m.fecha >= desde && m.fecha <= hasta)
}

// ---------------------------------------------------------------------------
//  Totales
// ---------------------------------------------------------------------------

export function resumen(movs) {
  let gastos = 0
  let ingresos = 0
  for (const m of movs) {
    if (m.tipo === 'gasto') gastos += m.monto
    else ingresos += m.monto
  }
  const balance = ingresos - gastos
  return {
    gastos,
    ingresos,
    balance,
    cantidad: movs.length,
    // Qué proporción de lo que entró te quedó. Sin ingresos cargados no aplica.
    tasaAhorro: ingresos > 0 ? balance / ingresos : null,
  }
}

// Variación porcentual contra el período anterior. null cuando no hay base
// de comparación (dividir por cero no dice nada útil).
export function variacion(actual, anterior) {
  if (!anterior) return null
  return (actual - anterior) / anterior
}

// Cuántos días de base hace falta para que proyectar el cierre signifique algo.
// Con dos o tres días, un solo gasto grande distorsiona todo el mes.
const MINIMO_PARA_PROYECTAR = 5

// Promedio diario y proyección a fin de mes.
// Solo tiene sentido en el mes en curso: si el mes ya cerró, el gasto real ES
// el total, y proyectar sería inventar.
export function ritmoMensual(movsDelMes, mes) {
  const gastos = movsDelMes.filter((m) => m.tipo === 'gasto')
  const total = gastos.reduce((s, m) => s + m.monto, 0)
  const total_dias = diasDelMes(mes)
  const esMesActual = mes === mesActualISO()
  const diaHoy = Number(hoyISO().slice(8, 10))

  // Si hay gastos con fecha posterior a hoy (algo cargado por adelantado),
  // el promedio tiene que repartirse hasta ese día: dividir un gasto del 15 por
  // los días transcurridos hasta el 2 daría un promedio diario disparatado.
  const ultimoDiaConGasto = gastos.reduce(
    (max, m) => Math.max(max, Number(m.fecha.slice(8, 10))),
    0,
  )
  const transcurridos = esMesActual
    ? Math.min(Math.max(diaHoy, ultimoDiaConGasto), total_dias)
    : total_dias

  const puedeProyectar = esMesActual && transcurridos >= MINIMO_PARA_PROYECTAR

  return {
    total,
    promedioDiario: transcurridos > 0 ? total / transcurridos : 0,
    proyeccion: puedeProyectar ? (total / transcurridos) * total_dias : null,
    transcurridos,
    total_dias,
    esMesActual,
  }
}

// ---------------------------------------------------------------------------
//  Desgloses
// ---------------------------------------------------------------------------

// Gastos (o ingresos) agrupados por categoría, con % del total, cantidad de
// movimientos, desglose de subcategorías y comparación contra el período previo.
export function porCategoria(movs, tipo = 'gasto', movsPrevios = null) {
  const filtrados = movs.filter((m) => m.tipo === tipo)
  const total = filtrados.reduce((s, m) => s + m.monto, 0)

  const mapa = new Map()
  for (const m of filtrados) {
    const cat = m.categoria || 'Sin categoría'
    if (!mapa.has(cat)) mapa.set(cat, { nombre: cat, total: 0, cantidad: 0, subs: new Map() })
    const e = mapa.get(cat)
    e.total += m.monto
    e.cantidad++
    const sub = m.subcategoria || '—'
    e.subs.set(sub, (e.subs.get(sub) ?? 0) + m.monto)
  }

  let previos = null
  if (movsPrevios) {
    previos = new Map()
    for (const m of movsPrevios) {
      if (m.tipo !== tipo) continue
      const cat = m.categoria || 'Sin categoría'
      previos.set(cat, (previos.get(cat) ?? 0) + m.monto)
    }
  }

  return [...mapa.values()]
    .map((e) => ({
      nombre: e.nombre,
      total: e.total,
      cantidad: e.cantidad,
      pct: total > 0 ? e.total / total : 0,
      anterior: previos ? (previos.get(e.nombre) ?? 0) : null,
      variacion: previos ? variacion(e.total, previos.get(e.nombre) ?? 0) : null,
      subs: [...e.subs.entries()]
        .map(([nombre, monto]) => ({
          nombre,
          total: monto,
          pct: e.total > 0 ? monto / e.total : 0,
        }))
        .sort((a, b) => b.total - a.total),
    }))
    .sort((a, b) => b.total - a.total)
}

// Gastos agrupados por GRUPO (Vivienda, Transporte…), el nivel de arriba de las
// categorías. Es la vista que responde "¿qué porcentaje se me va en vivienda?"
// sin tener que sumar alquiler + expensas + luz + internet a mano.
//
// `categorias` es la taxonomía viva: de ahí sale a qué grupo pertenece cada una.
// Una categoría que ya no exista en la taxonomía (se borró, pero su historial
// sigue) cae en "Sin grupo" en vez de desaparecer del total.
export function porGrupo(movs, tipo = 'gasto', categorias = [], movsPrevios = null) {
  const grupoDe = new Map(
    categorias.filter((c) => c.tipo === tipo).map((c) => [c.nombre, c.grupo || 'Sin grupo']),
  )
  const resolver = (nombre) => grupoDe.get(nombre) ?? 'Sin grupo'

  const filtrados = movs.filter((m) => m.tipo === tipo)
  const total = filtrados.reduce((s, m) => s + m.monto, 0)

  const mapa = new Map()
  for (const m of filtrados) {
    const g = resolver(m.categoria)
    if (!mapa.has(g)) mapa.set(g, { nombre: g, total: 0, cantidad: 0, cats: new Map() })
    const e = mapa.get(g)
    e.total += m.monto
    e.cantidad++
    const cat = m.categoria || 'Sin categoría'
    e.cats.set(cat, (e.cats.get(cat) ?? 0) + m.monto)
  }

  let previos = null
  if (movsPrevios) {
    previos = new Map()
    for (const m of movsPrevios) {
      if (m.tipo !== tipo) continue
      const g = resolver(m.categoria)
      previos.set(g, (previos.get(g) ?? 0) + m.monto)
    }
  }

  return [...mapa.values()]
    .map((e) => ({
      nombre: e.nombre,
      total: e.total,
      cantidad: e.cantidad,
      pct: total > 0 ? e.total / total : 0,
      anterior: previos ? (previos.get(e.nombre) ?? 0) : null,
      variacion: previos ? variacion(e.total, previos.get(e.nombre) ?? 0) : null,
      // Las categorías de adentro, para el drill-down.
      subs: [...e.cats.entries()]
        .map(([nombre, monto]) => ({
          nombre,
          total: monto,
          pct: e.total > 0 ? monto / e.total : 0,
        }))
        .sort((a, b) => b.total - a.total),
    }))
    .sort((a, b) => b.total - a.total)
}

// Reparto entre lo que no podés dejar de pagar y lo que elegís gastar.
// Es la lectura de la regla 50/30/20: no dice cuánto gastaste, dice en qué
// medida tu gasto es decisión tuya.
export function porNaturaleza(movs, categorias = []) {
  const naturalezaDe = new Map(
    categorias.filter((c) => c.tipo === 'gasto').map((c) => [c.nombre, c.naturaleza || 'otros']),
  )
  const totales = { esencial: 0, disfrute: 0, otros: 0 }
  let total = 0
  for (const m of movs) {
    if (m.tipo !== 'gasto') continue
    const n = naturalezaDe.get(m.categoria) ?? 'otros'
    totales[n in totales ? n : 'otros'] += m.monto
    total += m.monto
  }
  return {
    total,
    partes: Object.entries(totales).map(([clave, monto]) => ({
      clave,
      total: monto,
      pct: total > 0 ? monto / total : 0,
    })),
  }
}

export function porMetodo(movs, tipo = 'gasto') {
  const filtrados = movs.filter((m) => m.tipo === tipo)
  const total = filtrados.reduce((s, m) => s + m.monto, 0)
  const mapa = new Map()
  for (const m of filtrados) {
    const k = m.metodo || 'Sin método'
    if (!mapa.has(k)) mapa.set(k, { nombre: k, total: 0, cantidad: 0 })
    const e = mapa.get(k)
    e.total += m.monto
    e.cantidad++
  }
  return [...mapa.values()]
    .map((e) => ({ ...e, pct: total > 0 ? e.total / total : 0 }))
    .sort((a, b) => b.total - a.total)
}

// Serie de los últimos `n` meses terminando en `mes` (para la evolución).
export function serieMensual(movs, mes, n = 12) {
  const meses = []
  for (let i = n - 1; i >= 0; i--) meses.push(sumarMeses(mes, -i))

  const base = new Map(meses.map((m) => [m, { mes: m, gastos: 0, ingresos: 0 }]))
  for (const m of movs) {
    const k = m.fecha.slice(0, 7)
    const e = base.get(k)
    if (!e) continue
    if (m.tipo === 'gasto') e.gastos += m.monto
    else e.ingresos += m.monto
  }
  return [...base.values()].map((e) => ({ ...e, balance: e.ingresos - e.gastos }))
}

// Gasto acumulado día a día del mes, para ver el "ritmo" contra el mes anterior.
export function acumuladoDiario(movs, mes) {
  const dias = diasDelMes(mes)
  const porDia = new Array(dias + 1).fill(0)
  for (const m of movs) {
    if (m.tipo !== 'gasto' || m.fecha.slice(0, 7) !== mes) continue
    const d = Number(m.fecha.slice(8, 10))
    if (d >= 1 && d <= dias) porDia[d] += m.monto
  }
  const serie = []
  let acum = 0
  for (let d = 1; d <= dias; d++) {
    acum += porDia[d]
    serie.push({ dia: d, acum, delDia: porDia[d] })
  }
  return serie
}

export function topMovimientos(movs, tipo = 'gasto', n = 5) {
  return movs
    .filter((m) => m.tipo === tipo)
    .sort((a, b) => b.monto - a.monto)
    .slice(0, n)
}

// Días sin gastar en el período: sirve para el dato "gastaste X de Y días".
export function diasConGasto(movs) {
  return new Set(movs.filter((m) => m.tipo === 'gasto').map((m) => m.fecha)).size
}

// ---------------------------------------------------------------------------
//  Inteligencia de carga (smart defaults)
// ---------------------------------------------------------------------------

// Puntaje con decaimiento: un movimiento de ayer pesa más que uno de hace medio
// año. Así las sugerencias siguen tus hábitos actuales y no los del verano.
const VIDA_MEDIA_DIAS = 45

function peso(fecha, hoy) {
  const dias = Math.max(0, (Date.parse(hoy) - Date.parse(fecha)) / 86400000)
  return Math.exp(-dias / VIDA_MEDIA_DIAS)
}

// Combos (categoría + subcategoría + método) más usados de un tipo.
// Un toque y quedan los tres campos completos.
export function combosFrecuentes(movs, tipo = 'gasto', n = 4) {
  const hoy = hoyISO()
  const mapa = new Map()
  for (const m of movs) {
    if (m.tipo !== tipo || !m.categoria || !m.metodo) continue
    const k = `${m.categoria}|${m.subcategoria}|${m.metodo}`
    if (!mapa.has(k)) {
      mapa.set(k, {
        categoria: m.categoria,
        subcategoria: m.subcategoria,
        metodo: m.metodo,
        score: 0,
        usos: 0,
        montos: [],
        ultima: m.fecha,
      })
    }
    const e = mapa.get(k)
    e.score += peso(m.fecha, hoy)
    e.usos++
    e.montos.push(m.monto)
    if (m.fecha > e.ultima) e.ultima = m.fecha
  }
  return [...mapa.values()]
    .sort((a, b) => b.score - a.score)
    .slice(0, n)
    .map((e) => ({ ...e, montoTipico: mediana(e.montos) }))
}

// Para una categoría dada, la subcategoría y el método que más usás.
export function defaultsDeCategoria(movs, tipo, categoria) {
  const hoy = hoyISO()
  const subs = new Map()
  const mets = new Map()
  for (const m of movs) {
    if (m.tipo !== tipo || m.categoria !== categoria) continue
    const p = peso(m.fecha, hoy)
    if (m.subcategoria) subs.set(m.subcategoria, (subs.get(m.subcategoria) ?? 0) + p)
    if (m.metodo) mets.set(m.metodo, (mets.get(m.metodo) ?? 0) + p)
  }
  const top = (mapa) => [...mapa.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? ''
  return { subcategoria: top(subs), metodo: top(mets) }
}

// Ranking de uso por nombre (categorías o métodos), para ordenar los chips.
export function rankingUso(movs, tipo, campo) {
  const hoy = hoyISO()
  const mapa = new Map()
  for (const m of movs) {
    if (m.tipo !== tipo) continue
    const v = m[campo]
    if (!v) continue
    mapa.set(v, (mapa.get(v) ?? 0) + peso(m.fecha, hoy))
  }
  return mapa
}

function mediana(nums) {
  if (!nums.length) return 0
  const s = [...nums].sort((a, b) => a - b)
  const mitad = Math.floor(s.length / 2)
  return s.length % 2 ? s[mitad] : (s[mitad - 1] + s[mitad]) / 2
}

// ---------------------------------------------------------------------------
//  Gastos fijos pendientes
// ---------------------------------------------------------------------------

// Un fijo está pendiente si está activo, ya llegó su día del mes y todavía no
// se confirmó este mes.
export function fijosPendientes(fijos, mes = mesActualISO()) {
  if (!fijos?.length) return []
  const hoy = hoyISO()
  const esMesActual = mes === mesActualISO()
  const diaHoy = esMesActual ? Number(hoy.slice(8, 10)) : diasDelMes(mes)
  return fijos
    .filter((f) => f.activo && f.ultimoMes !== mes && (f.diaMes ?? 1) <= diaHoy)
    .sort((a, b) => (a.diaMes ?? 1) - (b.diaMes ?? 1))
}
