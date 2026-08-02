import { db } from '../db'
import { hoyISO } from './format'

// ============================================================================
//  Backup completo en JSON.
//  Los datos viven solo en este dispositivo: si se pierde el teléfono o el
//  navegador limpia el almacenamiento, no hay nube que los recupere. El .xlsx
//  sirve para analizar en una planilla, pero NO restaura la app (no trae
//  categorías, presupuestos ni fijos). Este archivo sí.
// ============================================================================

const VERSION = 3

export async function exportarBackup() {
  const [movimientos, categorias, metodos, presupuestos, fijos, ajustes, cotizaciones] =
    await Promise.all([
      db.movimientos.toArray(),
      db.categorias.toArray(),
      db.metodos.toArray(),
      db.presupuestos.toArray(),
      db.fijos.toArray(),
      db.ajustes.toArray(),
      db.cotizaciones.toArray(),
    ])

  const backup = {
    app: 'finanzas',
    version: VERSION,
    fecha: new Date().toISOString(),
    movimientos,
    categorias,
    metodos,
    presupuestos,
    fijos,
    ajustes,
    cotizaciones,
  }

  descargar(
    new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }),
    `finanzas_backup_${hoyISO()}.json`,
  )

  return movimientos.length
}

// modo 'reemplazar': la app queda exactamente como el backup.
// modo 'fusionar':   suma los movimientos que no estén ya cargados.
export async function importarBackup(archivo, modo = 'reemplazar') {
  const texto = await archivo.text()
  let datos
  try {
    datos = JSON.parse(texto)
  } catch {
    throw new Error('El archivo no es un backup válido (no es JSON).')
  }
  if (datos?.app !== 'finanzas' || !Array.isArray(datos.movimientos)) {
    throw new Error('El archivo no es un backup de esta app.')
  }

  const tablas = [
    db.movimientos,
    db.categorias,
    db.metodos,
    db.presupuestos,
    db.fijos,
    db.ajustes,
    db.cotizaciones,
  ]

  return db.transaction('rw', tablas, async () => {
    if (modo === 'reemplazar') {
      await Promise.all(tablas.map((t) => t.clear()))
      await db.movimientos.bulkAdd(datos.movimientos)
      await db.categorias.bulkAdd(datos.categorias ?? [])
      await db.metodos.bulkAdd(datos.metodos ?? [])
      await db.presupuestos.bulkAdd(datos.presupuestos ?? [])
      await db.fijos.bulkAdd(datos.fijos ?? [])
      await db.ajustes.bulkPut(datos.ajustes ?? [])
      await db.cotizaciones.bulkPut(datos.cotizaciones ?? [])
      return datos.movimientos.length
    }

    // Fusionar: la huella evita duplicar el mismo movimiento si importás dos
    // veces el mismo backup (el id no sirve, puede chocar con otro distinto).
    const existentes = new Set((await db.movimientos.toArray()).map(huella))
    const nuevos = datos.movimientos.filter((m) => !existentes.has(huella(m)))
    await db.movimientos.bulkAdd(nuevos.map(({ id, ...resto }) => resto))

    const catsActuales = new Set((await db.categorias.toArray()).map((c) => `${c.tipo}|${c.nombre}`))
    const catsNuevas = (datos.categorias ?? []).filter(
      (c) => !catsActuales.has(`${c.tipo}|${c.nombre}`),
    )
    if (catsNuevas.length) await db.categorias.bulkAdd(catsNuevas.map(({ id, ...r }) => r))

    const metsActuales = new Set((await db.metodos.toArray()).map((m) => `${m.tipo}|${m.nombre}`))
    const metsNuevos = (datos.metodos ?? []).filter(
      (m) => !metsActuales.has(`${m.tipo}|${m.nombre}`),
    )
    if (metsNuevos.length) await db.metodos.bulkAdd(metsNuevos.map(({ id, ...r }) => r))

    // Las cotizaciones se pisan por mes: no hay riesgo de duplicar.
    if (datos.cotizaciones?.length) await db.cotizaciones.bulkPut(datos.cotizaciones)

    return nuevos.length
  })
}

function huella(m) {
  return [
    m.fecha,
    m.tipo,
    m.monto,
    m.moneda ?? 'ARS',
    m.categoria,
    m.subcategoria,
    m.metodo,
    m.descripcion ?? '',
  ].join('|')
}

function descargar(blob, nombre) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = nombre
  document.body.appendChild(a)
  a.click()
  a.remove()
  // Damos tiempo a que el navegador tome el blob antes de liberarlo.
  setTimeout(() => URL.revokeObjectURL(url), 4000)
}
