// ============================================================================
//  Pesos y dólares.
// ----------------------------------------------------------------------------
//  Cada movimiento guarda el monto EN SU MONEDA y, cuando corresponde, la
//  cotización de ESE momento (`tc`, pesos por dólar). Es la práctica estándar en
//  las apps multimoneda y la única que no miente con el tiempo: un gasto de
//  marzo tiene que seguir valiendo los dólares que valía en marzo, no los que
//  valdría hoy.
//
//  El monto convertido NO se guarda: se calcula al mostrar. Guardarlo obligaría
//  a recalcularlo en cada edición y tarde o temprano quedaría desincronizado.
// ============================================================================

export const ARS = 'ARS'
export const USD = 'USD'

export const MONEDAS = {
  [ARS]: { codigo: ARS, simbolo: '$', nombre: 'Pesos', corto: '$' },
  [USD]: { codigo: USD, simbolo: 'US$', nombre: 'Dólares', corto: 'US$' },
}

const fmt = {
  [ARS]: new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
  [USD]: new Intl.NumberFormat('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
}
const fmtEntero = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 })
const fmtDecimal = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 })
// Los dólares se manejan en cifras chicas: redondearlos a entero perdería
// información que en pesos sería irrelevante.
const fmtUsdCorto = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 })

export function monedaDe(mov) {
  return mov?.moneda === USD ? USD : ARS
}

// El signo va SIEMPRE delante del símbolo ("−$1.000", no "$-1.000").
export function formatEn(monto, moneda = ARS) {
  const m = moneda === USD ? USD : ARS
  const v = monto || 0
  return `${v < 0 ? '−' : ''}${MONEDAS[m].simbolo}${fmt[m].format(Math.abs(v))}`
}

export function formatRedondoEn(monto, moneda = ARS) {
  const v = monto || 0
  const signo = v < 0 ? '−' : ''
  if (moneda === USD) return `${signo}US$${fmtUsdCorto.format(Math.abs(Math.round(v * 100) / 100))}`
  return `${signo}$${fmtEntero.format(Math.abs(Math.round(v)))}`
}

// Versión compacta para etiquetas de gráficos.
export function formatCortoEn(monto, moneda = ARS) {
  const v = Math.abs(monto || 0)
  const signo = monto < 0 ? '−' : ''
  if (moneda === USD) {
    if (v >= 10_000) return `${signo}US$${fmtEntero.format(v / 1000)} k`
    return `${signo}US$${fmtUsdCorto.format(v)}`
  }
  if (v >= 1_000_000) return `${signo}$${fmtDecimal.format(v / 1_000_000)} M`
  if (v >= 10_000) return `${signo}$${fmtEntero.format(v / 1000)} k`
  return `${signo}$${fmtEntero.format(v)}`
}

// Cotización formateada: 1.310 o 1.310,50 si tiene decimales.
export function formatTC(valor) {
  if (!valor) return '—'
  return new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 }).format(valor)
}

// ---------------------------------------------------------------------------
//  Conversor
// ---------------------------------------------------------------------------

// Arma un conversor a partir de las cotizaciones cargadas y la de referencia.
//
// Para saber a cuánto estaba el dólar en una fecha, se busca en este orden:
//   1. la cotización propia del movimiento (`tc`) — la más fiel;
//   2. la cotización cargada para el mes de esa fecha;
//   3. la cotización cargada más cercana ANTERIOR a ese mes (no una posterior:
//      valuar un gasto de enero con el dólar de diciembre siguiente sería
//      reescribir el pasado con información que entonces no existía);
//   4. si no hay ninguna anterior, la primera posterior (mejor que nada);
//   5. la cotización de referencia de Ajustes.
export function crearConversor(cotizaciones = [], tcReferencia = 0) {
  const ordenadas = [...cotizaciones]
    .filter((c) => c.valor > 0)
    .sort((a, b) => a.mes.localeCompare(b.mes))

  const cacheMes = new Map()

  const tcDeMes = (mes) => {
    if (cacheMes.has(mes)) return cacheMes.get(mes)
    let valor = 0
    const exacta = ordenadas.find((c) => c.mes === mes)
    if (exacta) valor = exacta.valor
    else {
      const anteriores = ordenadas.filter((c) => c.mes < mes)
      if (anteriores.length) valor = anteriores[anteriores.length - 1].valor
      else if (ordenadas.length) valor = ordenadas[0].valor
    }
    if (!valor) valor = tcReferencia
    cacheMes.set(mes, valor)
    return valor
  }

  const tcDe = (mov) => {
    if (mov?.tc > 0) return mov.tc
    return tcDeMes((mov?.fecha ?? '').slice(0, 7))
  }

  // El monto del movimiento expresado en la moneda pedida.
  // Si hace falta convertir y no hay ninguna cotización disponible, devuelve
  // null: es preferible mostrar "—" a inventar un número.
  const enMoneda = (mov, moneda) => {
    const propia = monedaDe(mov)
    if (propia === moneda) return mov.monto
    const tc = tcDe(mov)
    if (!tc) return null
    return propia === USD ? mov.monto * tc : mov.monto / tc
  }

  return {
    tcDe,
    tcDeMes,
    enMoneda,
    hayCotizacion: ordenadas.length > 0 || tcReferencia > 0,
    // Cotización sugerida al cargar un movimiento nuevo.
    sugerida: (mes) => tcDeMes(mes),
  }
}

// Devuelve los movimientos con el monto ya expresado en una sola moneda, para
// que todo el motor de cálculo (que no sabe de monedas) siga funcionando igual.
// Los que no se pueden convertir por falta de cotización quedan afuera, y se
// informa cuántos fueron para poder avisarlo en pantalla.
export function normalizarMontos(movimientos, moneda, conversor) {
  const convertidos = []
  let sinCotizacion = 0
  for (const m of movimientos) {
    const monto = conversor.enMoneda(m, moneda)
    if (monto == null) {
      sinCotizacion++
      continue
    }
    convertidos.push(monto === m.monto ? m : { ...m, monto })
  }
  return { movimientos: convertidos, sinCotizacion }
}
