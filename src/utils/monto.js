// Parseo tolerante de montos escritos a mano (formato Argentina).
//   "1500"      -> 1500
//   "1500,50"   -> 1500.5   (coma decimal)
//   "1.500,50"  -> 1500.5   (punto de miles + coma decimal)
//   "1500.50"   -> 1500.5   (punto decimal, por si tipeás así)
export function parseMonto(str) {
  if (str == null) return NaN
  let s = String(str).trim().replace(/\s/g, '')
  if (!s) return NaN
  if (s.includes(',')) {
    s = s.replace(/\./g, '').replace(',', '.')
  }
  const n = parseFloat(s)
  return Number.isFinite(n) ? n : NaN
}

// Mantiene solo dígitos y un único separador decimal mientras se tipea.
export function limpiarInputMonto(str) {
  return String(str).replace(/[^\d.,]/g, '')
}
