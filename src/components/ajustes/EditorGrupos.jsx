import { useState } from 'react'
import { Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react'
import { useDatos } from '../../state/datos'
import { agregarGrupo, renombrarGrupo, actualizarGrupo, borrarGrupo, reordenarGrupos } from '../../db'
import { CampoTexto } from './EditorCategorias'

// Los grupos son el nivel de arriba de las categorías: sirven para leer el
// panel en grueso ("cuánto se me va en vivienda") sin sumar a mano alquiler,
// expensas, luz e internet.
export default function EditorGrupos({ onToast }) {
  const { grupos, categorias } = useDatos()
  const [tipo, setTipo] = useState('gasto')
  const [nuevo, setNuevo] = useState('')

  const delTipo = grupos.filter((g) => g.tipo === tipo)

  const cuantasCategorias = (nombre) =>
    categorias.filter((c) => c.tipo === tipo && c.grupo === nombre).length

  const crear = async () => {
    const nombre = nuevo.trim()
    if (!nombre) return
    if (delTipo.some((g) => g.nombre.toLowerCase() === nombre.toLowerCase())) {
      onToast?.({ msg: 'Ya existe un grupo con ese nombre', tone: 'error' })
      return
    }
    await agregarGrupo({ tipo, nombre })
    setNuevo('')
    onToast?.({ msg: 'Grupo creado', tone: 'ok' })
  }

  const mover = async (indice, delta) => {
    const destino = indice + delta
    if (destino < 0 || destino >= delTipo.length) return
    const ids = delTipo.map((g) => g.id)
    ;[ids[indice], ids[destino]] = [ids[destino], ids[indice]]
    await reordenarGrupos(ids)
  }

  const eliminar = async (grupo) => {
    const r = await borrarGrupo(grupo.id)
    if (r.ultimo) {
      onToast?.({ msg: 'Tiene que quedar al menos un grupo', tone: 'error' })
      return
    }
    onToast?.({
      msg: r.mudadas
        ? `Grupo borrado, ${r.mudadas} categorías pasaron a ${r.destino}`
        : 'Grupo borrado',
      tone: 'ok',
    })
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-800/50 p-1 ring-1 ring-white/5">
        {['gasto', 'ingreso'].map((t) => (
          <button
            key={t}
            onClick={() => setTipo(t)}
            className={`min-h-10 rounded-xl text-sm font-semibold capitalize active:scale-95 ${
              tipo === t ? 'bg-indigo-500 text-white' : 'text-slate-400'
            }`}
          >
            {t === 'gasto' ? 'Gastos' : 'Ingresos'}
          </button>
        ))}
      </div>

      <ul className="space-y-1.5">
        {delTipo.map((grupo, i) => (
          <li
            key={grupo.id}
            className="flex items-center gap-2 rounded-2xl border border-white/5 bg-slate-900/50 p-2"
          >
            <input
              value={grupo.emoji ?? ''}
              onChange={(e) => actualizarGrupo(grupo.id, { emoji: e.target.value.slice(0, 2) })}
              maxLength={2}
              className="size-10 shrink-0 rounded-xl bg-slate-800 text-center text-lg outline-none focus:ring-1 focus:ring-indigo-500"
              aria-label="Emoji del grupo"
            />
            <span className="min-w-0 flex-1">
              <CampoTexto
                valor={grupo.nombre}
                etiqueta="Nombre del grupo"
                onGuardar={async (v) => {
                  const n = await renombrarGrupo(grupo.id, v)
                  if (n === -1) onToast?.({ msg: 'Ya existe un grupo con ese nombre', tone: 'error' })
                }}
                className="w-full"
              />
              <span className="block px-2 text-xs text-slate-500">
                {cuantasCategorias(grupo.nombre)} categorías
              </span>
            </span>
            <button
              onClick={() => mover(i, -1)}
              disabled={i === 0}
              className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-slate-400 active:scale-95 disabled:opacity-30"
              aria-label="Subir"
            >
              <ArrowUp size={14} />
            </button>
            <button
              onClick={() => mover(i, 1)}
              disabled={i === delTipo.length - 1}
              className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-slate-400 active:scale-95 disabled:opacity-30"
              aria-label="Bajar"
            >
              <ArrowDown size={14} />
            </button>
            <button
              onClick={() => eliminar(grupo)}
              className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-rose-500/10 text-rose-300 active:scale-95"
              aria-label="Borrar grupo"
            >
              <Trash2 size={14} />
            </button>
          </li>
        ))}
      </ul>

      <div className="flex gap-2">
        <input
          value={nuevo}
          onChange={(e) => setNuevo(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && crear()}
          placeholder="Nuevo grupo"
          className="min-h-11 flex-1 rounded-2xl border border-slate-700/70 bg-slate-800/60 px-3 text-base text-slate-100 outline-none placeholder:text-slate-600 focus:border-indigo-500"
        />
        <button
          onClick={crear}
          className="flex min-h-11 shrink-0 items-center gap-1 rounded-2xl bg-indigo-500 px-4 font-semibold text-white active:scale-95"
        >
          <Plus size={18} /> Agregar
        </button>
      </div>

      <p className="text-xs leading-relaxed text-slate-500">
        El orden define el color de cada grupo en el panel. Al borrar un grupo, sus categorías pasan
        al primero de la lista: ninguna queda suelta. A qué grupo pertenece cada categoría se elige
        en la sección Categorías.
      </p>
    </div>
  )
}
