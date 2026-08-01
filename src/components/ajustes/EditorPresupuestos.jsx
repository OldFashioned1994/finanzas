import { useMemo, useState } from 'react'
import { Wand2 } from 'lucide-react'
import { useDatos } from '../../state/datos'
import { definirPresupuesto } from '../../db'
import { parseMonto, limpiarInputMonto } from '../../utils/monto'
import { formatMonto, formatCorto, mesActualISO } from '../../utils/format'
import { sumarMeses } from '../../utils/calc'

export default function EditorPresupuestos({ onToast }) {
  const { categorias, presupuestos, movimientos } = useDatos()
  const [borrador, setBorrador] = useState({})

  const deGasto = categorias.filter((c) => c.tipo === 'gasto' && !c.archivada)
  const montoDe = (nombre) => presupuestos.find((p) => p.categoria === nombre)?.monto ?? 0

  // Promedio real de los últimos 3 meses cerrados: sirve como punto de partida
  // realista en vez de inventar un número.
  const promedios = useMemo(() => {
    const mesActual = mesActualISO()
    const desde = `${sumarMeses(mesActual, -3)}-01`
    const hasta = `${mesActual}-01`
    const mapa = new Map()
    for (const m of movimientos) {
      if (m.tipo !== 'gasto' || m.fecha < desde || m.fecha >= hasta) continue
      mapa.set(m.categoria, (mapa.get(m.categoria) ?? 0) + m.monto)
    }
    return new Map([...mapa.entries()].map(([k, v]) => [k, v / 3]))
  }, [movimientos])

  const guardar = async (nombre, texto) => {
    const n = parseMonto(texto)
    await definirPresupuesto(nombre, Number.isFinite(n) ? n : 0)
    setBorrador((b) => ({ ...b, [nombre]: undefined }))
  }

  const sugerirTodos = async () => {
    let aplicados = 0
    for (const [nombre, prom] of promedios) {
      if (prom > 0 && !montoDe(nombre)) {
        await definirPresupuesto(nombre, Math.round(prom / 100) * 100)
        aplicados++
      }
    }
    onToast?.({
      msg: aplicados ? `${aplicados} presupuestos sugeridos` : 'No hay historial suficiente',
      tone: aplicados ? 'ok' : 'info',
    })
  }

  const total = presupuestos.reduce((s, p) => s + p.monto, 0)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 rounded-2xl bg-slate-800/40 p-3">
        <div>
          <p className="text-xs text-slate-400">Total presupuestado por mes</p>
          <p className="text-lg font-bold tabular-nums text-slate-100">{formatMonto(total)}</p>
        </div>
        <button
          onClick={sugerirTodos}
          className="flex min-h-10 items-center gap-1.5 rounded-xl bg-indigo-500/20 px-3 text-sm font-semibold text-indigo-200 active:scale-95"
        >
          <Wand2 size={15} /> Sugerir
        </button>
      </div>

      <ul className="space-y-1.5">
        {deGasto.map((cat) => {
          const guardado = montoDe(cat.nombre)
          const valor =
            borrador[cat.nombre] !== undefined
              ? borrador[cat.nombre]
              : guardado
                ? String(guardado).replace('.', ',')
                : ''
          const prom = promedios.get(cat.nombre) ?? 0
          return (
            <li
              key={cat.id}
              className="flex items-center gap-2 rounded-2xl border border-white/5 bg-slate-900/50 p-2"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-lg">
                {cat.emoji}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-slate-200">
                  {cat.nombre}
                </span>
                {prom > 0 && (
                  <button
                    onClick={() => guardar(cat.nombre, String(Math.round(prom / 100) * 100))}
                    className="text-xs text-slate-500 active:text-indigo-300"
                  >
                    promedio {formatCorto(prom)} · usar
                  </button>
                )}
              </span>
              <div className="flex min-h-10 w-28 shrink-0 items-center rounded-xl bg-slate-800 px-2">
                <span className="text-sm text-slate-500">$</span>
                <input
                  value={valor}
                  inputMode="decimal"
                  onChange={(e) =>
                    setBorrador((b) => ({ ...b, [cat.nombre]: limpiarInputMonto(e.target.value) }))
                  }
                  onBlur={(e) => guardar(cat.nombre, e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                  placeholder="—"
                  className="w-full bg-transparent px-1 text-right text-base tabular-nums text-slate-100 outline-none placeholder:text-slate-600"
                />
              </div>
            </li>
          )
        })}
      </ul>

      <p className="text-xs leading-relaxed text-slate-500">
        Los presupuestos son mensuales y se muestran en el panel con un semáforo. La marca blanca
        sobre la barra indica el ritmo esperado a esta altura del mes.
      </p>
    </div>
  )
}
