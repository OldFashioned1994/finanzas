// node --test src/utils/reloj-datos.test.js
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { armarCatalogo, armarVencimientos, claveNueva, gastoAMovimiento } from './reloj-datos.js'

const hoy = new Date(2026, 9, 28, 12)

test('el catálogo: categorías y métodos de gasto vivos, en orden, y los combos frecuentes', () => {
  const c = armarCatalogo({
    hoy,
    categorias: [
      { tipo: 'gasto', nombre: 'Nafta', orden: 2, subcategorias: ['YPF'] },
      { tipo: 'gasto', nombre: 'Supermercado', orden: 1, subcategorias: ['Coto', 'Día'], grupo: 'Alimentación' },
      { tipo: 'gasto', nombre: 'Vieja', orden: 0, archivada: true },
      { tipo: 'ingreso', nombre: 'Sueldo', orden: 0 },
    ],
    metodos: [
      { tipo: 'gasto', nombre: 'Débito', orden: 1 },
      { tipo: 'gasto', nombre: 'Caja dólares', orden: 2, moneda: 'USD' },
      { tipo: 'gasto', nombre: 'Archivado', orden: 0, archivado: true },
    ],
    movimientos: [
      { tipo: 'gasto', fecha: '2026-10-01', categoria: 'Supermercado', subcategoria: 'Coto', metodo: 'Débito' },
      { tipo: 'gasto', fecha: '2026-10-05', categoria: 'Supermercado', subcategoria: 'Coto', metodo: 'Débito' },
      { tipo: 'gasto', fecha: '2026-10-07', categoria: 'Nafta', subcategoria: 'YPF', metodo: 'Débito' },
      { tipo: 'gasto', fecha: '2026-01-01', categoria: 'Nafta', subcategoria: 'YPF', metodo: 'Débito' },
      { tipo: 'gasto', fecha: '2026-10-08', categoria: 'Vieja', subcategoria: '', metodo: 'Débito' },
      // cuotas (también futuras) y fijos no cuentan: no son lo que se carga a mano
      ...[1, 2, 3].map((k) => ({ tipo: 'gasto', fecha: `2026-1${k}-05`, categoria: 'Nafta', subcategoria: 'Cuota', metodo: 'Visa', compraId: 9 })),
      ...[1, 2, 3].map(() => ({ tipo: 'gasto', fecha: '2026-10-10', categoria: 'Nafta', subcategoria: 'Fijo', metodo: 'Visa', fijoId: 4 })),
      { tipo: 'gasto', fecha: '2026-11-20', categoria: 'Nafta', subcategoria: 'Futuro', metodo: 'Visa' },
    ],
  })
  assert.deepEqual(
    c.categorias.map((x) => x.nombre),
    ['Supermercado', 'Nafta'],
  )
  assert.deepEqual(c.metodos, [
    { nombre: 'Débito', moneda: 'ARS' },
    { nombre: 'Caja dólares', moneda: 'USD' },
  ])
  assert.deepEqual(c.frecuentes[0], { categoria: 'Supermercado', subcategoria: 'Coto', metodo: 'Débito' })
  assert.equal(c.frecuentes.length, 2) // la de enero quedó fuera de los 90 días; la archivada, también
})

test('vencimientos: los fijos activos que faltan este mes, por día', () => {
  const v = armarVencimientos({
    hoy,
    fijos: [
      { id: 1, activo: 1, tipo: 'gasto', descripcion: 'Monotributo', monto: 75099, diaMes: 20, ultimoMes: '2026-09' },
      { id: 2, activo: 1, tipo: 'gasto', categoria: 'Vivienda', subcategoria: 'Luz', monto: 30000, diaMes: 5 },
      { id: 3, activo: 1, tipo: 'gasto', descripcion: 'Ya pagado', monto: 1, diaMes: 1, ultimoMes: '2026-10' },
      { id: 4, activo: 0, tipo: 'gasto', descripcion: 'Inactivo', monto: 1, diaMes: 1 },
      { id: 5, activo: 1, tipo: 'ingreso', descripcion: 'Sueldo', monto: 1, diaMes: 1 },
    ],
  })
  assert.equal(v.mes, '2026-10')
  assert.deepEqual(
    v.items.map((i) => [i.id, i.descripcion, i.diaMes]),
    [
      ['2', 'Luz', 5],
      ['1', 'Monotributo', 20],
    ],
  )
})

test('un gasto del reloj pasa a movimiento con su id y la marca', () => {
  const m = gastoAMovimiento(
    { id: 'abc12345', monto: 1500, moneda: 'ARS', categoria: 'Nafta', subcategoria: 'YPF', metodo: '', nota: 'ruta', fecha: '2026-10-28T23:50' },
    'Débito',
  )
  assert.deepEqual(m, {
    fecha: '2026-10-28',
    tipo: 'gasto',
    monto: 1500,
    moneda: 'ARS',
    tc: null,
    categoria: 'Nafta',
    subcategoria: 'YPF',
    metodo: 'Débito',
    descripcion: 'ruta',
    tags: ['reloj'],
    relojId: 'abc12345',
  })
  assert.equal(gastoAMovimiento({ id: 'x', monto: 0, categoria: 'A', fecha: '2026-10-28' }), null)
})

test('la clave nueva tiene 43 caracteres de base64url', () => {
  const k = claveNueva()
  assert.match(k, /^[A-Za-z0-9_-]{43}$/)
  assert.notEqual(k, claveNueva())
})
