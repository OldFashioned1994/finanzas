import Dexie from 'dexie'
import { CONFIG, ICONOS, GRUPOS, CLASIFICACION } from './config'

// ============================================================================
//  Base de datos local (IndexedDB) vía Dexie. Sin backend, sin nube, sin login.
// ----------------------------------------------------------------------------
//  TABLAS
//
//  movimientos   el registro de plata que entra y sale
//    id           number   autoincremental, interno (NO se exporta)
//    fecha        string   'YYYY-MM-DD'
//    tipo         string   'gasto' | 'ingreso'
//    monto        number   siempre positivo, EN LA MONEDA DEL MOVIMIENTO
//    moneda       string   'ARS' | 'USD'  (los viejos, sin campo, son ARS)
//    tc           number   opcional: pesos por dólar de ESE movimiento.
//                          Obligatorio si moneda es USD; opcional en ARS, para
//                          el caso "lo pagué en pesos pero me lo cobraron en
//                          dólares". Se guarda por movimiento a propósito: cada
//                          gasto queda con la cotización del día en que pasó.
//    categoria    string   texto (no id): el movimiento conserva el nombre con
//                          el que se cargó aunque después renombres la categoría
//    subcategoria string
//    metodo       string
//    descripcion  string   opcional
//    fijoId       number   opcional, si nació de un gasto fijo
//    createdAt    number   timestamp ms, interno (NO se exporta)
//
//  grupos        el nivel de arriba de las categorías (Vivienda, Transporte…)
//    id, tipo, nombre, emoji, orden
//
//  categorias    taxonomía editable desde Ajustes (semilla: config.js)
//    id, tipo, nombre, emoji, orden, archivada, subcategorias: string[]
//    grupo        string  nombre del grupo al que pertenece
//    naturaleza   'esencial' | 'disfrute' | 'otros' (solo gastos)
//
//  metodos       medios de pago / dónde entró la plata
//    id, tipo, nombre, emoji, orden, archivado
//    moneda       'ARS' | 'USD' | undefined -> si el método tiene moneda propia
//                 (ej: "Efectivo USD"), elegirlo cambia solo la moneda del monto
//
//  cotizaciones  cuánto valía el dólar en cada mes, para poder expresar en
//    mes          'YYYY-MM'                dólares los movimientos que no traen
//    valor        number (pesos por dólar)  su propia cotización
//
//  presupuestos  tope mensual por categoría de gasto
//    id, categoria (nombre), monto
//
//  fijos         gastos/ingresos recurrentes del mes (alquiler, streaming…)
//    id, tipo, monto, categoria, subcategoria, metodo, descripcion,
//    diaMes (1-31), activo, ultimoMes ('YYYY-MM' en que ya se confirmó)
//
//  ajustes       clave/valor suelto (preferencias)
//    clave, valor
// ============================================================================

export const db = new Dexie('finanzas')

// v1: el esquema original. Se declara para que Dexie pueda encadenar el upgrade.
db.version(1).stores({
  movimientos: '++id, fecha, tipo, categoria, createdAt',
})

db.version(2)
  .stores({
    movimientos: '++id, fecha, tipo, categoria, subcategoria, metodo, createdAt',
    categorias: '++id, tipo, nombre, orden',
    metodos: '++id, tipo, nombre, orden',
    presupuestos: '++id, &categoria',
    fijos: '++id, activo',
    ajustes: 'clave',
  })
  .upgrade(async (tx) => {
    // Base que ya existía con movimientos: sembramos la taxonomía desde
    // config.js y además rescatamos cualquier categoría/método que aparezca
    // en movimientos viejos y no esté en la config (para no perder nada).
    await sembrarTaxonomia(tx)
    const movs = await tx.table('movimientos').toArray()
    await absorberDeMovimientos(tx, movs)
  })

db.version(3)
  .stores({
    movimientos: '++id, fecha, tipo, categoria, subcategoria, metodo, moneda, createdAt',
    cotizaciones: 'mes',
  })
  .upgrade(async (tx) => {
    // Todo lo cargado hasta acá era en pesos. No se toca ningún monto: solo se
    // deja explícito lo que ya era implícito.
    await tx
      .table('movimientos')
      .toCollection()
      .modify((m) => {
        m.moneda = 'ARS'
      })
  })

db.version(4)
  .stores({
    grupos: '++id, tipo, nombre, orden',
    categorias: '++id, tipo, nombre, orden, grupo',
  })
  .upgrade(async (tx) => {
    await sembrarGrupos(tx)
    // Cada categoría que ya existía se asigna a su grupo según la tabla de
    // clasificación. Lo que no figure ahí (categorías propias del usuario) va al
    // último grupo del tipo, que es el cajón de "varios": nada queda sin grupo.
    const grupos = await tx.table('grupos').toArray()
    const ultimoDe = (tipo) => {
      const delTipo = grupos.filter((g) => g.tipo === tipo).sort((a, b) => a.orden - b.orden)
      return delTipo[delTipo.length - 1]?.nombre ?? ''
    }
    await tx
      .table('categorias')
      .toCollection()
      .modify((c) => {
        const clas = CLASIFICACION[c.nombre]
        c.grupo = clas?.grupo ?? ultimoDe(c.tipo)
        c.naturaleza = c.tipo === 'gasto' ? (clas?.naturaleza ?? 'otros') : null
      })
  })

// Instalación nueva: no hay upgrade que correr, así que sembramos acá.
db.on('populate', (tx) => sembrarTaxonomia(tx))

// ---------------------------------------------------------------------------
//  Semilla de la taxonomía
// ---------------------------------------------------------------------------

async function sembrarGrupos(tx) {
  const filas = []
  for (const tipo of ['gasto', 'ingreso']) {
    ;(GRUPOS[tipo] ?? []).forEach((g, i) => {
      filas.push({ tipo, nombre: g.nombre, emoji: g.emoji, orden: i })
    })
  }
  await tx.table('grupos').bulkAdd(filas)
}

async function sembrarTaxonomia(tx) {
  await sembrarGrupos(tx)

  const categorias = []
  const metodos = []

  for (const tipo of ['gasto', 'ingreso']) {
    const cfg = CONFIG[tipo]
    if (!cfg) continue
    const ultimoGrupo = (GRUPOS[tipo] ?? []).at(-1)?.nombre ?? ''

    Object.entries(cfg.categorias ?? {}).forEach(([nombre, subs], i) => {
      const clas = CLASIFICACION[nombre]
      categorias.push({
        tipo,
        nombre,
        emoji: ICONOS[nombre] ?? '📌',
        orden: i,
        archivada: false,
        subcategorias: [...subs],
        grupo: clas?.grupo ?? ultimoGrupo,
        naturaleza: tipo === 'gasto' ? (clas?.naturaleza ?? 'otros') : null,
      })
    })

    ;(cfg.metodos ?? []).forEach((nombre, i) => {
      metodos.push({
        tipo,
        nombre,
        emoji: ICONOS[nombre] ?? '💳',
        orden: i,
        archivado: false,
      })
    })
  }

  await tx.table('categorias').bulkAdd(categorias)
  await tx.table('metodos').bulkAdd(metodos)
}

// Agrega a la taxonomía lo que exista en movimientos y falte en la config.
async function absorberDeMovimientos(tx, movs) {
  if (!movs?.length) return

  const cats = await tx.table('categorias').toArray()
  const mets = await tx.table('metodos').toArray()
  const claveCat = new Set(cats.map((c) => `${c.tipo}|${c.nombre}`))
  const claveMet = new Set(mets.map((m) => `${m.tipo}|${m.nombre}`))

  const nuevasCats = new Map() // 'tipo|nombre' -> { tipo, nombre, subs:Set }
  const nuevosMets = new Map()

  for (const m of movs) {
    const tipo = m.tipo === 'ingreso' ? 'ingreso' : 'gasto'

    if (m.categoria) {
      const k = `${tipo}|${m.categoria}`
      if (!claveCat.has(k)) {
        if (!nuevasCats.has(k)) {
          nuevasCats.set(k, { tipo, nombre: m.categoria, subs: new Set() })
        }
        if (m.subcategoria) nuevasCats.get(k).subs.add(m.subcategoria)
      } else if (m.subcategoria) {
        // La categoría existe: me aseguro de que la subcategoría también.
        const cat = cats.find((c) => c.tipo === tipo && c.nombre === m.categoria)
        if (cat && !cat.subcategorias.includes(m.subcategoria)) {
          cat.subcategorias.push(m.subcategoria)
          await tx.table('categorias').update(cat.id, { subcategorias: cat.subcategorias })
        }
      }
    }

    if (m.metodo) {
      const k = `${tipo}|${m.metodo}`
      if (!claveMet.has(k) && !nuevosMets.has(k)) {
        nuevosMets.set(k, { tipo, nombre: m.metodo })
      }
    }
  }

  if (nuevasCats.size) {
    let orden = cats.length
    const grupos = await tx.table('grupos').toArray()
    const ultimoDe = (tipo) => {
      const delTipo = grupos.filter((g) => g.tipo === tipo).sort((a, b) => a.orden - b.orden)
      return delTipo[delTipo.length - 1]?.nombre ?? ''
    }
    await tx.table('categorias').bulkAdd(
      [...nuevasCats.values()].map((c) => ({
        tipo: c.tipo,
        nombre: c.nombre,
        emoji: ICONOS[c.nombre] ?? '📌',
        orden: orden++,
        archivada: false,
        subcategorias: [...c.subs],
        grupo: CLASIFICACION[c.nombre]?.grupo ?? ultimoDe(c.tipo),
        naturaleza: c.tipo === 'gasto' ? (CLASIFICACION[c.nombre]?.naturaleza ?? 'otros') : null,
      })),
    )
  }

  if (nuevosMets.size) {
    let orden = mets.length
    await tx.table('metodos').bulkAdd(
      [...nuevosMets.values()].map((m) => ({
        tipo: m.tipo,
        nombre: m.nombre,
        emoji: ICONOS[m.nombre] ?? '💳',
        orden: orden++,
        archivado: false,
      })),
    )
  }
}

// ---------------------------------------------------------------------------
//  Movimientos
// ---------------------------------------------------------------------------

export async function agregarMovimiento(mov) {
  return db.movimientos.add({ ...mov, createdAt: Date.now() })
}

export async function actualizarMovimiento(id, cambios) {
  return db.movimientos.update(id, cambios)
}

export async function borrarMovimiento(id) {
  return db.movimientos.delete(id)
}

// ---------------------------------------------------------------------------
//  Categorías
// ---------------------------------------------------------------------------

export async function agregarCategoria({
  tipo,
  nombre,
  emoji,
  subcategorias = [],
  grupo,
  naturaleza,
}) {
  const orden = await db.categorias.where('tipo').equals(tipo).count()
  // Sin grupo elegido, cae en el último del tipo (el cajón de "varios").
  const grupos = await db.grupos.where('tipo').equals(tipo).sortBy('orden')
  return db.categorias.add({
    tipo,
    nombre: nombre.trim(),
    emoji: emoji || '📌',
    orden,
    archivada: false,
    subcategorias,
    grupo: grupo ?? grupos.at(-1)?.nombre ?? '',
    naturaleza: tipo === 'gasto' ? (naturaleza ?? 'otros') : null,
  })
}

// ---------------------------------------------------------------------------
//  Grupos (el nivel de arriba de las categorías)
// ---------------------------------------------------------------------------

export async function agregarGrupo({ tipo, nombre, emoji }) {
  const orden = await db.grupos.where('tipo').equals(tipo).count()
  return db.grupos.add({ tipo, nombre: nombre.trim(), emoji: emoji || '📦', orden })
}

// Renombrar un grupo arrastra las categorías que lo tienen asignado.
export async function renombrarGrupo(id, nuevoNombre) {
  const nombre = nuevoNombre.trim()
  const grupo = await db.grupos.get(id)
  if (!grupo || !nombre || nombre === grupo.nombre) return 0

  const chocado = await db.grupos
    .where('tipo')
    .equals(grupo.tipo)
    .filter((g) => g.id !== id && g.nombre.toLowerCase() === nombre.toLowerCase())
    .first()
  if (chocado) return -1

  return db.transaction('rw', db.grupos, db.categorias, async () => {
    await db.grupos.update(id, { nombre })
    return db.categorias
      .where('grupo')
      .equals(grupo.nombre)
      .filter((c) => c.tipo === grupo.tipo)
      .modify({ grupo: nombre })
  })
}

export async function actualizarGrupo(id, cambios) {
  return db.grupos.update(id, cambios)
}

// Al borrar un grupo, sus categorías se mudan a otro: ninguna queda huérfana.
export async function borrarGrupo(id) {
  const grupo = await db.grupos.get(id)
  if (!grupo) return { borrado: false, mudadas: 0 }
  const hermanos = await db.grupos.where('tipo').equals(grupo.tipo).sortBy('orden')
  const destino = hermanos.find((g) => g.id !== id)
  if (!destino) return { borrado: false, mudadas: 0, ultimo: true }

  return db.transaction('rw', db.grupos, db.categorias, async () => {
    const mudadas = await db.categorias
      .where('grupo')
      .equals(grupo.nombre)
      .filter((c) => c.tipo === grupo.tipo)
      .modify({ grupo: destino.nombre })
    await db.grupos.delete(id)
    return { borrado: true, mudadas, destino: destino.nombre }
  })
}

export async function reordenarGrupos(ids) {
  return db.transaction('rw', db.grupos, async () => {
    for (let i = 0; i < ids.length; i++) await db.grupos.update(ids[i], { orden: i })
  })
}

// Renombrar arrastra los movimientos ya cargados, el presupuesto y los fijos,
// así el historial no se parte en dos nombres distintos.
// Devuelve la cantidad de movimientos actualizados, o -1 si el nombre ya lo usa
// otra categoría del mismo tipo (fusionar dos categorías en silencio sería peor
// que no hacer nada).
export async function renombrarCategoria(id, nuevoNombre) {
  const nombre = nuevoNombre.trim()
  const cat = await db.categorias.get(id)
  if (!cat || !nombre || nombre === cat.nombre) return 0

  const chocada = await db.categorias
    .where('tipo')
    .equals(cat.tipo)
    .filter((c) => c.id !== id && c.nombre.toLowerCase() === nombre.toLowerCase())
    .first()
  if (chocada) return -1

  return db.transaction('rw', db.categorias, db.movimientos, db.presupuestos, db.fijos, async () => {
    await db.categorias.update(id, { nombre })
    const afectados = await db.movimientos
      .where('categoria')
      .equals(cat.nombre)
      .filter((m) => m.tipo === cat.tipo)
      .modify({ categoria: nombre })

    const pre = await db.presupuestos.where('categoria').equals(cat.nombre).first()
    if (pre) {
      // El índice de presupuestos es único por categoría: si ya hay uno con el
      // nombre nuevo, se conserva ese y se descarta el viejo.
      const destino = await db.presupuestos.where('categoria').equals(nombre).first()
      if (destino) await db.presupuestos.delete(pre.id)
      else await db.presupuestos.update(pre.id, { categoria: nombre })
    }

    await db.fijos.filter((f) => f.categoria === cat.nombre && f.tipo === cat.tipo).modify({
      categoria: nombre,
    })
    return afectados
  })
}

export async function actualizarCategoria(id, cambios) {
  return db.categorias.update(id, cambios)
}

// No borramos de verdad si tiene movimientos: la archivamos (deja de ofrecerse
// al cargar, pero el historial sigue intacto y sumando en el panel).
export async function archivarCategoria(id, archivada = true) {
  return db.categorias.update(id, { archivada })
}

export async function borrarCategoria(id) {
  const cat = await db.categorias.get(id)
  if (!cat) return { borrada: false, usos: 0 }
  const usos = await db.movimientos
    .where('categoria')
    .equals(cat.nombre)
    .filter((m) => m.tipo === cat.tipo)
    .count()
  if (usos > 0) {
    await archivarCategoria(id, true)
    return { borrada: false, usos }
  }
  await db.categorias.delete(id)
  return { borrada: true, usos: 0 }
}

export async function agregarSubcategoria(catId, nombre) {
  const cat = await db.categorias.get(catId)
  const sub = nombre.trim()
  if (!cat || !sub || cat.subcategorias.includes(sub)) return
  return db.categorias.update(catId, { subcategorias: [...cat.subcategorias, sub] })
}

export async function renombrarSubcategoria(catId, anterior, nuevo) {
  const cat = await db.categorias.get(catId)
  const sub = nuevo.trim()
  if (!cat || !sub || sub === anterior) return
  return db.transaction('rw', db.categorias, db.movimientos, db.fijos, async () => {
    await db.categorias.update(catId, {
      subcategorias: cat.subcategorias.map((s) => (s === anterior ? sub : s)),
    })
    await db.movimientos
      .where('subcategoria')
      .equals(anterior)
      .filter((m) => m.categoria === cat.nombre && m.tipo === cat.tipo)
      .modify({ subcategoria: sub })
    await db.fijos
      .filter((f) => f.categoria === cat.nombre && f.subcategoria === anterior)
      .modify({ subcategoria: sub })
  })
}

export async function quitarSubcategoria(catId, nombre) {
  const cat = await db.categorias.get(catId)
  if (!cat) return
  return db.categorias.update(catId, {
    subcategorias: cat.subcategorias.filter((s) => s !== nombre),
  })
}

export async function reordenarCategorias(ids) {
  return db.transaction('rw', db.categorias, async () => {
    for (let i = 0; i < ids.length; i++) {
      await db.categorias.update(ids[i], { orden: i })
    }
  })
}

// ---------------------------------------------------------------------------
//  Métodos de pago
// ---------------------------------------------------------------------------

export async function agregarMetodo({ tipo, nombre, emoji, moneda }) {
  const orden = await db.metodos.where('tipo').equals(tipo).count()
  return db.metodos.add({
    tipo,
    nombre: nombre.trim(),
    emoji: emoji || '💳',
    orden,
    archivado: false,
    moneda: moneda ?? 'ARS',
  })
}

export async function renombrarMetodo(id, nuevoNombre) {
  const nombre = nuevoNombre.trim()
  const met = await db.metodos.get(id)
  if (!met || !nombre || nombre === met.nombre) return
  return db.transaction('rw', db.metodos, db.movimientos, db.fijos, async () => {
    await db.metodos.update(id, { nombre })
    await db.movimientos
      .where('metodo')
      .equals(met.nombre)
      .filter((m) => m.tipo === met.tipo)
      .modify({ metodo: nombre })
    await db.fijos.filter((f) => f.metodo === met.nombre).modify({ metodo: nombre })
  })
}

export async function actualizarMetodo(id, cambios) {
  return db.metodos.update(id, cambios)
}

export async function borrarMetodo(id) {
  const met = await db.metodos.get(id)
  if (!met) return { borrado: false, usos: 0 }
  const usos = await db.movimientos
    .where('metodo')
    .equals(met.nombre)
    .filter((m) => m.tipo === met.tipo)
    .count()
  if (usos > 0) {
    await db.metodos.update(id, { archivado: true })
    return { borrado: false, usos }
  }
  await db.metodos.delete(id)
  return { borrado: true, usos: 0 }
}

// ---------------------------------------------------------------------------
//  Presupuestos (tope mensual por categoría de gasto)
// ---------------------------------------------------------------------------

export async function definirPresupuesto(categoria, monto) {
  const existente = await db.presupuestos.where('categoria').equals(categoria).first()
  if (!monto || monto <= 0) {
    if (existente) await db.presupuestos.delete(existente.id)
    return
  }
  if (existente) return db.presupuestos.update(existente.id, { monto })
  return db.presupuestos.add({ categoria, monto })
}

// ---------------------------------------------------------------------------
//  Gastos fijos
// ---------------------------------------------------------------------------

export async function agregarFijo(fijo) {
  return db.fijos.add({ activo: 1, ultimoMes: '', ...fijo })
}

export async function actualizarFijo(id, cambios) {
  return db.fijos.update(id, cambios)
}

export async function borrarFijo(id) {
  return db.fijos.delete(id)
}

// Confirma un fijo del mes: crea el movimiento y marca el fijo como hecho.
// `tc` es la cotización a aplicar cuando el fijo está en dólares (una
// suscripción, por ejemplo): queda guardada en el movimiento de ese mes.
export async function confirmarFijo(fijo, mesISO, { monto, tc } = {}) {
  const dia = String(Math.min(fijo.diaMes || 1, diasDelMes(mesISO))).padStart(2, '0')
  const id = await agregarMovimiento({
    fecha: `${mesISO}-${dia}`,
    tipo: fijo.tipo,
    monto: monto ?? fijo.monto,
    moneda: fijo.moneda ?? 'ARS',
    tc: tc ?? null,
    categoria: fijo.categoria,
    subcategoria: fijo.subcategoria,
    metodo: fijo.metodo,
    descripcion: fijo.descripcion || '',
    fijoId: fijo.id,
  })
  await db.fijos.update(fijo.id, { ultimoMes: mesISO })
  return id
}

// Saltear el fijo de este mes sin cargar movimiento (ej: no lo pagaste).
export async function omitirFijo(id, mesISO) {
  return db.fijos.update(id, { ultimoMes: mesISO })
}

function diasDelMes(mesISO) {
  const [a, m] = mesISO.split('-').map(Number)
  return new Date(a, m, 0).getDate()
}

// ---------------------------------------------------------------------------
//  Cotizaciones del dólar (una por mes)
// ---------------------------------------------------------------------------

export async function setCotizacion(mes, valor) {
  if (!valor || valor <= 0) return db.cotizaciones.delete(mes)
  return db.cotizaciones.put({ mes, valor })
}

// ---------------------------------------------------------------------------
//  Ajustes (clave/valor)
// ---------------------------------------------------------------------------

export async function setAjuste(clave, valor) {
  return db.ajustes.put({ clave, valor })
}

export async function getAjuste(clave, porDefecto = null) {
  const fila = await db.ajustes.get(clave)
  return fila ? fila.valor : porDefecto
}
