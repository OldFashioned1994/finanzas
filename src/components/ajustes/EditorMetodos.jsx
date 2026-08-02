import { useState } from 'react'
import { Plus, Trash2, Archive, ArchiveRestore } from 'lucide-react'
import { useDatos } from '../../state/datos'
import { agregarMetodo, renombrarMetodo, actualizarMetodo, borrarMetodo } from '../../db'
import { CampoTexto } from './EditorCategorias'
import { ARS, USD, MONEDAS } from '../../utils/moneda'

export default function EditorMetodos({ onToast }) {
  const { metodos } = useDatos()
  const [tipo, setTipo] = useState('gasto')
  const [nuevo, setNuevo] = useState('')

  const delTipo = metodos.filter((m) => m.tipo === tipo)

  const crear = async () => {
    const nombre = nuevo.trim()
    if (!nombre) return
    if (delTipo.some((m) => m.nombre.toLowerCase() === nombre.toLowerCase())) {
      onToast?.({ msg: 'Ya existe ese método', tone: 'error' })
      return
    }
    await agregarMetodo({ tipo, nombre })
    setNuevo('')
    onToast?.({ msg: 'Método creado', tone: 'ok' })
  }

  const eliminar = async (met) => {
    const { borrado, usos } = await borrarMetodo(met.id)
    onToast?.(
      borrado
        ? { msg: 'Método borrado', tone: 'ok' }
        : { msg: `Tiene ${usos} movimientos: se archivó`, tone: 'info' },
    )
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-800/50 p-1 ring-1 ring-white/5">
        <button
          onClick={() => setTipo('gasto')}
          className={`min-h-10 rounded-xl text-sm font-semibold active:scale-95 ${
            tipo === 'gasto' ? 'bg-indigo-500 text-white' : 'text-slate-400'
          }`}
        >
          Con qué pagás
        </button>
        <button
          onClick={() => setTipo('ingreso')}
          className={`min-h-10 rounded-xl text-sm font-semibold active:scale-95 ${
            tipo === 'ingreso' ? 'bg-indigo-500 text-white' : 'text-slate-400'
          }`}
        >
          Dónde entra
        </button>
      </div>

      <ul className="space-y-1.5">
        {delTipo.map((met) => (
          <li
            key={met.id}
            className={`flex items-center gap-2 rounded-2xl border border-white/5 p-2 ${
              met.archivado ? 'bg-slate-900/30 opacity-60' : 'bg-slate-900/50'
            }`}
          >
            <input
              value={met.emoji ?? ''}
              onChange={(e) => actualizarMetodo(met.id, { emoji: e.target.value.slice(0, 2) })}
              maxLength={2}
              className="size-10 shrink-0 rounded-xl bg-slate-800 text-center text-lg outline-none focus:ring-1 focus:ring-indigo-500"
              aria-label="Emoji"
            />
            <CampoTexto
              valor={met.nombre}
              onGuardar={(v) => renombrarMetodo(met.id, v)}
              className="min-w-0 flex-1"
            />
            {/* Un método con moneda propia (ej: "Efectivo USD") hace que al
                elegirlo el monto se cargue directamente en esa moneda. */}
            <button
              onClick={() =>
                actualizarMetodo(met.id, { moneda: met.moneda === USD ? ARS : USD })
              }
              className={`flex h-9 shrink-0 items-center justify-center rounded-xl px-2 text-xs font-bold active:scale-95 ${
                met.moneda === USD
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : 'bg-slate-800 text-slate-400'
              }`}
              aria-label={`Moneda: ${met.moneda === USD ? 'dólares' : 'pesos'}`}
            >
              {MONEDAS[met.moneda === USD ? USD : ARS].corto}
            </button>
            <button
              onClick={() => actualizarMetodo(met.id, { archivado: !met.archivado })}
              className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-slate-400 active:scale-95"
              aria-label={met.archivado ? 'Reactivar' : 'Archivar'}
            >
              {met.archivado ? <ArchiveRestore size={16} /> : <Archive size={16} />}
            </button>
            <button
              onClick={() => eliminar(met)}
              className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-300 active:scale-95"
              aria-label="Borrar"
            >
              <Trash2 size={16} />
            </button>
          </li>
        ))}
      </ul>

      <div className="flex gap-2">
        <input
          value={nuevo}
          onChange={(e) => setNuevo(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && crear()}
          placeholder="Nuevo método"
          className="min-h-11 flex-1 rounded-2xl border border-slate-700/70 bg-slate-800/60 px-3 text-base text-slate-100 outline-none placeholder:text-slate-600 focus:border-indigo-500"
        />
        <button
          onClick={crear}
          className="flex min-h-11 shrink-0 items-center gap-1 rounded-2xl bg-indigo-500 px-4 font-semibold text-white active:scale-95"
        >
          <Plus size={18} /> Agregar
        </button>
      </div>
    </div>
  )
}
