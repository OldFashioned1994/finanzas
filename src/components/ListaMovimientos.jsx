import { useEffect, useMemo, useState } from 'react'
import {
  TrendingDown,
  TrendingUp,
  Wallet,
  Pencil,
  Trash2,
  Inbox,
  Search,
  X,
  Copy,
  SlidersHorizontal,
} from 'lucide-react'
import { db, borrarMovimiento } from '../db'
import { useDatos, useIconos } from '../state/datos'
import {
  formatMonto,
  formatMontoRedondo,
  formatCorto,
  mesActualISO,
  nombreMes,
  etiquetaDia,
} from '../utils/format'

export default function ListaMovimientos({ filtroInicial, onEditar, onRepetir, onToast }) {
  const { movimientos, cargando } = useDatos()
  const icono = useIconos()

  const [mes, setMes] = useState(filtroInicial?.mes ?? mesActualISO())
  const [tipo, setTipo] = useState(filtroInicial?.tipo ?? 'todos')
  const [categoria, setCategoria] = useState(filtroInicial?.categoria ?? 'todas')
  const [busqueda, setBusqueda] = useState('')
  const [verFiltros, setVerFiltros] = useState(false)
  const [abierto, setAbierto] = useState(null)

  // Cuando el panel manda "ver movimientos de X", los filtros se sincronizan.
  useEffect(() => {
    if (!filtroInicial) return
    setMes(filtroInicial.mes ?? mesActualISO())
    setTipo(filtroInicial.tipo ?? 'todos')
    setCategoria(filtroInicial.categoria ?? 'todas')
    setBusqueda('')
    setAbierto(null)
  }, [filtroInicial])

  const meses = useMemo(() => {
    const set = new Set(movimientos.map((m) => m.fecha.slice(0, 7)))
    set.add(mesActualISO())
    return [...set].sort().reverse()
  }, [movimientos])

  const delMes = useMemo(
    () => (mes === 'todos' ? movimientos : movimientos.filter((m) => m.fecha.slice(0, 7) === mes)),
    [movimientos, mes],
  )

  const categoriasDisponibles = useMemo(() => {
    const base = tipo === 'todos' ? delMes : delMes.filter((m) => m.tipo === tipo)
    return [...new Set(base.map((m) => m.categoria))].sort()
  }, [delMes, tipo])

  const lista = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return delMes
      .filter((m) => tipo === 'todos' || m.tipo === tipo)
      .filter((m) => categoria === 'todas' || m.categoria === categoria)
      .filter((m) => {
        if (!q) return true
        return (
          m.subcategoria?.toLowerCase().includes(q) ||
          m.categoria?.toLowerCase().includes(q) ||
          m.metodo?.toLowerCase().includes(q) ||
          m.descripcion?.toLowerCase().includes(q) ||
          String(m.monto).includes(q)
        )
      })
      .sort(
        (a, b) => b.fecha.localeCompare(a.fecha) || (b.createdAt ?? 0) - (a.createdAt ?? 0),
      )
  }, [delMes, tipo, categoria, busqueda])

  // Agrupado por día: ver el subtotal diario es lo que más rápido te dice
  // "este día se me fue la mano".
  const porDia = useMemo(() => {
    const grupos = []
    let actual = null
    for (const m of lista) {
      if (!actual || actual.fecha !== m.fecha) {
        actual = { fecha: m.fecha, movimientos: [], gastos: 0, ingresos: 0 }
        grupos.push(actual)
      }
      actual.movimientos.push(m)
      if (m.tipo === 'gasto') actual.gastos += m.monto
      else actual.ingresos += m.monto
    }
    return grupos
  }, [lista])

  const totales = useMemo(() => {
    let gastos = 0
    let ingresos = 0
    for (const m of lista) {
      if (m.tipo === 'gasto') gastos += m.monto
      else ingresos += m.monto
    }
    return { gastos, ingresos, balance: ingresos - gastos }
  }, [lista])

  const hayFiltro = tipo !== 'todos' || categoria !== 'todas' || busqueda.trim() !== ''

  const limpiarFiltros = () => {
    setTipo('todos')
    setCategoria('todas')
    setBusqueda('')
  }

  // Borrar sin diálogo modal, con deshacer: es más rápido y menos riesgoso que
  // un confirm (que se acepta en automático).
  const handleBorrar = async (m) => {
    await borrarMovimiento(m.id)
    setAbierto(null)
    onToast?.({
      msg: `Borrado · ${m.subcategoria}`,
      tone: 'info',
      undo: () => db.movimientos.add(m),
    })
  }

  const selectCls =
    'min-h-10 rounded-xl border border-slate-700/70 bg-slate-800/60 px-3 text-sm text-slate-100 outline-none focus:border-indigo-500'

  return (
    <div className="space-y-3 px-3 pb-6 pt-3">
      {/* Buscador */}
      <div className="flex gap-2">
        <div className="flex min-h-11 flex-1 items-center gap-2 rounded-2xl border border-slate-700/70 bg-slate-800/60 px-3">
          <Search size={17} className="shrink-0 text-slate-500" />
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar…"
            className="w-full bg-transparent text-base text-slate-100 outline-none placeholder:text-slate-600"
          />
          {busqueda && (
            <button onClick={() => setBusqueda('')} className="shrink-0 text-slate-500">
              <X size={16} />
            </button>
          )}
        </div>
        <button
          onClick={() => setVerFiltros((v) => !v)}
          className={`flex min-h-11 shrink-0 items-center gap-1.5 rounded-2xl px-3 text-sm font-semibold active:scale-95 ${
            hayFiltro || verFiltros
              ? 'bg-indigo-500/20 text-indigo-200'
              : 'bg-slate-800/60 text-slate-400'
          }`}
        >
          <SlidersHorizontal size={16} />
        </button>
      </div>

      {(verFiltros || hayFiltro) && (
        <div className="animate-fade-up flex flex-wrap gap-2">
          <select value={mes} onChange={(e) => setMes(e.target.value)} className={selectCls}>
            <option value="todos">Todos los meses</option>
            {meses.map((m) => (
              <option key={m} value={m}>
                {nombreMes(m)}
              </option>
            ))}
          </select>
          <select value={tipo} onChange={(e) => setTipo(e.target.value)} className={selectCls}>
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
            {categoria !== 'todas' && !categoriasDisponibles.includes(categoria) && (
              <option value={categoria}>{categoria}</option>
            )}
          </select>
          {hayFiltro && (
            <button
              onClick={limpiarFiltros}
              className="flex min-h-10 items-center gap-1 rounded-xl bg-slate-800/60 px-3 text-sm font-medium text-slate-400 active:scale-95"
            >
              <X size={14} /> Limpiar
            </button>
          )}
        </div>
      )}

      {/* Totales de lo que estás viendo */}
      <div className="grid grid-cols-3 gap-2">
        <Total label="Gastos" valor={totales.gastos} Icon={TrendingDown} clase="text-rose-400" />
        <Total label="Ingresos" valor={totales.ingresos} Icon={TrendingUp} clase="text-emerald-400" />
        <Total
          label="Balance"
          valor={totales.balance}
          Icon={Wallet}
          clase={totales.balance >= 0 ? 'text-indigo-300' : 'text-rose-400'}
        />
      </div>

      {/* Lista */}
      {cargando ? (
        <p className="py-10 text-center text-slate-500">Cargando…</p>
      ) : porDia.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-center text-slate-500">
          <Inbox size={40} strokeWidth={1.5} />
          <p>{movimientos.length === 0 ? 'Todavía no cargaste nada.' : 'No hay movimientos con estos filtros.'}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {porDia.map((dia) => (
            <div key={dia.fecha}>
              <div className="mb-1.5 flex items-baseline justify-between gap-2 px-1">
                <h3 className="text-sm font-semibold text-slate-300">{etiquetaDia(dia.fecha)}</h3>
                <span className="text-xs tabular-nums text-slate-500">
                  {dia.gastos > 0 && `−${formatCorto(dia.gastos)}`}
                  {dia.gastos > 0 && dia.ingresos > 0 && ' · '}
                  {dia.ingresos > 0 && `+${formatCorto(dia.ingresos)}`}
                </span>
              </div>
              <ul className="overflow-hidden rounded-2xl border border-white/5 bg-slate-900/45">
                {dia.movimientos.map((m, i) => {
                  const esGasto = m.tipo === 'gasto'
                  const activo = abierto === m.id
                  return (
                    <li key={m.id} className={i > 0 ? 'border-t border-white/5' : ''}>
                      <button
                        onClick={() => setAbierto(activo ? null : m.id)}
                        className="flex w-full items-center gap-3 p-3 text-left active:bg-white/5"
                      >
                        <span
                          className={`flex size-10 shrink-0 items-center justify-center rounded-2xl text-lg ${
                            esGasto ? 'bg-rose-500/10' : 'bg-emerald-500/10'
                          }`}
                        >
                          {icono(m.categoria)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold text-slate-100">
                            {m.subcategoria}
                          </span>
                          <span className="mt-0.5 block truncate text-sm text-slate-500">
                            {m.categoria} · {m.metodo}
                            {m.descripcion && <span className="italic"> · {m.descripcion}</span>}
                          </span>
                        </span>
                        <span
                          className={`shrink-0 text-base font-bold tabular-nums ${
                            esGasto ? 'text-rose-400' : 'text-emerald-400'
                          }`}
                        >
                          {esGasto ? '−' : '+'}
                          {formatMontoRedondo(m.monto)}
                        </span>
                      </button>

                      {activo && (
                        <div className="animate-fade-up flex gap-2 border-t border-white/5 bg-slate-800/30 p-2">
                          <AccionFila Icon={Copy} onClick={() => onRepetir?.(m)}>
                            Repetir
                          </AccionFila>
                          <AccionFila Icon={Pencil} onClick={() => onEditar?.(m)}>
                            Editar
                          </AccionFila>
                          <AccionFila Icon={Trash2} tono="rose" onClick={() => handleBorrar(m)}>
                            Borrar
                          </AccionFila>
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function AccionFila({ Icon, children, onClick, tono = 'slate' }) {
  const clases =
    tono === 'rose'
      ? 'bg-rose-500/10 text-rose-300 active:bg-rose-500/20'
      : 'bg-slate-800 text-slate-200 active:bg-slate-700'
  return (
    <button
      onClick={onClick}
      className={`flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-xl text-sm font-semibold active:scale-95 ${clases}`}
    >
      <Icon size={15} /> {children}
    </button>
  )
}

function Total({ label, valor, Icon, clase }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-slate-900/45 p-2.5 text-center">
      <p className="flex items-center justify-center gap-1 text-xs text-slate-400">
        <Icon size={12} className={clase} /> {label}
      </p>
      <p className={`mt-0.5 truncate text-sm font-bold leading-tight tabular-nums ${clase}`}>
        {formatMontoRedondo(valor)}
      </p>
    </div>
  )
}
