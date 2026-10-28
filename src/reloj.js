import { db, getAjuste, setAjuste } from './db'
import {
  armarCatalogo,
  armarVencimientos,
  claveNueva,
  gastoAMovimiento,
} from './utils/reloj-datos'

// ============================================================================
//  Puente con el reloj (Amazfit T-Rex 3) por el buzón propio del VPS.
//  El reloj deja gastos en el buzón (por la app Zepp del iPhone); al abrir la
//  app se importan y se confirman. A la vuelta, la app publica lo que el reloj
//  muestra: categorías y métodos (catálogo) y los gastos fijos que faltan este
//  mes (vencimientos). Las dos claves las genera esta app al vincular; el
//  buzón guarda solo su huella. Viven en ajustes (IndexedDB), nunca en el
//  código (el repo es público) ni en el respaldo (utils/backup.js).
// ============================================================================

// en desarrollo se puede apuntar a un buzón local (VITE_RELOJ_URL); el real lo vincula solo Nico
export const RELOJ_URL = import.meta.env?.VITE_RELOJ_URL || 'https://reloj.187-127-41-72.sslip.io'
/** Las claves de esta app con el buzón: { casa, reloj } (y las que esperan respuesta). */
export const AJUSTES_PRIVADOS = ['reloj', 'relojPendiente', 'relojPublicado']
const CATEGORIA_RESPALDO = 'Reloj'

const pedir = (ruta, token, init = {}) =>
  fetch(`${RELOJ_URL}${ruta}`, {
    ...init,
    headers: {
      authorization: `Bearer ${token}`,
      ...(init.body ? { 'content-type': 'application/json' } : {}),
    },
  })

/** Las claves vigentes, o null si no está vinculado. */
export const clavesReloj = () => getAjuste('reloj', null)

/**
 * La vinculación. Las claves se guardan ANTES de mandarlas: si la respuesta se pierde, el
 * reintento manda las mismas y el buzón contesta OK (no queda trabado).
 */
export async function vincularReloj() {
  let pendiente = await getAjuste('relojPendiente', null)
  if (!pendiente) {
    pendiente = { casa: claveNueva(), reloj: claveNueva() }
    await setAjuste('relojPendiente', pendiente)
  }
  const res = await fetch(`${RELOJ_URL}/vincular`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(pendiente),
  })
  if (res.status === 409) return { yaVinculado: true }
  if (!res.ok) return { ok: false }
  await db.transaction('rw', db.ajustes, async () => {
    await setAjuste('reloj', pendiente)
    await db.ajustes.delete('relojPendiente')
    await db.ajustes.delete('relojPublicado')
  })
  return { ok: true }
}

/** Olvida las claves (para volver a vincular cuando el buzón se reinició). */
export async function olvidarReloj() {
  await db.ajustes.bulkDelete(AJUSTES_PRIVADOS)
}

/** Publica algo solo si cambió desde la última vez (un PUT por apertura no hace falta). */
async function publicarSiCambio(token, ruta, datos, ultimos) {
  const json = JSON.stringify(datos)
  if (ultimos[ruta] === json) return false
  const res = await pedir(ruta, token, { method: 'PUT', body: json })
  if (!res.ok) return false
  ultimos[ruta] = json
  return true
}

/**
 * Carga un gasto del reloj si no estaba: el chequeo y el alta van en la misma transacción
 * (dos sincronizaciones a la vez no lo duplican).
 */
async function importarGasto(g, metodo) {
  const mov = gastoAMovimiento(g, metodo)
  if (!mov) return false
  return db.transaction('rw', db.movimientos, db.categorias, db.grupos, async () => {
    if (await db.movimientos.filter((m) => m.relojId === mov.relojId).count()) return false
    const categorias = await db.categorias.where('tipo').equals('gasto').toArray()
    if (!categorias.some((c) => c.nombre === mov.categoria && !c.archivada)) {
      // el reloj eligió de las categorías publicadas; si después se renombró o se archivó, va a
      // una sola de respaldo (no se crean categorías desde afuera)
      mov.descripcion = [mov.categoria, mov.subcategoria, mov.descripcion].filter(Boolean).join(' · ')
      mov.categoria = CATEGORIA_RESPALDO
      mov.subcategoria = ''
      if (!categorias.some((c) => c.nombre === CATEGORIA_RESPALDO)) {
        // como agregarCategoria: sin grupo elegido, al último del tipo (el de «varios»)
        const grupos = await db.grupos.where('tipo').equals('gasto').sortBy('orden')
        await db.categorias.add({
          tipo: 'gasto',
          nombre: CATEGORIA_RESPALDO,
          emoji: '⌚',
          orden: categorias.length,
          archivada: false,
          subcategorias: [],
          grupo: grupos.at(-1)?.nombre ?? '',
          naturaleza: 'otros',
        })
      }
    }
    await db.movimientos.add({ ...mov, createdAt: Date.now() })
    return true
  })
}

let enCurso = null

/**
 * Trae los gastos del reloj y publica catálogo y vencimientos. Una sola a la vez: si ya hay
 * una andando (abrir la app y tocar «Sincronizar»), devuelve esa.
 */
export function sincronizarReloj() {
  if (!enCurso) enCurso = sincronizar().finally(() => (enCurso = null))
  return enCurso
}

async function sincronizar() {
  const claves = await clavesReloj()
  if (!claves) return { sinVincular: true, importados: 0 }
  const token = claves.casa

  let pendientes
  try {
    const res = await pedir('/gastos', token)
    if (res.status === 401) return { claveInvalida: true, importados: 0 }
    if (!res.ok) return { sinRed: true, importados: 0 }
    pendientes = (await res.json()).gastos || []
  } catch {
    return { sinRed: true, importados: 0 }
  }

  let importados = 0
  if (pendientes.length) {
    const metodos = await db.metodos.where('tipo').equals('gasto').sortBy('orden')
    const metodo = metodos.find((m) => !m.archivado)?.nombre ?? ''
    const confirmar = []
    for (const g of pendientes) {
      if (await importarGasto(g, metodo)) importados++
      confirmar.push(g.id) // los inválidos también: no tiene sentido que vuelvan
    }
    try {
      await pedir('/gastos/confirmar', token, {
        method: 'POST',
        body: JSON.stringify({ ids: confirmar }),
      })
    } catch {
      // si la confirmación falla, el dedupe por relojId evita duplicados
    }
  }

  // A la vuelta: lo que el reloj muestra.
  try {
    const [categorias, metodos, movimientos, fijos] = await Promise.all([
      db.categorias.toArray(),
      db.metodos.toArray(),
      db.movimientos.where('fecha').aboveOrEqual(haceDias(90)).toArray(),
      db.fijos.toArray(),
    ])
    const ultimos = JSON.parse((await getAjuste('relojPublicado', '')) || '{}')
    const a = await publicarSiCambio(
      token,
      '/catalogo',
      armarCatalogo({ categorias, metodos, movimientos }),
      ultimos,
    )
    const b = await publicarSiCambio(token, '/vencimientos', armarVencimientos({ fijos }), ultimos)
    if (a || b) await setAjuste('relojPublicado', JSON.stringify(ultimos))
  } catch {
    // sin red: se publica en la próxima apertura
  }
  return { importados }
}

function haceDias(n) {
  const d = new Date(Date.now() - n * 864e5)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
