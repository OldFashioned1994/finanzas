// Utilidades de formato y fechas (Argentina).

const fmtMoneda = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatMonto(n) {
  return fmtMoneda.format(n || 0)
}

const fmtEntero = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 0 })
const fmtDecimal = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 1 })

// Monto sin centavos: para totales grandes, los centavos son ruido.
export function formatMontoRedondo(n) {
  return `$${fmtEntero.format(Math.round(n || 0))}`
}

// Versión compacta para etiquetas dentro de los gráficos, donde no entra
// el número completo: $1,2 M · $345 k · $8.400
export function formatCorto(n) {
  const v = Math.abs(n || 0)
  const signo = n < 0 ? '−' : ''
  if (v >= 1_000_000) return `${signo}$${fmtDecimal.format(v / 1_000_000)} M`
  if (v >= 10_000) return `${signo}$${fmtEntero.format(v / 1000)} k`
  return `${signo}$${fmtEntero.format(v)}`
}

// 0.1234 -> '12,3%'
export function formatPct(p, decimales = 1) {
  if (p == null || !Number.isFinite(p)) return '—'
  return `${(p * 100).toFixed(decimales).replace('.', ',')}%`
}

// Variación con signo explícito, para los deltas contra el período anterior.
export function formatDelta(p) {
  if (p == null || !Number.isFinite(p)) return null
  const signo = p > 0 ? '+' : ''
  return `${signo}${(p * 100).toFixed(0)}%`
}

// 'YYYY-MM-DD' de hoy en hora local (no UTC).
export function hoyISO() {
  const d = new Date()
  const off = d.getTimezoneOffset()
  return new Date(d.getTime() - off * 60000).toISOString().slice(0, 10)
}

// 'YYYY-MM' del mes actual.
export function mesActualISO() {
  return hoyISO().slice(0, 7)
}

// 'YYYY-MM-DD' -> '24/06/2026'
export function formatFecha(iso) {
  if (!iso) return ''
  const [a, m, d] = iso.split('-')
  return `${d}/${m}/${a}`
}

// Encabezado de día en la lista: 'Hoy', 'Ayer' o 'Vie 25 de julio'.
export function etiquetaDia(iso) {
  if (iso === hoyISO()) return 'Hoy'
  const [a, m, d] = iso.split('-').map(Number)
  const fecha = new Date(a, m - 1, d)
  const ayer = new Date()
  ayer.setDate(ayer.getDate() - 1)
  if (
    fecha.getDate() === ayer.getDate() &&
    fecha.getMonth() === ayer.getMonth() &&
    fecha.getFullYear() === ayer.getFullYear()
  ) {
    return 'Ayer'
  }
  const texto = fecha.toLocaleDateString('es-AR', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
  })
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

// 'YYYY-MM-DD' -> objeto Date local (para exportar como fecha real).
export function isoADate(iso) {
  const [a, m, d] = iso.split('-').map(Number)
  return new Date(a, m - 1, d)
}

// 'YYYY-MM' -> 'junio 2026'
export function nombreMes(mesISO) {
  if (!mesISO) return ''
  const [a, m] = mesISO.split('-').map(Number)
  const d = new Date(a, m - 1, 1)
  const s = d.toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })
  return s.charAt(0).toUpperCase() + s.slice(1)
}
