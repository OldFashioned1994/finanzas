// Lo que viaja entre Finanzas y el reloj (T-Rex 3), en funciones puras: sin base ni red,
// para poder probarlas solas (node --test src/utils/reloj-datos.test.js).

/** Lo que el reloj muestra para cargar un gasto: categorías, métodos y los combos de siempre. */
export function armarCatalogo({ categorias, metodos, movimientos, hoy = new Date() }) {
  const cats = categorias
    .filter((c) => c.tipo === 'gasto' && !c.archivada)
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
    .map((c) => ({
      nombre: c.nombre,
      grupo: c.grupo ?? '',
      subcategorias: [...(c.subcategorias ?? [])],
    }))
  const nombres = new Set(cats.map((c) => c.nombre))
  const mets = metodos
    .filter((m) => m.tipo === 'gasto' && !m.archivado)
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
    .map((m) => ({ nombre: m.nombre, moneda: m.moneda ?? 'ARS' }))

  // Los combos más usados de los últimos 90 días (los primeros botones del reloj). Solo lo que
  // se cargó a mano: ni las cuotas (que además pueden ser futuras) ni los fijos.
  const desde = diaLocal(new Date(hoy.getTime() - 90 * 864e5))
  const hasta = diaLocal(hoy)
  const cuenta = new Map()
  for (const m of movimientos) {
    if (m.tipo !== 'gasto' || !m.fecha || m.fecha < desde || m.fecha > hasta) continue
    if (m.compraId || m.fijoId || !nombres.has(m.categoria)) continue
    const clave = `${m.categoria}\u0000${m.subcategoria ?? ''}\u0000${m.metodo ?? ''}`
    cuenta.set(clave, (cuenta.get(clave) ?? 0) + 1)
  }
  const frecuentes = [...cuenta.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([clave]) => {
      const [categoria, subcategoria, metodo] = clave.split('\u0000')
      return { categoria, subcategoria, metodo }
    })
  return { categorias: cats, metodos: mets, frecuentes }
}

const mesDe = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
const diaLocal = (d) => `${mesDe(d)}-${String(d.getDate()).padStart(2, '0')}`

/** Los gastos fijos que faltan pagar este mes (con o sin el día ya pasado), por día. */
export function armarVencimientos({ fijos, hoy = new Date() }) {
  const mes = mesDe(hoy)
  const items = fijos
    .filter((f) => f.activo && f.tipo !== 'ingreso' && f.ultimoMes !== mes)
    .map((f) => ({
      id: String(f.id),
      descripcion: f.descripcion || f.subcategoria || f.categoria || 'Gasto fijo',
      categoria: f.categoria ?? '',
      monto: Number(f.monto) || 0,
      moneda: f.moneda ?? 'ARS',
      diaMes: Math.min(Math.max(Number(f.diaMes) || 1, 1), 31),
    }))
    .sort((a, b) => a.diaMes - b.diaMes)
  return { mes, items }
}

/**
 * Un gasto del reloj → un movimiento de Finanzas. `metodoPorDefecto` si el reloj no mandó
 * método. La fecha viene en la hora del reloj (Argentina): se toma el día tal cual.
 */
export function gastoAMovimiento(g, metodoPorDefecto = '') {
  if (!g || typeof g !== 'object') return null
  const monto = Number(g.monto)
  const texto = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
  const categoria = texto(g.categoria, 60)
  const fecha = typeof g.fecha === 'string' ? g.fecha.slice(0, 10) : ''
  // lo mismo que exige el buzón, de nuevo acá: si una clave se filtra, nada raro entra igual
  if (!(monto > 0) || monto > 1e10 || !categoria) return null
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || typeof g.id !== 'string' || !/^[A-Za-z0-9-]{8,64}$/.test(g.id))
    return null
  return {
    fecha,
    tipo: 'gasto',
    monto: Math.round(monto * 100) / 100,
    moneda: g.moneda === 'USD' ? 'USD' : 'ARS',
    // en dólares sin cotización propia: la app usa la del mes (ver utils/moneda.js)
    tc: null,
    categoria,
    subcategoria: texto(g.subcategoria, 60),
    metodo: texto(g.metodo, 60) || metodoPorDefecto,
    descripcion: texto(g.nota, 140),
    tags: ['reloj'],
    relojId: g.id,
  }
}

/** Una clave al azar para el buzón (32 bytes en base64url). */
export function claveNueva(azar = (n) => crypto.getRandomValues(new Uint8Array(n))) {
  return btoa(String.fromCharCode(...azar(32)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}
