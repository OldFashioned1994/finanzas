import Dexie from 'dexie'

// Base de datos local (IndexedDB) vía Dexie. Sin backend, sin nube.
//
// Modelo de un movimiento:
//   id           number   -> autoincremental, interno (NO se exporta)
//   fecha        string   -> 'YYYY-MM-DD'
//   tipo         string   -> 'gasto' | 'ingreso'
//   monto        number   -> siempre positivo
//   categoria    string
//   subcategoria string
//   metodo       string
//   descripcion  string   -> opcional
//   createdAt    number   -> timestamp ms, interno (NO se exporta)

export const db = new Dexie('finanzas')

db.version(1).stores({
  // Solo declaramos los índices que usamos para filtrar/ordenar.
  movimientos: '++id, fecha, tipo, categoria, createdAt',
})

export async function agregarMovimiento(mov) {
  return db.movimientos.add({ ...mov, createdAt: Date.now() })
}

export async function actualizarMovimiento(id, cambios) {
  return db.movimientos.update(id, cambios)
}

export async function borrarMovimiento(id) {
  return db.movimientos.delete(id)
}
