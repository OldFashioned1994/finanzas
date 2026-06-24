import { useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { TrendingDown, TrendingUp, Wallet, Pencil, Trash2, Inbox } from 'lucide-react'
import { db, borrarMovimiento } from '../db'
import { getIcono } from '../config'
import { formatMonto, formatFecha, nombreMes, mesActualISO } from '../utils/format'

export default function ListaMovimientos({ onEditar }) {
  const todos = useLiveQuery(() => db.movimientos.toArray(), [], undefined)

  const [mes, setMes] = useState(mesActualISO())
  const [tipo, setTipo] = useState('todos')
  const [categoria, setCategoria] = useState('todas')

  // Lista de meses disponibles (de los datos), más nuevo primero.
  const meses = useMemo(() => {
    if (!todos) return []
    const set = new Set(todos.map((m) => m.fecha.slice(0, 7)))
    return [...set].sort().reverse()
  }, [todos])

  // Movimientos del mes elegido (base para totales y para el filtro de categoría).
  const delMes = useMemo(() => {
    if (!todos) return []
    return mes === 'todos' ? todos : todos.filter((m) => m.fecha.slice(0, 7) === mes)
  }, [todos, mes])

  // Categorías presentes en el mes (y tipo) elegidos.
  const categoriasDisponibles = useMemo(() => {
    const base = tipo === 'todos' ? delMes : delMes.filter((m) => m.tipo === tipo)
    return [...new Set(base.map((m) => m.categoria))].sort()
  }, [delMes, tipo])

  // Lista final: aplica tipo + categoría, ordenada de más nueva a más vieja.
  const lista = useMemo(() => {
    return delMes
      .filter((m) => tipo === 'todos' || m.tipo === tipo)
      .filter((m) => categoria === 'todas' || m.categoria === categoria)
      .sort(
        (a, b) =>
          b.fecha.localeCompare(a.fecha) || (b.createdAt ?? 0) - (a.createdAt ?? 0),
      )
  }, [delMes, tipo, categoria])

  // Totales del mes seleccionado (no se ven afectados por tipo/categoría).
  const totales = useMemo(() => {
    let gastos = 0
    let ingresos = 0
    for (const m of delMes) {
      if (m.tipo === 'gasto') gastos += m.monto
      else ingresos += m.monto
    }
    return { gastos, ingresos, balance: ingresos - gastos }
  }, [delMes])

  const cambiarMes = (v) => {
    setMes(v)
    setCategoria('todas')
  }
  const cambiarTipo = (v) => {
    setTipo(v)
    setCategoria('todas')
  }

  const handleBorrar = async (m) => {
    if (window.confirm(`¿Borrar este movimiento de ${formatMonto(m.monto)}?`)) {
      await borrarMovimiento(m.id)
    }
  }

  const selectCls =
    'rounded-xl border border-slate-700/70 bg-slate-800/60 px-3 py-2 text-sm text-slate-100 outline-none focus:border-indigo-500'

  return (
    <div className="space-y-4 px-4 pt-4">
      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <select value={mes} onChange={(e) => cambiarMes(e.target.value)} className={selectCls}>
          <option value="todos">Todos los meses</option>
          {meses.map((m) => (
            <option key={m} value={m}>
              {nombreMes(m)}
            </option>
          ))}
          {!meses.includes(mes) && mes !== 'todos' && (
            <option value={mes}>{nombreMes(mes)}</option>
          )}
        </select>

        <select value={tipo} onChange={(e) => cambiarTipo(e.target.value)} className={selectCls}>
          <option value="todos">Gastos e ingresos</option>
          <option value="gasto">Solo gastos</option>
          <option value="ingreso">Solo ingresos</option>
        </select>

        <select
          value={categoria}
          onChange={(e) => setCategoria(e.target.value)}
          className={selectCls}
        >
          <option value="todas">Todas las categorías</option>
          {categoriasDisponibles.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      {/* Totales */}
      <div className="grid grid-cols-3 gap-2">
        <Total label="Gastos" valor={totales.gastos} Icon={TrendingDown} clase="text-rose-400" />
        <Total
          label="Ingresos"
          valor={totales.ingresos}
          Icon={TrendingUp}
          clase="text-emerald-400"
        />
        <Total
          label="Balance"
          valor={totales.balance}
          Icon={Wallet}
          clase={totales.balance >= 0 ? 'text-indigo-300' : 'text-rose-400'}
        />
      </div>

      {/* Lista */}
      {todos === undefined ? (
        <p className="py-10 text-center text-slate-500">Cargando…</p>
      ) : lista.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center text-slate-500">
          <Inbox size={40} strokeWidth={1.5} />
          <p>No hay movimientos con estos filtros.</p>
        </div>
      ) : (
        <ul className="space-y-2 pb-6">
          {lista.map((m) => {
            const esGasto = m.tipo === 'gasto'
            return (
              <li
                key={m.id}
                className="rounded-2xl border border-white/5 bg-slate-800/40 p-3 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {/* Avatar emoji de la categoría */}
                  <div
                    className={`flex size-11 shrink-0 items-center justify-center rounded-2xl text-xl ${
                      esGasto ? 'bg-rose-500/10' : 'bg-emerald-500/10'
                    }`}
                  >
                    {getIcono(m.categoria)}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-100">
                      {m.subcategoria}
                      <span className="font-normal text-slate-500"> · {m.categoria}</span>
                    </p>
                    <p className="mt-0.5 truncate text-sm text-slate-500">
                      {formatFecha(m.fecha)} · {m.metodo}
                      {m.descripcion && <span className="italic"> · {m.descripcion}</span>}
                    </p>
                  </div>

                  <p
                    className={`shrink-0 text-base font-bold tabular-nums ${
                      esGasto ? 'text-rose-400' : 'text-emerald-400'
                    }`}
                  >
                    {esGasto ? '−' : '+'}
                    {formatMonto(m.monto)}
                  </p>
                </div>

                <div className="mt-2.5 flex justify-end gap-2 border-t border-white/5 pt-2.5">
                  <button
                    onClick={() => onEditar(m)}
                    className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm font-medium text-indigo-300 active:scale-95 active:bg-indigo-500/10"
                  >
                    <Pencil size={14} /> Editar
                  </button>
                  <button
                    onClick={() => handleBorrar(m)}
                    className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-sm font-medium text-rose-400 active:scale-95 active:bg-rose-500/10"
                  >
                    <Trash2 size={14} /> Borrar
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function Total({ label, valor, Icon, clase }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-slate-800/40 p-3 text-center">
      <p className="flex items-center justify-center gap-1 text-xs text-slate-400">
        <Icon size={13} className={clase} /> {label}
      </p>
      <p className={`mt-1 text-sm font-bold leading-tight tabular-nums ${clase}`}>
        {formatMonto(valor)}
      </p>
    </div>
  )
}
