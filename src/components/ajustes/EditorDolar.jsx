import { useMemo, useState } from 'react'
import { CircleDollarSign, Check } from 'lucide-react'
import { useDatos } from '../../state/datos'
import { setCotizacion, setAjuste } from '../../db'
import { parseMonto, limpiarInputMonto } from '../../utils/monto'
import { nombreMes, mesActualISO } from '../../utils/format'
import { USD, formatTC } from '../../utils/moneda'
import { sumarMeses } from '../../utils/calc'

// Cotizaciones del dólar, a mano. La app no llama a internet: el número lo
// ponés vos, con el dólar que uses (blue, MEP, tarjeta). Con una por mes alcanza
// para que todo el histórico se pueda leer en dólares.
export default function EditorDolar({ onToast }) {
  const { movimientos, cotizaciones, ajustes, conversor } = useDatos()
  const [borrador, setBorrador] = useState({})
  const [referencia, setReferencia] = useState(
    ajustes.tcReferencia ? String(ajustes.tcReferencia).replace('.', ',') : '',
  )

  // Meses a mostrar: los que tienen movimientos, más los últimos 12, para poder
  // adelantarse a cargar el del mes en curso.
  const meses = useMemo(() => {
    const set = new Set(movimientos.map((m) => m.fecha.slice(0, 7)))
    const actual = mesActualISO()
    for (let i = 0; i < 12; i++) set.add(sumarMeses(actual, -i))
    return [...set].sort().reverse().slice(0, 24)
  }, [movimientos])

  const valorDe = (mes) => cotizaciones.find((c) => c.mes === mes)?.valor ?? 0

  // Cuántos movimientos en dólares hay por mes, para saber cuáles importan.
  const enDolaresPorMes = useMemo(() => {
    const mapa = new Map()
    for (const m of movimientos) {
      if (m.moneda !== USD) continue
      const k = m.fecha.slice(0, 7)
      mapa.set(k, (mapa.get(k) ?? 0) + 1)
    }
    return mapa
  }, [movimientos])

  const guardarMes = async (mes, texto) => {
    const n = parseMonto(texto)
    await setCotizacion(mes, Number.isFinite(n) ? n : 0)
    setBorrador((b) => ({ ...b, [mes]: undefined }))
  }

  const guardarReferencia = async () => {
    const n = parseMonto(referencia)
    await setAjuste('tcReferencia', Number.isFinite(n) && n > 0 ? n : 0)
    onToast?.({ msg: 'Cotización de referencia guardada', tone: 'ok' })
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-slate-800/40 p-3">
        <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-100">
          <CircleDollarSign size={16} className="text-emerald-300" /> Cotización de referencia
        </p>
        <div className="flex gap-2">
          <div className="flex min-h-11 flex-1 items-center rounded-xl bg-slate-900/60 px-3">
            <span className="text-slate-500">$</span>
            <input
              value={referencia}
              inputMode="decimal"
              onChange={(e) => setReferencia(limpiarInputMonto(e.target.value))}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
              onBlur={guardarReferencia}
              placeholder="1310"
              className="w-full bg-transparent px-2 text-base font-semibold tabular-nums text-slate-100 outline-none placeholder:text-slate-600"
              aria-label="Cotización de referencia"
            />
          </div>
          <button
            onClick={guardarReferencia}
            className="flex min-h-11 shrink-0 items-center gap-1 rounded-xl bg-indigo-500 px-4 font-semibold text-white active:scale-95"
          >
            <Check size={17} /> Guardar
          </button>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-slate-500">
          Es la que se propone al cargar un gasto en dólares y la que se usa para los meses que no
          tengan una propia. Poné el dólar que uses vos (blue, MEP, tarjeta): la app no lo busca en
          internet.
        </p>
      </div>

      <div>
        <p className="mb-2 px-1 text-sm font-semibold text-slate-100">Cotización mes a mes</p>
        <ul className="space-y-1.5">
          {meses.map((mes) => {
            const guardado = valorDe(mes)
            const valor =
              borrador[mes] !== undefined
                ? borrador[mes]
                : guardado
                  ? String(guardado).replace('.', ',')
                  : ''
            const enDolares = enDolaresPorMes.get(mes) ?? 0
            const heredado = !guardado ? conversor.tcDeMes(mes) : 0
            return (
              <li
                key={mes}
                className="flex items-center gap-2 rounded-2xl border border-white/5 bg-slate-900/50 p-2"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-slate-200">
                    {nombreMes(mes)}
                  </span>
                  <span className="block truncate text-xs text-slate-500">
                    {enDolares > 0
                      ? `${enDolares} movimiento${enDolares === 1 ? '' : 's'} en US$`
                      : heredado > 0
                        ? `usa ${formatTC(heredado)}`
                        : 'sin cotización'}
                  </span>
                </span>
                <div className="flex min-h-10 w-28 shrink-0 items-center rounded-xl bg-slate-800 px-2">
                  <span className="text-sm text-slate-500">$</span>
                  <input
                    value={valor}
                    inputMode="decimal"
                    onChange={(e) =>
                      setBorrador((b) => ({ ...b, [mes]: limpiarInputMonto(e.target.value) }))
                    }
                    onBlur={(e) => guardarMes(mes, e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                    placeholder="—"
                    className="w-full bg-transparent px-1 text-right text-base tabular-nums text-slate-100 outline-none placeholder:text-slate-600"
                    aria-label={`Cotización de ${nombreMes(mes)}`}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      </div>

      <p className="text-xs leading-relaxed text-slate-500">
        Cada gasto en dólares guarda su propia cotización al cargarlo, así que estos valores solo se
        usan para los movimientos que no tengan una. Un mes sin cotización toma la del mes anterior
        más cercano.
      </p>
    </div>
  )
}
