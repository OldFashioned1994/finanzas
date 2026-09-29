import { db, agregarMovimiento, agregarCategoria, getAjuste } from './db'

// ============================================================================
//  Puente con el "segundo cerebro" de WhatsApp (servicio propio en el VPS).
//  Los gastos que Nico se manda por WhatsApp quedan en una cola en el server;
//  al abrir la app se importan como movimientos normales y se confirma la
//  recepción para que no vuelvan a bajar. El token vive en ajustes (IndexedDB),
//  nunca en el código: el repo es público.
// ============================================================================

const CEREBRO_URL = 'https://srv1795124.hstgr.cloud/cerebro'
const CATEGORIA = 'Cerebro'

// 'YYYY-MM-DD' en hora LOCAL del teléfono: un gasto capturado a las 22:00 de
// Buenos Aires es de ese día, aunque en UTC ya sea el siguiente.
function fechaLocal(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Prueba rápida de token/conexión (para Ajustes).
export async function probarCerebro(token) {
  const res = await fetch(`${CEREBRO_URL}/gastos?token=${encodeURIComponent(token)}`)
  if (res.status === 401) return { ok: false, tokenInvalido: true }
  if (!res.ok) return { ok: false }
  const d = await res.json()
  return { ok: true, pendientes: (d.gastos || []).length }
}

// Trae los gastos pendientes del cerebro y los carga en la base local.
// Idempotente: cada gasto trae un id único (cerebroId) y no se importa dos
// veces aunque la confirmación anterior haya fallado.
export async function importarDelCerebro() {
  const token = await getAjuste('cerebroToken')
  if (!token) return { sinToken: true, importados: 0, sinMonto: 0 }

  let data
  try {
    const res = await fetch(`${CEREBRO_URL}/gastos?token=${encodeURIComponent(token)}`)
    if (res.status === 401) return { tokenInvalido: true, importados: 0, sinMonto: 0 }
    if (!res.ok) return { sinRed: true, importados: 0, sinMonto: 0 }
    data = await res.json()
  } catch {
    // Sin conexión: la app es offline-first, se reintenta en la próxima apertura.
    return { sinRed: true, importados: 0, sinMonto: 0 }
  }

  const pendientes = data.gastos || []
  if (!pendientes.length) return { importados: 0, sinMonto: 0 }

  const existentes = new Set(
    (await db.movimientos.filter((m) => Boolean(m.cerebroId)).toArray()).map((m) => m.cerebroId),
  )

  // La categoría "Cerebro" se crea una sola vez; después Nico recategoriza si quiere.
  const cat = await db.categorias
    .filter((c) => c.tipo === 'gasto' && c.nombre === CATEGORIA)
    .first()
  if (!cat) await agregarCategoria({ tipo: 'gasto', nombre: CATEGORIA, emoji: '🧠' })

  const metodos = await db.metodos.where('tipo').equals('gasto').sortBy('orden')
  const metodo = metodos.find((m) => !m.archivado)?.nombre ?? ''

  let importados = 0
  let sinMonto = 0
  const confirmar = []

  for (const g of pendientes) {
    confirmar.push(g.id)
    if (existentes.has(g.id)) continue
    // Sin monto no hay movimiento que valga: queda anotado en WhatsApp y listo.
    if (g.monto == null || !(Number(g.monto) > 0)) {
      sinMonto++
      continue
    }
    const desc =
      [g.comercio, g.descripcion].filter(Boolean).join(' — ') + (g.obra ? ` [${g.obra}]` : '')
    await agregarMovimiento({
      fecha: fechaLocal(g.fecha),
      tipo: 'gasto',
      monto: Number(g.monto),
      moneda: 'ARS',
      tc: null,
      categoria: CATEGORIA,
      subcategoria: '',
      metodo,
      descripcion: desc,
      tags: ['cerebro'],
      cerebroId: g.id,
    })
    importados++
  }

  try {
    await fetch(`${CEREBRO_URL}/gastos/confirmar?token=${encodeURIComponent(token)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ids: confirmar }),
    })
  } catch {
    // Si la confirmación falla, el dedupe por cerebroId evita duplicados.
  }

  return { importados, sinMonto }
}
