import { isoADate, hoyISO } from './format'

// Columnas en el ORDEN del modelo de datos (el orden que usás para exportar).
const COLUMNS = [
  { header: 'Fecha', width: 14 },
  { header: 'Tipo', width: 10 },
  { header: 'Monto', width: 16 },
  { header: 'Moneda', width: 10 },
  { header: 'Cotización', width: 12 },
  { header: 'Monto en pesos', width: 16 },
  { header: 'Categoría', width: 22 },
  { header: 'Subcategoría', width: 18 },
  { header: 'Método de pago', width: 20 },
  { header: 'Descripción', width: 34 },
]

// Genera y descarga un .xlsx listo para abrir/importar en Google Sheets.
// Fechas como fecha real (dd/mm/yyyy) y montos como número, así Sheets
// los reconoce y podés hacer cuentas directamente.
// `conversor` es opcional: si viene, se completa la columna de pesos también
// para los movimientos en dólares que no traigan su propia cotización.
export async function exportarXlsx(movimientos, conversor) {
  // La librería de xlsx pesa ~60 KB y solo hace falta al exportar: se carga
  // recién en ese momento para no demorar el arranque de la app.
  const { default: writeXlsxFile } = await import('write-excel-file/browser')

  // En el archivo conviene el orden cronológico ascendente.
  const ordenados = [...movimientos].sort(
    (a, b) => a.fecha.localeCompare(b.fecha) || (a.createdAt ?? 0) - (b.createdAt ?? 0),
  )

  const header = COLUMNS.map((c) => ({
    value: c.header,
    fontWeight: 'bold',
    color: '#ffffff',
    backgroundColor: '#1e293b',
    align: 'center',
  }))

  const rows = ordenados.map((m) => {
    const esUSD = m.moneda === 'USD'
    const tc = m.tc || (conversor ? conversor.tcDe(m) : 0)
    const enPesos = esUSD ? (tc ? Number(m.monto) * tc : null) : Number(m.monto) || 0
    return [
    { type: Date, value: isoADate(m.fecha), format: 'dd/mm/yyyy' },
    { type: String, value: m.tipo === 'gasto' ? 'Gasto' : 'Ingreso' },
    { type: Number, value: Number(m.monto) || 0, format: '#,##0.00' },
    { type: String, value: esUSD ? 'USD' : 'ARS' },
    { type: Number, value: m.tc ? Number(m.tc) : null, format: '#,##0.00' },
    { type: Number, value: enPesos, format: '#,##0.00' },
    { type: String, value: m.categoria || null },
    { type: String, value: m.subcategoria || null },
    { type: String, value: m.metodo || null },
    { type: String, value: m.descripcion || null },
    ]
  })

  // write-excel-file v4: writeXlsxFile(data, sheetOptions) devuelve un objeto
  // con .toFile(nombre), que genera y dispara la descarga en el navegador.
  await writeXlsxFile([header, ...rows], {
    columns: COLUMNS.map((c) => ({ width: c.width })),
    sheet: 'Movimientos',
  }).toFile(`finanzas_${hoyISO()}.xlsx`)
}
