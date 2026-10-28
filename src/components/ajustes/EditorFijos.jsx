import { useRef, useState } from 'react'
import { Plus, Trash2, Power, X, Upload, Check } from 'lucide-react'
import { useDatos, useCategoriasDe, useMetodosDe } from '../../state/datos'
import { agregarFijo, actualizarFijo, borrarFijo, importarFijos } from '../../db'
import { parseMonto, limpiarInputMonto } from '../../utils/monto'
import { ARS, USD, MONEDAS, formatEn } from '../../utils/moneda'
import { leerArchivoFijos, prepararImportacion } from '../../utils/fijos-import'

// Gastos e ingresos que se repiten todos los meses (alquiler, expensas,
// streaming, sueldo). No se cargan solos: el día que corresponde aparecen en el
// panel para confirmarlos con un toque, así el registro sigue siendo lo que
// realmente pasó y no una suposición.
export default function EditorFijos({ onToast }) {
  const { fijos, categorias, metodos } = useDatos()
  const [creando, setCreando] = useState(false)
  const [importando, setImportando] = useState(null) // { items, errores }
  const archivo = useRef(null)

  const elegirArchivo = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const { fijos: leidos, errores } = leerArchivoFijos(await file.text())
    if (!leidos.length) {
      onToast?.({ msg: errores[0] ?? 'El archivo no tiene fijos', tone: 'error' })
      return
    }
    setImportando({ items: prepararImportacion(leidos, { fijos, categorias, metodos }), errores })
  }

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
                {f.descripcion || f.subcategoria}
                <span className="font-normal text-slate-500">
                  {' '}
                  · {f.descripcion ? f.subcategoria : f.categoria}
                </span>
              </span>
              <span className="block truncate text-xs text-slate-500">
                {formatEn(f.monto, f.moneda)} · {f.metodo}
                {f.debito && ' · débito automático'}
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

      {importando ? (
        <RevisarImportacion
          {...importando}
          onCancelar={() => setImportando(null)}
          onImportar={async (items) => {
            const n = await importarFijos(items)
            setImportando(null)
            onToast?.({ msg: `${n} ${n === 1 ? 'fijo importado' : 'fijos importados'}`, tone: 'ok' })
          }}
        />
      ) : creando ? (
        <FormularioFijo
          onCancelar={() => setCreando(false)}
          onGuardar={async (datos) => {
            await agregarFijo(datos)
            setCreando(false)
            onToast?.({ msg: 'Fijo agregado', tone: 'ok' })
          }}
        />
      ) : (
        <div className="flex gap-2">
          <button
            onClick={() => setCreando(true)}
            className="flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-2xl bg-indigo-500 font-semibold text-white active:scale-95"
          >
            <Plus size={18} /> Agregar fijo
          </button>
          <button
            onClick={() => archivo.current?.click()}
            className="flex min-h-11 items-center justify-center gap-1.5 rounded-2xl bg-slate-800 px-4 font-semibold text-slate-200 active:scale-95"
          >
            <Upload size={16} /> Importar
          </button>
          <input ref={archivo} type="file" accept=".json,application/json" onChange={elegirArchivo} className="hidden" />
        </div>
      )}
    </div>
  )
}

// La lista del archivo antes de guardar: se elige qué entra. Lo que parece repetido viene
// destildado y lo que se va a crear (método, categoría) queda a la vista.
function RevisarImportacion({ items, errores, onImportar, onCancelar }) {
  const [elegidos, setElegidos] = useState(() => items.map((i) => i.incluir))
  const [guardando, setGuardando] = useState(false)
  const n = elegidos.filter(Boolean).length

  return (
    <div className="animate-fade-up space-y-2 rounded-2xl border border-indigo-500/25 bg-slate-900/60 p-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200">Importar fijos</h3>
        <button onClick={onCancelar} className="text-slate-500" aria-label="Cancelar">
          <X size={18} />
        </button>
      </div>
      <ul className="space-y-1.5">
        {items.map((f, i) => {
          const nuevos = [
            f.nuevaCategoria && `categoría ${f.categoria}`,
            !f.nuevaCategoria && f.nuevaSubcategoria && `subcategoría ${f.subcategoria}`,
            f.nuevoMetodo && `método ${f.metodo}`,
          ].filter(Boolean)
          return (
            <li key={i}>
              <button
                onClick={() => setElegidos((e) => e.map((v, j) => (j === i ? !v : v)))}
                className={`flex w-full items-center gap-2 rounded-xl p-2 text-left ${
                  elegidos[i] ? 'bg-slate-800/70' : 'bg-slate-800/20 opacity-60'
                }`}
              >
                <span
                  className={`flex size-6 shrink-0 items-center justify-center rounded-md ${
                    elegidos[i] ? 'bg-emerald-500 text-white' : 'bg-slate-700'
                  }`}
                >
                  {elegidos[i] && <Check size={14} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-slate-200">
                    {f.descripcion || f.subcategoria}
                    <span className="font-normal text-slate-500"> · día {f.diaMes}</span>
                  </span>
                  <span className="block truncate text-xs text-slate-500">
                    {formatEn(f.monto, f.moneda)} · {f.metodo}
                    {f.debito && ' · débito automático'}
                  </span>
                  {(f.yaEsta || nuevos.length > 0) && (
                    <span className="block truncate text-xs text-amber-300/80">
                      {[f.yaEsta && 'ya está cargado', nuevos.length && `nuevo: ${nuevos.join(', ')}`]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  )}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      {errores.length > 0 && (
        <ul className="space-y-0.5 text-xs text-rose-300/80">
          {errores.map((e) => (
            <li key={e}>{e}</li>
          ))}
        </ul>
      )}
      <button
        onClick={async () => {
          setGuardando(true)
          await onImportar(items.map((it, i) => ({ ...it, incluir: elegidos[i] })))
        }}
        disabled={!n || guardando}
        className={`min-h-11 w-full rounded-xl font-bold active:scale-95 ${
          n ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-600'
        }`}
      >
        Importar {n}
      </button>
    </div>
  )
}

function FormularioFijo({ onGuardar, onCancelar }) {
  const [tipo, setTipo] = useState('gasto')
  const [monto, setMonto] = useState('')
  const [moneda, setMoneda] = useState(ARS)
  const [categoria, setCategoria] = useState('')
  const [subcategoria, setSubcategoria] = useState('')
  const [metodo, setMetodo] = useState('')
  const [diaMes, setDiaMes] = useState(1)
  const [descripcion, setDescripcion] = useState('')
  const [debito, setDebito] = useState(false)

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

      <input
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value.slice(0, 60))}
        placeholder="Nombre (Edenor, Claro…)"
        className="min-h-11 w-full rounded-xl border border-slate-700/70 bg-slate-800/60 px-3 text-base text-slate-100 outline-none placeholder:text-slate-600 focus:border-indigo-500"
      />

      <div className="flex gap-2">
        <div className="flex min-h-11 flex-1 items-center rounded-xl bg-slate-800 px-2">
          {/* Un fijo puede ser en dólares: una suscripción, por ejemplo. Al
              confirmarlo cada mes se le aplica la cotización de ese mes. */}
          <div className="flex gap-0.5 rounded-lg bg-slate-900/60 p-0.5">
            {[ARS, USD].map((m) => (
              <button
                key={m}
                onClick={() => setMoneda(m)}
                className={`rounded-md px-1.5 py-1 text-xs font-bold ${
                  moneda === m ? 'bg-slate-700 text-white' : 'text-slate-500'
                }`}
              >
                {MONEDAS[m].corto}
              </button>
            ))}
          </div>
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

      {tipo === 'gasto' && (
        <button
          onClick={() => setDebito((d) => !d)}
          className={`flex min-h-11 w-full items-center gap-2 rounded-xl px-3 text-sm ${
            debito ? 'bg-indigo-500/20 text-indigo-200' : 'bg-slate-800 text-slate-400'
          }`}
        >
          <span
            className={`flex size-5 items-center justify-center rounded-md ${debito ? 'bg-indigo-500 text-white' : 'bg-slate-700'}`}
          >
            {debito && <Check size={13} />}
          </span>
          Débito automático
        </button>
      )}

      <button
        onClick={() =>
          onGuardar({
            tipo,
            monto: montoNum,
            moneda,
            categoria,
            subcategoria,
            metodo,
            descripcion: descripcion.trim(),
            diaMes,
            debito: tipo === 'gasto' && debito,
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
