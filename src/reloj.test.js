// node --test src/reloj.test.js — sincronizarReloj contra una base IndexedDB en memoria y un
// buzón falso: nada se duplica (dos a la vez, confirmación que falla), la vinculación aguanta
// una respuesta perdida, y un gasto de una categoría que ya no está va a «Reloj».
import 'fake-indexeddb/auto'
import assert from 'node:assert/strict'
import { beforeEach, test } from 'node:test'

const { db, setAjuste } = await import('./db.js')
const { sincronizarReloj, vincularReloj, clavesReloj } = await import('./reloj.js')

// ---- el buzón falso ----
const buzon = { vinculado: null, gastos: [], publicado: {}, romperConfirmar: false, perderRespuesta: false, demora: 0 }
const json = (estado, cuerpo) => ({ ok: estado < 300, status: estado, json: async () => cuerpo })
globalThis.fetch = async (url, init = {}) => {
  const ruta = new URL(url).pathname.replace(/^\/reloj/, '')
  const metodo = init.method ?? 'GET'
  const cuerpo = init.body ? JSON.parse(init.body) : null
  if (buzon.demora) await new Promise((r) => setTimeout(r, buzon.demora))
  if (ruta === '/vincular') {
    const mismas = buzon.vinculado && buzon.vinculado.casa === cuerpo.casa && buzon.vinculado.reloj === cuerpo.reloj
    if (buzon.vinculado && !mismas) return json(409, {})
    buzon.vinculado = cuerpo
    if (buzon.perderRespuesta) {
      buzon.perderRespuesta = false
      throw new TypeError('la respuesta se perdió')
    }
    return json(mismas ? 200 : 201, { ok: true })
  }
  const token = String(init.headers?.authorization ?? '').replace('Bearer ', '')
  if (!buzon.vinculado || token !== buzon.vinculado.casa) return json(401, {})
  if (ruta === '/gastos' && metodo === 'GET') return json(200, { gastos: [...buzon.gastos] })
  if (ruta === '/gastos/confirmar') {
    if (buzon.romperConfirmar) throw new TypeError('sin red')
    buzon.gastos = buzon.gastos.filter((g) => !cuerpo.ids.includes(g.id))
    return json(200, { ok: true })
  }
  if (metodo === 'PUT') {
    buzon.publicado[ruta] = cuerpo
    return json(200, { ok: true })
  }
  return json(404, {})
}

const gasto = (id, extra = {}) => ({
  id,
  monto: 2500,
  moneda: 'ARS',
  categoria: 'Supermercado',
  subcategoria: '',
  metodo: '',
  nota: '',
  fecha: '2026-10-28T21:00',
  ...extra,
})
const delReloj = () => db.movimientos.filter((m) => Boolean(m.relojId)).toArray()

beforeEach(async () => {
  await db.movimientos.clear()
  await db.ajustes.clear()
  Object.assign(buzon, { vinculado: null, gastos: [], publicado: {}, romperConfirmar: false, perderRespuesta: false, demora: 0 })
  const cats = await db.categorias.where('tipo').equals('gasto').toArray()
  if (!cats.some((c) => c.nombre === 'Supermercado'))
    await db.categorias.add({ tipo: 'gasto', nombre: 'Supermercado', orden: 0, archivada: false, subcategorias: [] })
})

test('la vinculación aguanta que se pierda la respuesta', async () => {
  buzon.perderRespuesta = true
  await assert.rejects(vincularReloj())
  assert.equal(await clavesReloj(), null)
  // el reintento manda las mismas claves: el buzón dice OK
  assert.deepEqual(await vincularReloj(), { ok: true })
  const claves = await clavesReloj()
  assert.equal(claves.casa, buzon.vinculado.casa)
  assert.match(claves.reloj, /^[A-Za-z0-9_-]{43}$/)
})

test('dos sincronizaciones a la vez no duplican', async () => {
  await vincularReloj()
  buzon.gastos = [gasto('gasto-0001'), gasto('gasto-0002')]
  buzon.demora = 20
  const [a, b] = await Promise.all([sincronizarReloj(), sincronizarReloj()])
  assert.equal(a.importados + (a === b ? 0 : b.importados), 2)
  assert.equal((await delReloj()).length, 2)
  assert.deepEqual(buzon.gastos, [])
  assert.ok(buzon.publicado['/catalogo'].categorias.some((c) => c.nombre === 'Supermercado'))
})

test('si la confirmación falla, la próxima vez no se duplica', async () => {
  await vincularReloj()
  buzon.gastos = [gasto('gasto-0003')]
  buzon.romperConfirmar = true
  assert.equal((await sincronizarReloj()).importados, 1)
  buzon.romperConfirmar = false
  assert.equal((await sincronizarReloj()).importados, 0)
  assert.equal((await delReloj()).length, 1)
  assert.deepEqual(buzon.gastos, [])
})

test('una categoría que ya no está va a «Reloj» (no se crean categorías desde afuera)', async () => {
  await vincularReloj()
  buzon.gastos = [gasto('gasto-0004', { categoria: 'Inventada', subcategoria: 'X', nota: 'algo' })]
  await sincronizarReloj()
  const [m] = await delReloj()
  assert.equal(m.categoria, 'Reloj')
  assert.equal(m.descripcion, 'Inventada · X · algo')
  assert.equal((await db.categorias.filter((c) => c.nombre === 'Inventada').count()), 0)
})

test('con una clave que el buzón no conoce, lo dice', async () => {
  await setAjuste('reloj', { casa: 'x'.repeat(43), reloj: 'y'.repeat(43) })
  buzon.vinculado = { casa: 'otra', reloj: 'otra' }
  assert.deepEqual(await sincronizarReloj(), { claveInvalida: true, importados: 0 })
})
