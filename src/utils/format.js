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
