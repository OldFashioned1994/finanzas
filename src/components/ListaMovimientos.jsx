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
  ArrowLeftRight,
} from 'lucide-react'
import { db, borrarMovimiento } from '../db'
import { useDatos, useIconos } from '../state/datos'
import { mesActualISO, nombreMes, etiquetaDia } from '../utils/format'
import { ARS, USD, formatRedondoEn, formatCortoEn, monedaDe } from '../utils/moneda'

export default function ListaMovimientos({ filtroInicial, onEditar, onRepetir, onToast }) {
  const { movimientos, categorias, grupos, cargando, conversor, ajustes } = useDatos()
  const icono = useIconos()

  const [mes, setMes] = useState(filtroInicial?.mes ?? mesActualISO())
  const [tipo, setTipo] = useState(filtroInicial?.tipo ?? 'todos')
  const [categoria, setCategoria] = useState(filtroInicial?.categoria ?? 'todas')
  const [grupo, setGrupo] = useState(filtroInicial?.grupo ?? 'todos')
  const [monedaFiltro, setMonedaFiltro] = useState('todas')
  const [etiqueta, setEtiqueta] = useState(filtroInicial?.etiqueta ?? 'todas')
  const [busqueda, setBusqueda] = useState('')
  // Los totales se leen en la misma moneda que el panel.
  const monedaVista = ajustes.monedaPanel === USD ? USD : ARS
  const [verFiltros, setVerFiltros] = useState(false)
  const [abierto, setAbierto] = useState(null)

  // Cuando el panel manda "ver movimientos de X", los filtros se sincronizan.
  useEffect(() => {
    if (!filtroInicial) return
    setMes(filtroInicial.mes ?? mesActualISO())
    setTipo(filtroInicial.tipo ?? 'todos')
    setCategoria(filtroInicial.categoria ?? 'todas')
    setGrupo(filtroInicial.grupo ?? 'todos')
    setEtiqueta(filtroInicial.etiqueta ?? 'todas')
    setBusqueda('')
    setAbierto(null)
  }, [filtroInicial])

  // Qué categorías entran cuando se filtra por grupo.
  const categoriasDelGrupo = useMemo(() => {
    if (grupo === 'todos') return null
    return new Set(categorias.filter((c) => c.grupo === grupo).map((c) => c.nombre))
  }, [categorias, grupo])

  const meses = useMemo(() => {
    const set = new Set(movimientos.map((m) => m.fecha.slice(0, 7)))
    set.add(mesActualISO())
    return [...set].sort().reverse()
  }, [movimientos])

  const delMes = useMemo(
    () => (mes === 'todos' ? movimientos : movimientos.filter((m) => m.fecha.slice(0, 7) === mes)),
    [movimientos, mes],
  )

  const etiquetasDisponibles = useMemo(() => {
    const set = new Set()
    for (const m of movimientos) for (const t of m.tags ?? []) set.add(t)
    return [...set].sort()
  }, [movimientos])

  const categoriasDisponibles = useMemo(() => {
    const base = tipo === 'todos' ? delMes : delMes.filter((m) => m.tipo === tipo)
    return [...new Set(base.map((m) => m.categoria))].sort()
  }, [delMes, tipo])

  const lista = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    return delMes
      .filter((m) => tipo === 'todos' || m.tipo === tipo)
      .filter((m) => categoria === 'todas' || m.categoria === categoria)
      .filter((m) => !categoriasDelGrupo || categoriasDelGrupo.has(m.categoria))
      .filter((m) => monedaFiltro === 'todas' || monedaDe(m) === monedaFiltro)
      .filter((m) => etiqueta === 'todas' || (m.tags ?? []).includes(etiqueta))
      .filter((m) => {
        if (!q) return true
        return (
          m.subcategoria?.toLowerCase().includes(q) ||
          m.categoria?.toLowerCase().includes(q) ||
          m.metodo?.toLowerCase().includes(q) ||
          m.descripcion?.toLowerCase().includes(q) ||
          (m.tags ?? []).some((t) => t.includes(q)) ||
          String(m.monto).includes(q)
        )
      })
      .sort(
        (a, b) => b.fecha.localeCompare(a.fecha) || (b.createdAt ?? 0) - (a.createdAt ?? 0),
      )
  }, [delMes, tipo, categoria, categoriasDelGrupo, monedaFiltro, etiqueta, busqueda])

  // Los subtotales y totales suman monedas distintas, así que se calculan sobre
  // los montos convertidos; cada movimiento se sigue mostrando en la suya.
  const convertido = useMemo(() => {
    const mapa = new Map()
    for (const m of lista) mapa.set(m.id, conversor.enMoneda(m, monedaVista))
    return mapa
  }, [lista, conversor, monedaVista])

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
      const monto = convertido.get(m.id) ?? 0
      // Las transferencias no suman a ningún lado: solo cambian de bolsillo.
      if (m.tipo === 'gasto') actual.gastos += monto
      else if (m.tipo === 'ingreso') actual.ingresos += monto
    }
    return grupos
  }, [lista, convertido])

  const totales = useMemo(() => {
    let gastos = 0
    let ingresos = 0
    for (const m of lista) {
      const monto = convertido.get(m.id) ?? 0
      if (m.tipo === 'gasto') gastos += monto
      else if (m.tipo === 'ingreso') ingresos += monto
    }
    return { gastos, ingresos, balance: ingresos - gastos }
  }, [lista, convertido])

  const hayFiltro =
    tipo !== 'todos' ||
    categoria !== 'todas' ||
    grupo !== 'todos' ||
    monedaFiltro !== 'todas' ||
    etiqueta !== 'todas' ||
    busqueda.trim() !== ''

  const limpiarFiltros = () => {
    setTipo('todos')
    setCategoria('todas')
    setGrupo('todos')
    setMonedaFiltro('todas')
    setEtiqueta('todas')
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
    <div className="space-y-3 px-3 pb-24 pt-3">
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
            <option value="transferencia">Solo transferencias</option>
          </select>
          <select
            value={grupo}
            onChange={(e) => {
              setGrupo(e.target.value)
              setCategoria('todas')
            }}
            className={selectCls}
          >
            <option value="todos">Todos los grupos</option>
            {grupos
              .filter((g) => tipo === 'todos' || g.tipo === tipo)
              .map((g) => (
                <option key={g.id} value={g.nombre}>
                  {g.nombre}
                </option>
              ))}
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

          <select
            value={monedaFiltro}
            onChange={(e) => setMonedaFiltro(e.target.value)}
            className={selectCls}
          >
            <option value="todas">Pesos y dólares</option>
            <option value={ARS}>Solo pesos</option>
            <option value={USD}>Solo dólares</option>
          </select>

          {etiquetasDisponibles.length > 0 && (
            <select
              value={etiqueta}
              onChange={(e) => setEtiqueta(e.target.value)}
              className={selectCls}
            >
              <option value="todas">Todas las etiquetas</option>
              {etiquetasDisponibles.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          )}
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
        <Total label="Gastos" valor={totales.gastos} moneda={monedaVista} Icon={TrendingDown} clase="text-rose-400" />
        <Total label="Ingresos" valor={totales.ingresos} moneda={monedaVista} Icon={TrendingUp} clase="text-emerald-400" />
        <Total
          label="Balance"
          valor={totales.balance}
          moneda={monedaVista}
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
                  {dia.gastos > 0 && `−${formatCortoEn(dia.gastos, monedaVista)}`}
                  {dia.gastos > 0 && dia.ingresos > 0 && ' · '}
                  {dia.ingresos > 0 && `+${formatCortoEn(dia.ingresos, monedaVista)}`}
                </span>
              </div>
              <ul className="overflow-hidden rounded-2xl border border-white/5 bg-slate-900/45">
                {dia.movimientos.map((m, i) => {
                  const esGasto = m.tipo === 'gasto'
                  const esTransferencia = m.tipo === 'transferencia'
                  const activo = abierto === m.id
                  const suMoneda = monedaDe(m)
                  // Cada movimiento se muestra en la moneda en que se cargó; si
                  // esa no es la que estás leyendo, va el equivalente al lado.
                  const equivalente =
                    suMoneda !== monedaVista ? convertido.get(m.id) : null
                  return (
                    <li key={m.id} className={i > 0 ? 'border-t border-white/5' : ''}>
                      <button
                        onClick={() => setAbierto(activo ? null : m.id)}
                        className="flex w-full items-center gap-3 p-3 text-left active:bg-white/5"
                      >
                        <span
                          className={`flex size-10 shrink-0 items-center justify-center rounded-2xl text-lg ${
                            esTransferencia
                              ? 'bg-slate-700/50'
                              : esGasto
                                ? 'bg-rose-500/10'
                                : 'bg-emerald-500/10'
                          }`}
                        >
                          {esTransferencia ? <ArrowLeftRight size={17} className="text-slate-300" /> : icono(m.categoria)}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold text-slate-100">
                            {m.subcategoria}
                            {m.cuota && (
                              <span className="ml-1.5 rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[11px] font-semibold text-amber-300">
                                {m.cuota.n}/{m.cuota.de}
                              </span>
                            )}
                          </span>
                          <span className="mt-0.5 block truncate text-sm text-slate-500">
                            {m.categoria} · {m.metodo}
                            {m.descripcion && <span className="italic"> · {m.descripcion}</span>}
                          </span>
                          {m.tags?.length > 0 && (
                            <span className="mt-1 flex flex-wrap gap-1">
                              {m.tags.map((t) => (
                                <span
                                  key={t}
                                  className="rounded-md bg-indigo-500/15 px-1.5 py-0.5 text-[11px] font-medium text-indigo-200"
                                >
                                  {t}
                                </span>
                              ))}
                            </span>
                          )}
                        </span>
                        <span className="shrink-0 text-right">
                          <span
                            className={`block text-base font-bold tabular-nums ${
                              esTransferencia
                                ? 'text-slate-400'
                                : esGasto
                                  ? 'text-rose-400'
                                  : 'text-emerald-400'
                            }`}
                          >
                            {esTransferencia ? '' : esGasto ? '−' : '+'}
                            {formatRedondoEn(m.monto, suMoneda)}
                          </span>
                          {equivalente != null && (
                            <span className="block text-xs tabular-nums text-slate-500">
                              ≈ {formatRedondoEn(equivalente, monedaVista)}
                            </span>
                          )}
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

function Total({ label, valor, moneda, Icon, clase }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-slate-900/45 p-2.5 text-center">
      <p className="flex items-center justify-center gap-1 text-xs text-slate-400">
        <Icon size={12} className={clase} /> {label}
      </p>
      <p className={`mt-0.5 truncate text-sm font-bold leading-tight tabular-nums ${clase}`}>
        {formatRedondoEn(valor, moneda)}
      </p>
    </div>
  )
}
