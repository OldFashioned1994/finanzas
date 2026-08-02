import { useState } from 'react'
import { Tag, Plus, X } from 'lucide-react'

// Etiquetas libres que cruzan categorías: "vacaciones 2026" toca transporte,
// comida y ocio a la vez, y ninguna categoría sola te dice cuánto salió el viaje.
export default function EditorEtiquetas({ tags, onChange, sugerencias = [] }) {
  const [abierto, setAbierto] = useState(false)
  const [texto, setTexto] = useState('')

  const agregar = (t) => {
    const limpio = t.trim().toLowerCase()
    if (!limpio || tags.includes(limpio)) return
    onChange([...tags, limpio])
    setTexto('')
  }

  const quitar = (t) => onChange(tags.filter((x) => x !== t))

  // Sugerencias que todavía no están puestas en este movimiento.
  const disponibles = sugerencias.filter((s) => !tags.includes(s)).slice(0, 6)

  if (!abierto && tags.length === 0) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="flex items-center gap-1.5 text-sm font-medium text-indigo-300 active:text-indigo-200"
      >
        <Tag size={15} /> Agregar etiqueta
      </button>
    )
  }

  return (
    <div className="animate-fade-up space-y-2">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-medium text-slate-400">
          <Tag size={15} /> Etiquetas
        </span>
        {tags.length === 0 && (
          <button
            type="button"
            onClick={() => setAbierto(false)}
            className="text-slate-500"
            aria-label="Cerrar etiquetas"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {tags.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <li
              key={t}
              className="flex items-center gap-1 rounded-xl bg-indigo-500/20 py-1.5 pl-3 pr-1.5 text-sm font-medium text-indigo-100"
            >
              {t}
              <button
                type="button"
                onClick={() => quitar(t)}
                className="flex size-5 items-center justify-center rounded-lg active:bg-indigo-500/30"
                aria-label={`Quitar ${t}`}
              >
                <X size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              agregar(texto)
            }
          }}
          placeholder="vacaciones 2026"
          className="min-h-11 flex-1 rounded-2xl border border-slate-700 bg-slate-800/60 px-4 text-base text-slate-100 outline-none placeholder:text-slate-600 focus:border-indigo-500"
        />
        <button
          type="button"
          onClick={() => agregar(texto)}
          className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-slate-700 text-slate-200 active:scale-95"
          aria-label="Agregar etiqueta"
        >
          <Plus size={18} />
        </button>
      </div>

      {disponibles.length > 0 && (
        <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
          {disponibles.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => agregar(s)}
              className="shrink-0 rounded-xl bg-slate-800/60 px-3 py-1.5 text-sm text-slate-300 ring-1 ring-white/5 active:scale-95"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
