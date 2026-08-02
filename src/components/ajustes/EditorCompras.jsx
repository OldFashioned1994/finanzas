import { Trash2, Scissors } from 'lucide-react'
import { useMemo } from 'react'
import { useDatos } from '../../state/datos'
import { cancelarCompra, borrarCompra } from '../../db'
import { deudaEnCuotas } from '../../utils/fondos'
import { hoyISO, formatFecha, nombreMes } from '../../utils/format'
import { formatEn, formatRedondoEn } from '../../utils/moneda'

// Las compras financiadas ya generaron todas sus cuotas al crearse. Acá se ve
// cuánto queda por pagar y se pueden dar de baja.
export default function EditorCompras({ onToast }) {
  const { movimientos, compras } = useDatos()
  const deuda = useMemo(() => deudaEnCuotas(movimientos, compras), [movimientos, compras])

  const cancelar = async (compra) => {
    if (
      !window.confirm(
        `¿Cancelar las cuotas que faltan de "${compra.descripcion}"? Las ya vencidas quedan en el historial.`,
      )
    ) {
      return
    }
    const n = await cancelarCompra(compra.id, hoyISO())
    onToast?.({ msg: `${n} cuotas canceladas`, tone: 'ok' })
  }

  const eliminar = async (compra) => {
    if (!window.confirm(`¿Borrar "${compra.descripcion}" y TODAS sus cuotas, incluso las pagadas?`)) {
      return
    }
    await borrarCompra(compra.id)
    onToast?.({ msg: 'Compra borrada', tone: 'info' })
  }

  if (deuda.detalle.length === 0) {
    return (
      <p className="rounded-2xl bg-slate-800/30 p-4 text-center text-sm text-slate-500">
        No tenés compras en cuotas pendientes. Se crean desde la pantalla de carga, eligiendo la
        cantidad de cuotas.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-amber-500/10 p-3">
        <p className="text-xs text-amber-200/80">Total que falta pagar</p>
        <p className="mt-0.5 text-2xl font-bold tabular-nums text-amber-300">
          {formatRedondoEn(deuda.total)}
        </p>
      </div>

      {deuda.porMes.length > 0 && (
        <div>
          <p className="mb-1.5 px-1 text-xs font-medium text-slate-400">Cómo cae por mes</p>
          <ul className="space-y-1">
            {deuda.porMes.slice(0, 6).map(([mes, monto]) => (
              <li
                key={mes}
                className="flex items-center justify-between rounded-xl bg-slate-800/40 px-3 py-2 text-sm"
              >
                <span className="text-slate-300">{nombreMes(mes)}</span>
                <span className="font-semibold tabular-nums text-slate-200">
                  {formatRedondoEn(monto)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ul className="space-y-1.5">
        {deuda.detalle.map(({ compra, pendiente, pagadas, total, proxima }) => (
          <li key={compra.id} className="rounded-2xl border border-white/5 bg-slate-900/50 p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-slate-100">{compra.descripcion}</p>
                <p className="truncate text-xs text-slate-500">
                  {compra.categoria} · {compra.metodo} ·{' '}
                  {formatEn(compra.montoTotal, compra.moneda)} en {compra.cantidadCuotas} cuotas
                </p>
              </div>
              <span className="shrink-0 text-right">
                <span className="block font-bold tabular-nums text-amber-300">
                  {formatRedondoEn(pendiente, compra.moneda)}
                </span>
                <span className="block text-xs text-slate-500">
                  {pagadas}/{total} pagadas
                </span>
              </span>
            </div>

            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-amber-400"
                style={{ width: `${(pagadas / total) * 100}%` }}
              />
            </div>

            <div className="mt-2 flex items-center justify-between gap-2 border-t border-white/5 pt-2">
              <span className="truncate text-xs text-slate-500">
                {proxima ? `Próxima el ${formatFecha(proxima.fecha)}` : 'Sin cuotas pendientes'}
              </span>
              <div className="flex shrink-0 gap-1.5">
                <button
                  onClick={() => cancelar(compra)}
                  className="flex min-h-9 items-center gap-1 rounded-xl bg-slate-800 px-2.5 text-xs font-semibold text-slate-300 active:scale-95"
                >
                  <Scissors size={13} /> Cancelar restantes
                </button>
                <button
                  onClick={() => eliminar(compra)}
                  className="flex size-9 items-center justify-center rounded-xl bg-rose-500/10 text-rose-300 active:scale-95"
                  aria-label="Borrar compra"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
