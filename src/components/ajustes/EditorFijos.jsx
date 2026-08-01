import { useState } from 'react'
import { Plus, Trash2, Power, X } from 'lucide-react'
import { useDatos, useCategoriasDe, useMetodosDe } from '../../state/datos'
import { agregarFijo, actualizarFijo, borrarFijo } from '../../db'
import { parseMonto, limpiarInputMonto } from '../../utils/monto'
import { formatMonto } from '../../utils/format'

// Gastos e ingresos que se repiten todos los meses (alquiler, expensas,
// streaming, sueldo). No se cargan solos: el día que corresponde aparecen en el
// panel para confirmarlos con un toque, así el registro sigue siendo lo que
// realmente pasó y no una suposición.
export default function EditorFijos({ onToast }) {
  const { fijos } = useDatos()
  const [creando, setCreando] = useState(false)

  return (
    <div className="space-y-3">
      <ul className="space-y-1.5">
        {fijos.length === 0 && !creando && (
          <li className="rounded-2xl bg-slate-800/30 p-4 text-center text-sm text-slate-500">
            Todavía no cargaste ningún fijo.
          </li>
        )}
        {fijos.map((f) => (
          <li
            key={f.id}
            className={`flex items-center gap-2 rounded-2xl border border-white/5 p-2 ${
              f.activo ? 'bg-slate-900/50' : 'bg-slate-900/30 opacity-60'
            }`}
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-sm font-bold text-slate-300">
              {f.diaMes}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-slate-200">
                {f.subcategoria}
                <span className="font-normal text-slate-500"> · {f.categoria}</span>
              </span>
              <span className="block truncate text-xs text-slate-500">
                {formatMonto(f.monto)} · {f.metodo}
                {f.ultimoMes && ` · último ${f.ultimoMes}`}
              </span>
            </span>
            <button
              onClick={() => actualizarFijo(f.id, { activo: f.activo ? 0 : 1 })}
              className={`flex size-9 shrink-0 items-center justify-center rounded-xl active:scale-95 ${
                f.activo ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-800 text-slate-500'
              }`}
              aria-label={f.activo ? 'Desactivar' : 'Activar'}
            >
              <Power size={16} />
            </button>
            <button
              onClick={async () => {
                await borrarFijo(f.id)
                onToast?.({ msg: 'Fijo eliminado', tone: 'info' })
              }}
              className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-300 active:scale-95"
              aria-label="Borrar"
            >
              <Trash2 size={16} />
            </button>
          </li>
        ))}
      </ul>

      {creando ? (
        <FormularioFijo
          onCancelar={() => setCreando(false)}
          onGuardar={async (datos) => {
            await agregarFijo(datos)
            setCreando(false)
            onToast?.({ msg: 'Fijo agregado', tone: 'ok' })
          }}
        />
      ) : (
        <button
          onClick={() => setCreando(true)}
          className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-2xl bg-indigo-500 font-semibold text-white active:scale-95"
        >
          <Plus size={18} /> Agregar fijo
        </button>
      )}
    </div>
  )
}

function FormularioFijo({ onGuardar, onCancelar }) {
  const [tipo, setTipo] = useState('gasto')
  const [monto, setMonto] = useState('')
  const [categoria, setCategoria] = useState('')
  const [subcategoria, setSubcategoria] = useState('')
  const [metodo, setMetodo] = useState('')
  const [diaMes, setDiaMes] = useState(1)

  const categorias = useCategoriasDe(tipo)
  const metodos = useMetodosDe(tipo)
  const subs = categorias.find((c) => c.nombre === categoria)?.subcategorias ?? []

  const montoNum = parseMonto(monto)
  const completo = Number.isFinite(montoNum) && montoNum > 0 && categoria && subcategoria && metodo

  const selectCls =
    'min-h-11 w-full rounded-xl border border-slate-700/70 bg-slate-800/60 px-3 text-base text-slate-100 outline-none focus:border-indigo-500'

  return (
    <div className="animate-fade-up space-y-2 rounded-2xl border border-indigo-500/25 bg-slate-900/60 p-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200">Nuevo fijo</h3>
        <button onClick={onCancelar} className="text-slate-500">
          <X size={18} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-800/50 p-1">
        {['gasto', 'ingreso'].map((t) => (
          <button
            key={t}
            onClick={() => {
              setTipo(t)
              setCategoria('')
              setSubcategoria('')
              setMetodo('')
            }}
            className={`min-h-9 rounded-lg text-sm font-semibold capitalize ${
              tipo === t ? 'bg-indigo-500 text-white' : 'text-slate-400'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <div className="flex min-h-11 flex-1 items-center rounded-xl bg-slate-800 px-3">
          <span className="text-slate-500">$</span>
          <input
            value={monto}
            inputMode="decimal"
            onChange={(e) => setMonto(limpiarInputMonto(e.target.value))}
            placeholder="Monto"
            className="w-full bg-transparent px-2 text-base tabular-nums text-slate-100 outline-none placeholder:text-slate-600"
          />
        </div>
        <label className="flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl bg-slate-800 px-3 text-sm text-slate-400">
          día
          <input
            type="number"
            min="1"
            max="31"
            value={diaMes}
            onChange={(e) => setDiaMes(Math.min(31, Math.max(1, Number(e.target.value) || 1)))}
            className="w-10 bg-transparent text-center text-base text-slate-100 outline-none"
          />
        </label>
      </div>

      <select
        value={categoria}
        onChange={(e) => {
          setCategoria(e.target.value)
          setSubcategoria('')
        }}
        className={selectCls}
      >
        <option value="">Categoría…</option>
        {categorias.map((c) => (
          <option key={c.id} value={c.nombre}>
            {c.nombre}
          </option>
        ))}
      </select>

      <select
        value={subcategoria}
        onChange={(e) => setSubcategoria(e.target.value)}
        disabled={!categoria}
        className={selectCls}
      >
        <option value="">Subcategoría…</option>
        {subs.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      <select value={metodo} onChange={(e) => setMetodo(e.target.value)} className={selectCls}>
        <option value="">{tipo === 'gasto' ? 'Método de pago…' : 'Dónde entra…'}</option>
        {metodos.map((m) => (
          <option key={m.id} value={m.nombre}>
            {m.nombre}
          </option>
        ))}
      </select>

      <button
        onClick={() =>
          onGuardar({
            tipo,
            monto: montoNum,
            categoria,
            subcategoria,
            metodo,
            descripcion: '',
            diaMes,
          })
        }
        disabled={!completo}
        className={`min-h-11 w-full rounded-xl font-bold active:scale-95 ${
          completo ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-600'
        }`}
      >
        Guardar fijo
      </button>
    </div>
  )
}
