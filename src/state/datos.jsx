import { createContext, useContext, useMemo } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'

// ============================================================================
//  Una única suscripción viva a IndexedDB para toda la app.
//  Todo lo que se muestra (panel, lista, ajustes) se deriva de acá, así no hay
//  dos pantallas leyendo lo mismo por separado ni datos desincronizados.
// ============================================================================

const DatosContext = createContext(null)

export function DatosProvider({ children }) {
  const movimientos = useLiveQuery(() => db.movimientos.toArray(), [], undefined)
  const categorias = useLiveQuery(() => db.categorias.toArray(), [], undefined)
  const metodos = useLiveQuery(() => db.metodos.toArray(), [], undefined)
  const presupuestos = useLiveQuery(() => db.presupuestos.toArray(), [], undefined)
  const fijos = useLiveQuery(() => db.fijos.toArray(), [], undefined)
  const ajustes = useLiveQuery(() => db.ajustes.toArray(), [], undefined)

  const valor = useMemo(() => {
    const ordenar = (arr) => [...(arr ?? [])].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
    return {
      cargando: movimientos === undefined || categorias === undefined,
      movimientos: movimientos ?? [],
      categorias: ordenar(categorias),
      metodos: ordenar(metodos),
      presupuestos: presupuestos ?? [],
      fijos: fijos ?? [],
      ajustes: Object.fromEntries((ajustes ?? []).map((a) => [a.clave, a.valor])),
    }
  }, [movimientos, categorias, metodos, presupuestos, fijos, ajustes])

  return <DatosContext.Provider value={valor}>{children}</DatosContext.Provider>
}

export function useDatos() {
  const ctx = useContext(DatosContext)
  if (!ctx) throw new Error('useDatos debe usarse dentro de <DatosProvider>')
  return ctx
}

// Categorías activas de un tipo (las archivadas no se ofrecen al cargar,
// pero siguen apareciendo en el historial y el panel).
export function useCategoriasDe(tipo) {
  const { categorias } = useDatos()
  return useMemo(
    () => categorias.filter((c) => c.tipo === tipo && !c.archivada),
    [categorias, tipo],
  )
}

export function useMetodosDe(tipo) {
  const { metodos } = useDatos()
  return useMemo(() => metodos.filter((m) => m.tipo === tipo && !m.archivado), [metodos, tipo])
}

// Emoji por nombre, mirando primero la taxonomía viva y después la config.
export function useIconos() {
  const { categorias, metodos } = useDatos()
  return useMemo(() => {
    const mapa = new Map()
    for (const c of categorias) mapa.set(c.nombre, c.emoji || '📌')
    for (const m of metodos) if (!mapa.has(m.nombre)) mapa.set(m.nombre, m.emoji || '💳')
    return (nombre) => mapa.get(nombre) ?? '📌'
  }, [categorias, metodos])
}
