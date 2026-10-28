import { test } from 'node:test'
import assert from 'node:assert/strict'

import { FORMATO_FIJOS, leerArchivoFijos, normalizar, prepararImportacion } from './fijos-import.js'

const archivo = (fijos) => JSON.stringify({ formato: FORMATO_FIJOS, version: 1, fijos })

test('lee un archivo válido y descarta lo inválido con su motivo', () => {
  const { fijos, errores } = leerArchivoFijos(
    archivo([
      { descripcion: 'Luz', monto: 1000.456, diaMes: 28, categoria: 'Servicios', subcategoria: 'LUZ', metodo: 'TC Visa', debito: true },
      { descripcion: 'Sin monto', monto: 0, diaMes: 5, categoria: 'A', subcategoria: 'B', metodo: 'C' },
      { descripcion: 'Día 40', monto: 10, diaMes: 40, categoria: 'A', subcategoria: 'B', metodo: 'C' },
      { descripcion: 'Sin método', monto: 10, diaMes: 5, categoria: 'A', subcategoria: 'B' },
    ]),
  )
  assert.equal(fijos.length, 1)
  assert.deepEqual(
    [fijos[0].monto, fijos[0].tipo, fijos[0].moneda, fijos[0].debito, fijos[0].diaMes],
    [1000.46, 'gasto', 'ARS', true, 28],
  )
  assert.deepEqual(errores, ['Sin monto: monto inválido', 'Día 40: día inválido', 'Sin método: falta categoría, subcategoría o método'])
})

test('rechaza lo que no es un archivo de fijos', () => {
  assert.deepEqual(leerArchivoFijos('{nada').errores, ['El archivo no es un JSON válido'])
  assert.deepEqual(leerArchivoFijos(JSON.stringify({ formato: 'otro', fijos: [] })).errores, ['El archivo no es de gastos fijos'])
})

test('normaliza sin acentos ni mayúsculas', () => {
  assert.equal(normalizar('  Débito   VISA '), 'debito visa')
})

test('usa los nombres que ya tiene la app, marca lo nuevo y lo repetido', () => {
  const { fijos } = leerArchivoFijos(
    archivo([
      { descripcion: 'Edenor', monto: 1, diaMes: 28, categoria: 'servicios', subcategoria: 'luz', metodo: 'tc visa', debito: true },
      { descripcion: 'Monotributo', monto: 1, diaMes: 20, categoria: 'Impuestos', subcategoria: 'MONOTRIBUTO', metodo: 'TC Visa' },
      { descripcion: 'Agua', monto: 1, diaMes: 3, categoria: 'Servicios', subcategoria: 'AGUA', metodo: 'Efectivo' },
      { descripcion: 'Gas', monto: 1, diaMes: 9, categoria: 'Servicios', subcategoria: 'GAS', metodo: 'Efectivo' },
    ]),
  )
  const p = prepararImportacion(fijos, {
    categorias: [{ tipo: 'gasto', nombre: 'Servicios', subcategorias: ['LUZ', 'GAS'] }],
    metodos: [{ tipo: 'gasto', nombre: 'TC Visa' }],
    fijos: [
      { tipo: 'gasto', descripcion: 'AGUA ', categoria: 'Otra', subcategoria: 'X' },
      { tipo: 'gasto', descripcion: '', categoria: 'Servicios', subcategoria: 'GAS' },
    ],
  })
  const [edenor, mono, agua, gas] = p
  assert.deepEqual([edenor.categoria, edenor.subcategoria, edenor.metodo], ['Servicios', 'LUZ', 'TC Visa'])
  assert.deepEqual([edenor.nuevaCategoria, edenor.nuevaSubcategoria, edenor.nuevoMetodo, edenor.incluir], [false, false, false, true])
  assert.deepEqual([mono.nuevaCategoria, mono.nuevaSubcategoria, mono.nuevoMetodo], [true, true, false])
  assert.deepEqual([agua.yaEsta, agua.incluir, agua.nuevoMetodo], [true, false, true])
  assert.equal(gas.yaEsta, true)
})
