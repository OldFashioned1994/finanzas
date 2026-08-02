import { useState } from 'react'
import {
  ChevronDown,
  ChevronUp,
  Plus,
  X,
  Trash2,
  Archive,
  ArchiveRestore,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'
import { useDatos } from '../../state/datos'
import {
  agregarCategoria,
  renombrarCategoria,
  actualizarCategoria,
  archivarCategoria,
  borrarCategoria,
  agregarSubcategoria,
  renombrarSubcategoria,
  quitarSubcategoria,
  reordenarCategorias,
} from '../../db'
import { NATURALEZAS } from '../../config'

export default function EditorCategorias({ onToast }) {
  const { categorias, movimientos, grupos } = useDatos()
  const [tipo, setTipo] = useState('gasto')
  const [abierta, setAbierta] = useState(null)
  const [nueva, setNueva] = useState('')

  const delTipo = categorias.filter((c) => c.tipo === tipo)
  const gruposDelTipo = grupos.filter((g) => g.tipo === tipo)

  const usos = (nombre) =>
    movimientos.filter((m) => m.categoria === nombre && m.tipo === tipo).length

  const crear = async () => {
    const nombre = nueva.trim()
    if (!nombre) return
    if (delTipo.some((c) => c.nombre.toLowerCase() === nombre.toLowerCase())) {
      onToast?.({ msg: 'Ya existe una categoría con ese nombre', tone: 'error' })
      return
    }
    const id = await agregarCategoria({ tipo, nombre })
    setNueva('')
    setAbierta(id)
    onToast?.({ msg: 'Categoría creada', tone: 'ok' })
  }

  const mover = async (indice, delta) => {
    const destino = indice + delta
    if (destino < 0 || destino >= delTipo.length) return
    const ids = delTipo.map((c) => c.id)
    ;[ids[indice], ids[destino]] = [ids[destino], ids[indice]]
    await reordenarCategorias(ids)
  }

  const eliminar = async (cat) => {
    const { borrada, usos: n } = await borrarCategoria(cat.id)
    onToast?.(
      borrada
        ? { msg: 'Categoría borrada', tone: 'ok' }
        : {
            msg: `Tiene ${n} movimientos: se archivó en vez de borrarse`,
            tone: 'info',
          },
    )
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-800/50 p-1 ring-1 ring-white/5">
        <TabTipo activo={tipo === 'gasto'} onClick={() => setTipo('gasto')}>
          Gastos
        </TabTipo>
        <TabTipo activo={tipo === 'ingreso'} onClick={() => setTipo('ingreso')}>
          Ingresos
        </TabTipo>
      </div>

      <ul className="space-y-1.5">
        {delTipo.map((cat, i) => (
          <li
            key={cat.id}
            className={`overflow-hidden rounded-2xl border border-white/5 ${
              cat.archivada ? 'bg-slate-900/30 opacity-60' : 'bg-slate-900/50'
            }`}
          >
            <div className="flex items-center gap-2 p-2">
              <input
                value={cat.emoji ?? ''}
                onChange={(e) => actualizarCategoria(cat.id, { emoji: e.target.value.slice(0, 2) })}
                maxLength={2}
                className="size-10 shrink-0 rounded-xl bg-slate-800 text-center text-lg outline-none focus:ring-1 focus:ring-indigo-500"
                aria-label="Emoji"
              />
              <CampoTexto
                valor={cat.nombre}
                onGuardar={async (v) => {
                  const n = await renombrarCategoria(cat.id, v)
                  if (n === -1) {
                    onToast?.({ msg: 'Ya existe una categoría con ese nombre', tone: 'error' })
                  } else if (n) {
                    onToast?.({ msg: `Actualizados ${n} movimientos`, tone: 'ok' })
                  }
                }}
                className="min-w-0 flex-1"
              />
              <button
                onClick={() => setAbierta(abierta === cat.id ? null : cat.id)}
                className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-slate-400 active:scale-95"
              >
                {abierta === cat.id ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
              </button>
            </div>

            {abierta === cat.id && (
              <div className="animate-fade-up space-y-2 border-t border-white/5 bg-slate-800/30 p-2.5">
                <p className="text-xs font-medium text-slate-400">Subcategorías</p>
                <ul className="flex flex-wrap gap-1.5">
                  {cat.subcategorias.map((sub) => (
                    <li
                      key={sub}
                      className="flex items-center gap-1 rounded-xl bg-slate-800 py-1 pl-2.5 pr-1"
                    >
                      <CampoTexto
                        valor={sub}
                        onGuardar={(v) => renombrarSubcategoria(cat.id, sub, v)}
                        className="w-auto"
                        estiloChip
                      />
                      <button
                        onClick={() => quitarSubcategoria(cat.id, sub)}
                        className="flex size-6 items-center justify-center rounded-lg text-slate-500 active:bg-slate-700"
                        aria-label={`Quitar ${sub}`}
                      >
                        <X size={13} />
                      </button>
                    </li>
                  ))}
                </ul>
                <AgregarInline
                  placeholder="Nueva subcategoría"
                  onAgregar={(v) => agregarSubcategoria(cat.id, v)}
                />

                {/* A qué grupo pertenece y de qué naturaleza es: los dos
                    campos que alimentan la lectura gruesa del panel. */}
                <div className="grid grid-cols-2 gap-2 border-t border-white/5 pt-2">
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-slate-400">Grupo</span>
                    <select
                      value={cat.grupo ?? ''}
                      onChange={(e) => actualizarCategoria(cat.id, { grupo: e.target.value })}
                      className="min-h-10 w-full rounded-xl border border-slate-700/70 bg-slate-800/60 px-2 text-sm text-slate-100 outline-none focus:border-indigo-500"
                    >
                      {gruposDelTipo.map((g) => (
                        <option key={g.id} value={g.nombre}>
                          {g.emoji} {g.nombre}
                        </option>
                      ))}
                      {cat.grupo && !gruposDelTipo.some((g) => g.nombre === cat.grupo) && (
                        <option value={cat.grupo}>{cat.grupo}</option>
                      )}
                    </select>
                  </label>

                  {tipo === 'gasto' && (
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium text-slate-400">
                        Naturaleza
                      </span>
                      <select
                        value={cat.naturaleza ?? 'otros'}
                        onChange={(e) =>
                          actualizarCategoria(cat.id, { naturaleza: e.target.value })
                        }
                        className="min-h-10 w-full rounded-xl border border-slate-700/70 bg-slate-800/60 px-2 text-sm text-slate-100 outline-none focus:border-indigo-500"
                      >
                        {Object.entries(NATURALEZAS).map(([clave, n]) => (
                          <option key={clave} value={clave}>
                            {n.nombre}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5 border-t border-white/5 pt-2">
                  <BotonChico onClick={() => mover(i, -1)} disabled={i === 0} Icon={ArrowUp}>
                    Subir
                  </BotonChico>
                  <BotonChico
                    onClick={() => mover(i, 1)}
                    disabled={i === delTipo.length - 1}
                    Icon={ArrowDown}
                  >
                    Bajar
                  </BotonChico>
                  <BotonChico
                    onClick={() => archivarCategoria(cat.id, !cat.archivada)}
                    Icon={cat.archivada ? ArchiveRestore : Archive}
                  >
                    {cat.archivada ? 'Reactivar' : 'Archivar'}
                  </BotonChico>
                  <BotonChico onClick={() => eliminar(cat)} Icon={Trash2} tono="rose">
                    Borrar
                  </BotonChico>
                  <span className="ml-auto text-xs text-slate-500">{usos(cat.nombre)} mov.</span>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      <div className="flex gap-2">
        <input
          value={nueva}
          onChange={(e) => setNueva(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && crear()}
          placeholder="Nueva categoría"
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
        Al renombrar, los movimientos ya cargados se actualizan solos. Una categoría con historial no
        se borra: se archiva, deja de aparecer al cargar y sigue contando en el panel.
      </p>
    </div>
  )
}

// Input que solo escribe en la base cuando terminás de editar (blur o Enter),
// para no disparar una migración de movimientos por cada tecla.
export function CampoTexto({ valor, onGuardar, className = '', estiloChip, etiqueta = 'Nombre' }) {
  const [texto, setTexto] = useState(valor)
  const [editando, setEditando] = useState(false)

  const confirmar = () => {
    setEditando(false)
    const limpio = texto.trim()
    if (limpio && limpio !== valor) onGuardar(limpio)
    else setTexto(valor)
  }

  return (
    <input
      value={editando ? texto : valor}
      aria-label={etiqueta}
      onChange={(e) => setTexto(e.target.value)}
      onFocus={() => {
        setTexto(valor)
        setEditando(true)
      }}
      onBlur={confirmar}
      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
      className={`bg-transparent text-slate-100 outline-none ${
        estiloChip
          ? 'w-24 text-sm'
          : 'min-h-10 rounded-xl px-2 text-base focus:bg-slate-800 focus:ring-1 focus:ring-indigo-500'
      } ${className}`}
      size={estiloChip ? Math.max(valor.length, 4) : undefined}
    />
  )
}

export function AgregarInline({ placeholder, onAgregar }) {
  const [texto, setTexto] = useState('')
  const confirmar = () => {
    const v = texto.trim()
    if (!v) return
    onAgregar(v)
    setTexto('')
  }
  return (
    <div className="flex gap-1.5">
      <input
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && confirmar()}
        placeholder={placeholder}
        className="min-h-10 flex-1 rounded-xl border border-slate-700/70 bg-slate-800/60 px-3 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-indigo-500"
      />
      <button
        onClick={confirmar}
        className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-700 text-slate-200 active:scale-95"
      >
        <Plus size={17} />
      </button>
    </div>
  )
}

function TabTipo({ activo, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`min-h-10 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
        activo ? 'bg-indigo-500 text-white' : 'text-slate-400'
      }`}
    >
      {children}
    </button>
  )
}

function BotonChico({ onClick, disabled, Icon, children, tono = 'slate' }) {
  const clases =
    tono === 'rose'
      ? 'bg-rose-500/10 text-rose-300'
      : 'bg-slate-800 text-slate-300 disabled:opacity-30'
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex min-h-9 items-center gap-1 rounded-xl px-2.5 text-xs font-semibold active:scale-95 ${clases}`}
    >
      <Icon size={13} /> {children}
    </button>
  )
}
