import { useState } from 'react'
import { Plus, Trash2, Power, X, ClipboardPaste } from 'lucide-react'
import { useDatos, useGruposDe } from '../../state/datos'
import { agregarLineaPlan, actualizarLineaPlan, borrarLineaPlan } from '../../db'
import { parseMonto, limpiarInputMonto } from '../../utils/monto'
import { resumenPlan } from '../../utils/calc'
import { ARS, USD, MONEDAS, formatEn, formatRedondoEn } from '../../utils/moneda'
import { formatPct } from '../../utils/format'

// El ejercicio teórico: cuánto esperás que entre y cuánto que salga cada mes.
// No son movimientos — no tocan ningún total de lo real.
export default function EditorPlan({ onToast }) {
  const { plan, conversor, ajustes } = useDatos()
  const [creando, setCreando] = useState(null) // 'ingreso' | 'gasto' | null
  const [pegando, setPegando] = useState(null)

  const monedaVista = ajustes.monedaPanel === USD ? USD : ARS
  const r = resumenPlan(plan, conversor, monedaVista)

  const ingresos = plan.filter((l) => l.tipo === 'ingreso')
  const gastos = plan.filter((l) => l.tipo === 'gasto')

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-800/40 p-3 text-center">
        <div>
          <p className="text-xs text-slate-400">Entra</p>
          <p className="mt-0.5 truncate text-sm font-bold tabular-nums text-emerald-400">
            {formatRedondoEn(r.ingresos, monedaVista)}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Sale</p>
          <p className="mt-0.5 truncate text-sm font-bold tabular-nums text-rose-400">
            {formatRedondoEn(r.gastos, monedaVista)}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-400">Queda</p>
          <p
            className={`mt-0.5 truncate text-sm font-bold tabular-nums ${
              r.excedido ? 'text-rose-400' : 'text-indigo-300'
            }`}
          >
            {formatRedondoEn(r.disponible, monedaVista)}
          </p>
        </div>
      </div>

      <Bloque
        titulo="Ingresos"
        lineas={ingresos}
        creando={creando === 'ingreso'}
        onCrear={() => setCreando('ingreso')}
        onCancelar={() => setCreando(null)}
        pegando={pegando === 'ingreso'}
        onPegar={() => setPegando('ingreso')}
        onCerrarPegar={() => setPegando(null)}
        tipo="ingreso"
        total={r.ingresos}
        monedaVista={monedaVista}
        onToast={onToast}
      />

      <Bloque
        titulo="Gastos fijos"
        lineas={gastos}
        creando={creando === 'gasto'}
        onCrear={() => setCreando('gasto')}
        onCancelar={() => setCreando(null)}
        pegando={pegando === 'gasto'}
        onPegar={() => setPegando('gasto')}
        onCerrarPegar={() => setPegando(null)}
        tipo="gasto"
        total={r.gastos}
        monedaVista={monedaVista}
        onToast={onToast}
        base={r.ingresos}
      />
    </div>
  )
}

function Bloque({
  titulo,
  lineas,
  creando,
  onCrear,
  onCancelar,
  tipo,
  total,
  monedaVista,
  onToast,
  base,
  pegando,
  onPegar,
  onCerrarPegar,
}) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between px-1">
        <h3 className="text-sm font-semibold text-slate-200">{titulo}</h3>
        <span className="text-sm font-semibold tabular-nums text-slate-400">
          {formatRedondoEn(total, monedaVista)}
        </span>
      </div>

      <ul className="space-y-1.5">
        {lineas.map((l) => (
          <Linea key={l.id} linea={l} base={base} onToast={onToast} />
        ))}
      </ul>

      {creando && (
        <div className="mt-2">
          <Formulario tipo={tipo} onCancelar={onCancelar} onToast={onToast} />
        </div>
      )}

      {pegando && (
        <div className="mt-2">
          <Pegar tipo={tipo} onCerrar={onCerrarPegar} onToast={onToast} />
        </div>
      )}

      {!creando && !pegando && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            onClick={onCrear}
            className="flex min-h-11 items-center justify-center gap-1.5 rounded-2xl bg-slate-800/70 text-sm font-semibold text-slate-200 active:scale-95"
          >
            <Plus size={17} /> Agregar
          </button>
          <button
            onClick={onPegar}
            className="flex min-h-11 items-center justify-center gap-1.5 rounded-2xl bg-slate-800/70 text-sm font-semibold text-slate-200 active:scale-95"
          >
            <ClipboardPaste size={16} /> Pegar
          </button>
        </div>
      )}
    </div>
  )
}

function Linea({ linea, base, onToast }) {
  const moneda = linea.moneda ?? ARS
  const pct = base > 0 ? linea.monto / base : null

  return (
    <li
      className={`flex items-center gap-2 rounded-2xl border border-white/5 p-2 ${
        linea.activo ? 'bg-slate-900/50' : 'bg-slate-900/30 opacity-60'
      }`}
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-slate-200">{linea.concepto}</span>
        {linea.grupo && (
          <span className="block truncate text-xs text-slate-500">{linea.grupo}</span>
        )}
      </span>
      <span className="shrink-0 text-right">
        <span className="block text-sm font-semibold tabular-nums text-slate-100">
          {formatEn(linea.monto, moneda)}
        </span>
        {pct != null && (
          <span className="block text-xs tabular-nums text-slate-500">{formatPct(pct, 1)}</span>
        )}
      </span>
      <button
        onClick={() => actualizarLineaPlan(linea.id, { activo: linea.activo ? 0 : 1 })}
        className={`flex size-9 shrink-0 items-center justify-center rounded-xl active:scale-95 ${
          linea.activo ? 'bg-emerald-500/15 text-emerald-300' : 'bg-slate-800 text-slate-500'
        }`}
        aria-label={linea.activo ? 'Desactivar' : 'Activar'}
      >
        <Power size={15} />
      </button>
      <button
        onClick={async () => {
          await borrarLineaPlan(linea.id)
          onToast?.({ msg: 'Línea borrada', tone: 'info' })
        }}
        className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-300 active:scale-95"
        aria-label="Borrar"
      >
        <Trash2 size={15} />
      </button>
    </li>
  )
}

// Carga varias líneas de una. Formato por línea: concepto, monto, grupo.
// Tolera coma, punto y coma o tabulación, el símbolo $ y los puntos de miles.
export function parsearLineasPlan(texto, gruposValidos = []) {
  const filas = []
  const ignoradas = []

  for (const cruda of texto.split('\n')) {
    const linea = cruda.trim()
    if (!linea) continue

    const partes = linea.split(/[\t;,]+/).map((p) => p.trim())
    const concepto = partes[0]
    // El monto puede venir en cualquier columna: se toma la primera que sea un
    // número, así no importa si pegaste "ALQUILER, 600000" o "600000, ALQUILER".
    let monto = NaN
    let iMonto = -1
    for (let i = 0; i < partes.length; i++) {
      const n = Number(partes[i].replace(/[$\s.]/g, '').replace(',', '.'))
      if (Number.isFinite(n) && n > 0 && /\d/.test(partes[i])) {
        monto = n
        iMonto = i
        break
      }
    }
    if (!concepto || !Number.isFinite(monto)) {
      ignoradas.push(linea)
      continue
    }

    const resto = partes.filter((_, i) => i !== 0 && i !== iMonto)
    const pedido = resto.join(' ').trim().toLowerCase()
    const grupo =
      gruposValidos.find((g) => g.toLowerCase() === pedido) ??
      gruposValidos.find((g) => pedido && g.toLowerCase().startsWith(pedido)) ??
      ''

    filas.push({ concepto: iMonto === 0 ? partes[1] || concepto : concepto, monto, grupo })
  }

  return { filas, ignoradas }
}

function Pegar({ tipo, onCerrar, onToast }) {
  const [texto, setTexto] = useState('')
  const grupos = useGruposDe(tipo)
  const nombres = grupos.map((g) => g.nombre)
  const { filas, ignoradas } = parsearLineasPlan(texto, nombres)

  const guardar = async () => {
    if (!filas.length) return
    for (const f of filas) {
      await agregarLineaPlan({
        tipo,
        concepto: f.concepto,
        monto: f.monto,
        moneda: ARS,
        grupo: f.grupo || nombres.at(-1) || '',
      })
    }
    onCerrar()
    onToast?.({ msg: filas.length + ' líneas agregadas', tone: 'ok' })
  }

  return (
    <div className="animate-fade-up space-y-2 rounded-2xl border border-indigo-500/25 bg-slate-900/60 p-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold capitalize text-slate-200">Pegar {tipo}s</h4>
        <button onClick={onCerrar} className="text-slate-500" aria-label="Cancelar">
          <X size={18} />
        </button>
      </div>

      <textarea
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        rows={6}
        autoFocus
        placeholder={'ALQUILER, 600000, Vivienda\nLUZ, 150000, Vivienda'}
        className="w-full rounded-xl border border-slate-700/70 bg-slate-800/60 p-3 font-mono text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-indigo-500"
        aria-label="Líneas a pegar"
      />

      {filas.length > 0 && (
        <ul className="max-h-40 space-y-1 overflow-y-auto">
          {filas.map((f, i) => (
            <li key={i} className="flex items-center gap-2 rounded-lg bg-slate-800/40 px-2 py-1 text-xs">
              <span className="min-w-0 flex-1 truncate text-slate-300">{f.concepto}</span>
              <span className="shrink-0 tabular-nums text-slate-200">
                {formatEn(f.monto, ARS)}
              </span>
              <span className="w-28 shrink-0 truncate text-right text-slate-500">
                {f.grupo || '—'}
              </span>
            </li>
          ))}
        </ul>
      )}

      {ignoradas.length > 0 && (
        <p className="text-xs text-amber-300">
          {ignoradas.length} línea{ignoradas.length === 1 ? '' : 's'} sin monto: {ignoradas[0]}
        </p>
      )}

      <button
        onClick={guardar}
        disabled={!filas.length}
        className={`min-h-11 w-full rounded-xl font-bold active:scale-95 ${
          filas.length ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-600'
        }`}
      >
        Agregar {filas.length || ''}
      </button>
    </div>
  )
}

function Formulario({ tipo, onCancelar, onToast }) {
  const [concepto, setConcepto] = useState('')
  const [monto, setMonto] = useState('')
  const [moneda, setMoneda] = useState(ARS)
  const grupos = useGruposDe(tipo)
  const [grupo, setGrupo] = useState('')

  const montoNum = parseMonto(monto)
  const valido = concepto.trim() && Number.isFinite(montoNum) && montoNum > 0

  const guardar = async () => {
    if (!valido) return
    await agregarLineaPlan({
      tipo,
      concepto: concepto.trim(),
      monto: montoNum,
      moneda,
      grupo: grupo || grupos[0]?.nombre || '',
    })
    onCancelar()
    onToast?.({ msg: 'Línea agregada', tone: 'ok' })
  }

  return (
    <div className="animate-fade-up space-y-2 rounded-2xl border border-indigo-500/25 bg-slate-900/60 p-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold capitalize text-slate-200">{tipo}</h4>
        <button onClick={onCancelar} className="text-slate-500" aria-label="Cancelar">
          <X size={18} />
        </button>
      </div>

      <input
        value={concepto}
        onChange={(e) => setConcepto(e.target.value)}
        placeholder={tipo === 'gasto' ? 'Alquiler' : 'Sueldo'}
        className="min-h-11 w-full rounded-xl border border-slate-700/70 bg-slate-800/60 px-3 text-base text-slate-100 outline-none placeholder:text-slate-600 focus:border-indigo-500"
        aria-label="Concepto"
      />

      <div className="flex gap-2">
        <div className="flex min-h-11 flex-1 items-center rounded-xl bg-slate-800 px-2">
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
            placeholder="0"
            className="w-full bg-transparent px-2 text-base tabular-nums text-slate-100 outline-none placeholder:text-slate-600"
            aria-label="Monto"
          />
        </div>
      </div>

      <select
        value={grupo}
        onChange={(e) => setGrupo(e.target.value)}
        className="min-h-11 w-full rounded-xl border border-slate-700/70 bg-slate-800/60 px-3 text-base text-slate-100 outline-none focus:border-indigo-500"
        aria-label="Grupo"
      >
        <option value="">Grupo…</option>
        {grupos.map((g) => (
          <option key={g.id} value={g.nombre}>
            {g.emoji} {g.nombre}
          </option>
        ))}
      </select>

      <button
        onClick={guardar}
        disabled={!valido}
        className={`min-h-11 w-full rounded-xl font-bold active:scale-95 ${
          valido ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-600'
        }`}
      >
        Guardar
      </button>
    </div>
  )
}
