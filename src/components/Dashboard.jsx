import { useMemo, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  TrendingDown,
  TrendingUp,
  Wallet,
  PiggyBank,
  ArrowRight,
  Gauge,
  CalendarClock,
  Inbox,
  CheckCheck,
  X,
} from 'lucide-react'
import { useDatos, useIconos } from '../state/datos'
import { confirmarFijo, omitirFijo } from '../db'
import { CircleDollarSign } from 'lucide-react'
import {
  PERIODOS,
  rangoDe,
  rangoAnterior,
  etiquetaPeriodo,
  enRango,
  resumen,
  variacion,
  porCategoria,
  porMetodo,
  serieMensual,
  acumuladoDiario,
  topMovimientos,
  ritmoMensual,
  sumarMeses,
  fijosPendientes,
  diasConGasto,
} from '../utils/calc'
import { formatPct, formatDelta, mesActualISO, formatFecha } from '../utils/format'
import {
  ARS,
  USD,
  MONEDAS,
  formatEn,
  formatRedondoEn,
  formatCortoEn,
  normalizarMontos,
} from '../utils/moneda'
import { setAjuste } from '../db'
import { SERIES, GRIS, ESTADO, FLUJO } from '../utils/paleta'
import Tarjeta from './Tarjeta'
import Donut from './charts/Donut'
import EvolucionMeses from './charts/EvolucionMeses'
import RitmoMes from './charts/RitmoMes'

const TOP_DONUT = 7

export default function Dashboard({ onVerMovimientos, onToast }) {
  const { movimientos: crudos, categorias, presupuestos, fijos, cargando, conversor, ajustes } =
    useDatos()
  const icono = useIconos()

  const [periodo, setPeriodo] = useState('mes')
  const [mes, setMes] = useState(mesActualISO())
  const [tipo, setTipo] = useState('gasto')
  const [seleccion, setSeleccion] = useState(null)
  const [monedaVista, setMonedaVista] = useState(ajustes.monedaPanel === USD ? USD : ARS)

  // Todo el tablero se calcula sobre una sola moneda: los movimientos se
  // convierten una vez acá y el motor de cálculo sigue sin saber de monedas.
  const { movimientos, sinCotizacion } = useMemo(
    () => normalizarMontos(crudos, monedaVista, conversor),
    [crudos, monedaVista, conversor],
  )

  const fCorto = (n) => formatCortoEn(n, monedaVista)
  const fRedondo = (n) => formatRedondoEn(n, monedaVista)

  const cambiarMoneda = (m) => {
    setMonedaVista(m)
    setAjuste('monedaPanel', m)
  }

  // Color estable por categoría: sale de su posición en la taxonomía, no del
  // ranking del mes. Así "Alimentación" es del mismo color en todos los meses.
  const colorDe = useMemo(() => {
    const mapa = new Map()
    const delTipo = categorias.filter((c) => c.tipo === tipo)
    delTipo.forEach((c, i) => mapa.set(c.nombre, SERIES[i % SERIES.length]))
    return (nombre) => mapa.get(nombre) ?? GRIS
  }, [categorias, tipo])

  const rango = useMemo(() => rangoDe(periodo, mes), [periodo, mes])
  const rangoPrevio = useMemo(() => rangoAnterior(periodo, mes), [periodo, mes])

  const delPeriodo = useMemo(() => enRango(movimientos, rango), [movimientos, rango])
  const delPrevio = useMemo(
    () => (rangoPrevio ? enRango(movimientos, rangoPrevio) : []),
    [movimientos, rangoPrevio],
  )

  const tot = useMemo(() => resumen(delPeriodo), [delPeriodo])
  const totPrevio = useMemo(() => resumen(delPrevio), [delPrevio])

  const categoriasDelPeriodo = useMemo(
    () => porCategoria(delPeriodo, tipo, rangoPrevio ? delPrevio : null),
    [delPeriodo, delPrevio, tipo, rangoPrevio],
  )

  const totalTipo = tipo === 'gasto' ? tot.gastos : tot.ingresos

  // Para el anillo: las 7 primeras y el resto agrupado. Sumar un octavo color
  // no ayudaría a leer nada; "Otras" sí.
  const datosDonut = useMemo(() => {
    const top = categoriasDelPeriodo.slice(0, TOP_DONUT).map((c) => ({
      nombre: c.nombre,
      total: c.total,
      pct: c.pct,
      color: colorDe(c.nombre),
    }))
    const resto = categoriasDelPeriodo.slice(TOP_DONUT)
    if (resto.length) {
      const total = resto.reduce((s, c) => s + c.total, 0)
      top.push({
        nombre: `Otras (${resto.length})`,
        total,
        pct: totalTipo > 0 ? total / totalTipo : 0,
        color: GRIS,
      })
    }
    return top
  }, [categoriasDelPeriodo, colorDe, totalTipo])

  const metodos = useMemo(() => porMetodo(delPeriodo, tipo), [delPeriodo, tipo])
  const serie12 = useMemo(() => serieMensual(movimientos, mes, 12), [movimientos, mes])
  const top5 = useMemo(() => topMovimientos(delPeriodo, tipo, 5), [delPeriodo, tipo])
  const ritmo = useMemo(() => ritmoMensual(delPeriodo, mes), [delPeriodo, mes])

  const acumActual = useMemo(() => acumuladoDiario(movimientos, mes), [movimientos, mes])
  const acumAnterior = useMemo(
    () => acumuladoDiario(movimientos, sumarMeses(mes, -1)),
    [movimientos, mes],
  )

  // Los presupuestos se definen en pesos; si el tablero se está leyendo en
  // dólares hay que convertirlos con la cotización del mes que se está viendo.
  const presupuestosVista = useMemo(() => {
    if (monedaVista === ARS) return presupuestos
    const tc = conversor.tcDeMes(mes)
    if (!tc) return []
    return presupuestos.map((p) => ({ ...p, monto: p.monto / tc }))
  }, [presupuestos, monedaVista, conversor, mes])

  const pendientes = useMemo(() => fijosPendientes(fijos), [fijos])
  const esMesActual = mes === mesActualISO()
  const hayDatos = delPeriodo.length > 0
  // Con el mes empezado la comparación es contra el mismo tramo del mes pasado,
  // y conviene decirlo: si no, el número se lee como si fuera contra el mes entero.
  const refComparacion = rangoPrevio?.parcial ? 'vs igual tramo' : 'vs anterior'

  const irAMes = (delta) => {
    setMes(sumarMeses(mes, delta))
    setSeleccion(null)
  }

  const verMovimientosDe = (categoria) => {
    onVerMovimientos?.({ mes: periodo === 'mes' ? mes : 'todos', tipo, categoria })
  }

  return (
    <div className="space-y-3 px-3 pb-6 pt-3">
      {/* Período */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => irAMes(-1)}
          disabled={periodo === 'todo'}
          className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-slate-800/70 text-slate-300 active:scale-95 disabled:opacity-30"
          aria-label="Período anterior"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-base font-bold text-slate-100">
            {etiquetaPeriodo(periodo, mes)}
          </p>
          <p className="text-xs text-slate-500">
            {tot.cantidad} movimiento{tot.cantidad === 1 ? '' : 's'}
          </p>
        </div>
        <button
          onClick={() => irAMes(1)}
          disabled={periodo === 'todo' || (esMesActual && periodo === 'mes')}
          className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-slate-800/70 text-slate-300 active:scale-95 disabled:opacity-30"
          aria-label="Período siguiente"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="flex gap-1.5">
        <div className="grid flex-1 grid-cols-4 gap-1 rounded-2xl bg-slate-800/50 p-1 ring-1 ring-white/5">
          {PERIODOS.map((p) => (
            <button
              key={p.id}
              onClick={() => {
                setPeriodo(p.id)
                setSeleccion(null)
              }}
              className={`min-h-9 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
                periodo === p.id ? 'bg-indigo-500 text-white' : 'text-slate-400'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {/* En qué moneda se lee todo el tablero. Ver el año en dólares es la
            única forma de comparar meses sin que la inflación los deforme. */}
        <button
          onClick={() => cambiarMoneda(monedaVista === ARS ? USD : ARS)}
          className={`flex min-h-11 shrink-0 items-center gap-1 rounded-2xl px-2.5 text-sm font-bold active:scale-95 ${
            monedaVista === USD
              ? 'bg-emerald-500/20 text-emerald-300'
              : 'bg-slate-800/50 text-slate-300 ring-1 ring-white/5'
          }`}
          aria-label={`Ver en ${monedaVista === ARS ? 'dólares' : 'pesos'}`}
        >
          <CircleDollarSign size={15} />
          {MONEDAS[monedaVista].corto}
        </button>
      </div>

      {sinCotizacion > 0 && (
        <button
          onClick={() => cambiarMoneda(ARS)}
          className="flex w-full items-center gap-2 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-2.5 text-left text-xs text-amber-200"
        >
          <CircleDollarSign size={16} className="shrink-0" />
          <span>
            {sinCotizacion} movimiento{sinCotizacion === 1 ? '' : 's'} sin cotización quedaron
            afuera. Cargá el dólar del mes en Ajustes, o volvé a pesos.
          </span>
        </button>
      )}

      {/* Gastos fijos por confirmar */}
      {pendientes.length > 0 && (
        <PendientesFijos
          pendientes={pendientes}
          icono={icono}
          onToast={onToast}
          conversor={conversor}
        />
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-2">
        <Kpi
          label="Gastos"
          valor={tot.gastos}
          delta={variacion(tot.gastos, totPrevio.gastos)}
          Icon={TrendingDown}
          color="text-rose-400"
          referencia={refComparacion}
          moneda={monedaVista}
          // En gastos, subir es malo: el semáforo se invierte respecto de ingresos.
          invertido
        />
        <Kpi
          label="Ingresos"
          valor={tot.ingresos}
          delta={variacion(tot.ingresos, totPrevio.ingresos)}
          Icon={TrendingUp}
          color="text-emerald-400"
          referencia={refComparacion}
          moneda={monedaVista}
        />
        <Kpi
          label="Balance"
          valor={tot.balance}
          Icon={Wallet}
          moneda={monedaVista}
          color={tot.balance >= 0 ? 'text-indigo-300' : 'text-rose-400'}
          nota={tot.balance >= 0 ? 'te sobró' : 'gastaste de más'}
        />
        <Kpi
          label="Tasa de ahorro"
          texto={tot.tasaAhorro == null ? '—' : formatPct(tot.tasaAhorro, 0)}
          Icon={PiggyBank}
          moneda={monedaVista}
          color={tot.tasaAhorro == null ? 'text-slate-400' : tot.tasaAhorro >= 0.1 ? 'text-emerald-400' : 'text-amber-400'}
          nota={tot.tasaAhorro == null ? 'sin ingresos cargados' : 'de lo que entró'}
        />
      </div>

      {!hayDatos ? (
        <Tarjeta>
          <div className="flex flex-col items-center gap-3 py-10 text-center text-slate-500">
            <Inbox size={38} strokeWidth={1.5} />
            <p>Todavía no hay movimientos en este período.</p>
          </div>
        </Tarjeta>
      ) : (
        <>
          {/* Ritmo del mes */}
          {periodo === 'mes' && (
            <Tarjeta
              titulo="Ritmo de gasto"
              accion={
                <span className="flex items-center gap-1 text-xs text-slate-500">
                  <Gauge size={13} /> {fCorto(ritmo.promedioDiario)}/día
                </span>
              }
            >
              <RitmoMes
                actual={acumActual}
                anterior={acumAnterior}
                diaHoy={esMesActual ? ritmo.transcurridos : null}
                moneda={monedaVista}
              />
              <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-white/5 pt-2 text-xs">
                <span className="text-slate-500">
                  Gastaste {diasConGasto(delPeriodo)} de {ritmo.transcurridos}{' '}
                  {ritmo.esMesActual ? 'días hasta hoy' : 'días del mes'}
                </span>
                {ritmo.proyeccion != null && (
                  <span className="flex items-center gap-1 font-semibold text-slate-300">
                    <CalendarClock size={13} className="text-indigo-400" />
                    Cierre estimado {fCorto(ritmo.proyeccion)}
                  </span>
                )}
              </div>
            </Tarjeta>
          )}

          {/* Composición */}
          <Tarjeta
            titulo={tipo === 'gasto' ? 'En qué se va la plata' : 'De dónde viene la plata'}
            accion={
              <div className="flex gap-1 rounded-xl bg-slate-800/70 p-0.5">
                <MiniTab activo={tipo === 'gasto'} onClick={() => { setTipo('gasto'); setSeleccion(null) }}>
                  Gastos
                </MiniTab>
                <MiniTab activo={tipo === 'ingreso'} onClick={() => { setTipo('ingreso'); setSeleccion(null) }}>
                  Ingresos
                </MiniTab>
              </div>
            }
          >
            {datosDonut.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">
                Sin {tipo === 'gasto' ? 'gastos' : 'ingresos'} en este período.
              </p>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <Donut
                  datos={datosDonut}
                  total={totalTipo}
                  seleccion={seleccion}
                  onSelect={setSeleccion}
                  moneda={monedaVista}
                  etiqueta={tipo === 'gasto' ? 'Gastos' : 'Ingresos'}
                />
                <ul className="w-full space-y-1">
                  {datosDonut.map((d) => (
                    <li key={d.nombre}>
                      <button
                        onClick={() => setSeleccion(seleccion === d.nombre ? null : d.nombre)}
                        className={`flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left transition-colors ${
                          seleccion === d.nombre ? 'bg-white/5' : ''
                        }`}
                      >
                        <span
                          className="size-2.5 shrink-0 rounded-full"
                          style={{ backgroundColor: d.color }}
                        />
                        <span className="min-w-0 flex-1 truncate text-sm text-slate-300">
                          {d.nombre}
                        </span>
                        <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-200">
                          {fCorto(d.total)}
                        </span>
                        <span className="w-12 shrink-0 text-right text-xs tabular-nums text-slate-500">
                          {formatPct(d.pct, 1)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Tarjeta>

          {/* Ranking con drill-down */}
          <Tarjeta titulo="Detalle por categoría">
            <ul className="space-y-2.5">
              {categoriasDelPeriodo.map((c) => (
                <FilaCategoria
                  key={c.nombre}
                  cat={c}
                  color={colorDe(c.nombre)}
                  icono={icono(c.nombre)}
                  maximo={categoriasDelPeriodo[0]?.total ?? 1}
                  abierta={seleccion === c.nombre}
                  onToggle={() => setSeleccion(seleccion === c.nombre ? null : c.nombre)}
                  onVerMovimientos={() => verMovimientosDe(c.nombre)}
                  moneda={monedaVista}
                  hayComparacion={Boolean(rangoPrevio)}
                />
              ))}
            </ul>
          </Tarjeta>

          {/* Presupuestos */}
          {tipo === 'gasto' && periodo === 'mes' && presupuestosVista.length > 0 && (
            <PanelPresupuestos
              presupuestos={presupuestosVista}
              categorias={categoriasDelPeriodo}
              icono={icono}
              ritmo={ritmo}
              esMesActual={esMesActual}
              moneda={monedaVista}
            />
          )}

          {/* Evolución */}
          <Tarjeta
            titulo="Últimos 12 meses"
            accion={
              <div className="flex items-center gap-3 text-xs">
                <Leyenda color={FLUJO.ingreso} texto="Ingresos" />
                <Leyenda color={FLUJO.gasto} texto="Gastos" />
              </div>
            }
          >
            <EvolucionMeses
              serie={serie12}
              mesActivo={mes}
              moneda={monedaVista}
              onSelect={(m) => {
                setMes(m)
                setPeriodo('mes')
              }}
            />
            <p className="mt-1 text-center text-xs text-slate-500">
              Tocá un mes para verlo en detalle
            </p>
          </Tarjeta>

          {/* Métodos de pago */}
          {metodos.length > 0 && (
            <Tarjeta titulo={tipo === 'gasto' ? 'Con qué pagaste' : 'Dónde entró'}>
              <ul className="space-y-2">
                {metodos.map((m) => (
                  <li key={m.nombre}>
                    <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span>{icono(m.nombre)}</span>
                        <span className="truncate text-slate-300">{m.nombre}</span>
                      </span>
                      <span className="shrink-0 tabular-nums text-slate-200">
                        {fCorto(m.total)}
                        <span className="ml-1.5 text-xs text-slate-500">{formatPct(m.pct, 0)}</span>
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
                      <div
                        className="h-full rounded-full bg-slate-400"
                        style={{ width: `${Math.max(m.pct * 100, 1)}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </Tarjeta>
          )}

          {/* Top movimientos */}
          {top5.length > 0 && (
            <Tarjeta titulo={tipo === 'gasto' ? 'Gastos más grandes' : 'Ingresos más grandes'}>
              <ul className="space-y-1.5">
                {top5.map((m) => (
                  <li key={m.id} className="flex items-center gap-2.5">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-800/70 text-base">
                      {icono(m.categoria)}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-slate-200">
                        {m.subcategoria}
                        {m.descripcion ? ` · ${m.descripcion}` : ''}
                      </span>
                      <span className="block truncate text-xs text-slate-500">
                        {formatFecha(m.fecha)} · {m.metodo}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-bold tabular-nums text-slate-100">
                      {fRedondo(m.monto)}
                    </span>
                  </li>
                ))}
              </ul>
            </Tarjeta>
          )}
        </>
      )}

      {cargando && <p className="py-6 text-center text-slate-500">Cargando…</p>}
    </div>
  )
}

// ---------------------------------------------------------------------------

function Kpi({ label, valor, texto, delta, Icon, color, nota, invertido, referencia, moneda }) {
  const fCorto = (n) => formatCortoEn(n, moneda)
  const fRedondo = (n) => formatRedondoEn(n, moneda)
  const deltaTexto = formatDelta(delta)
  // Un delta sin base de comparación no se muestra: "+∞%" no informa nada.
  const sube = delta > 0
  const bueno = invertido ? !sube : sube
  return (
    <div className="rounded-2xl border border-white/5 bg-slate-900/45 p-3">
      <p className="flex items-center gap-1.5 text-xs text-slate-400">
        <Icon size={13} className={color} /> {label}
      </p>
      <p className={`mt-1 truncate text-lg font-bold leading-tight tabular-nums ${color}`}>
        {texto ?? fRedondo(valor)}
      </p>
      {deltaTexto ? (
        <p
          className={`mt-0.5 text-xs font-medium ${
            bueno ? 'text-emerald-400' : 'text-amber-400'
          }`}
        >
          {deltaTexto} {referencia ?? 'vs anterior'}
        </p>
      ) : (
        nota && <p className="mt-0.5 truncate text-xs text-slate-500">{nota}</p>
      )}
    </div>
  )
}

function FilaCategoria({ cat, color, icono, maximo, abierta, onToggle, onVerMovimientos, hayComparacion, moneda }) {
  const fCorto = (n) => formatCortoEn(n, moneda)
  const fRedondo = (n) => formatRedondoEn(n, moneda)
  const delta = formatDelta(cat.variacion)
  return (
    <li>
      <button onClick={onToggle} className="w-full text-left">
        <div className="mb-1.5 flex items-baseline justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="text-base leading-none">{icono}</span>
            <span className="truncate text-sm font-medium text-slate-200">{cat.nombre}</span>
            <span className="shrink-0 text-xs text-slate-500">{formatPct(cat.pct, 0)}</span>
          </span>
          <span className="shrink-0 text-sm font-semibold tabular-nums text-slate-100">
            {fCorto(cat.total)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${Math.max((cat.total / maximo) * 100, 1.5)}%`,
                backgroundColor: color,
              }}
            />
          </div>
          {hayComparacion && delta && (
            <span
              className={`w-12 shrink-0 text-right text-xs font-medium tabular-nums ${
                cat.variacion > 0 ? 'text-amber-400' : 'text-emerald-400'
              }`}
            >
              {delta}
            </span>
          )}
        </div>
      </button>

      {abierta && (
        <div className="animate-fade-up mt-2 rounded-2xl bg-slate-800/40 p-2.5">
          <ul className="space-y-1.5">
            {cat.subs.map((s) => (
              <li key={s.nombre} className="flex items-center gap-2 text-sm">
                <span className="min-w-0 flex-1 truncate text-slate-400">{s.nombre}</span>
                <span className="tabular-nums text-slate-300">{fCorto(s.total)}</span>
                <span className="w-11 text-right text-xs tabular-nums text-slate-500">
                  {formatPct(s.pct, 0)}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-2 flex items-center justify-between border-t border-white/5 pt-2 text-xs">
            <span className="text-slate-500">
              {cat.cantidad} movimiento{cat.cantidad === 1 ? '' : 's'}
              {cat.anterior != null && ` · antes ${fCorto(cat.anterior)}`}
            </span>
            <button
              onClick={onVerMovimientos}
              className="flex items-center gap-1 font-semibold text-indigo-300 active:text-indigo-200"
            >
              Ver movimientos <ArrowRight size={13} />
            </button>
          </div>
        </div>
      )}
    </li>
  )
}

function PanelPresupuestos({ presupuestos, categorias, icono, ritmo, esMesActual, moneda }) {
  const fCorto = (n) => formatCortoEn(n, moneda)
  const fRedondo = (n) => formatRedondoEn(n, moneda)
  
  const gastadoPor = new Map(categorias.map((c) => [c.nombre, c.total]))
  // Con el mes empezado, el presupuesto se juzga contra lo que corresponde
  // haber gastado a esta altura, no contra el total: 80% el día 5 es alarma,
  // el día 28 es normal.
  const avanceMes = esMesActual ? ritmo.transcurridos / ritmo.total_dias : 1

  return (
    <Tarjeta titulo="Presupuestos del mes">
      <ul className="space-y-3">
        {presupuestos.map((p) => {
          const gastado = gastadoPor.get(p.categoria) ?? 0
          const uso = p.monto > 0 ? gastado / p.monto : 0
          const excedido = uso > 1
          const adelantado = !excedido && uso > avanceMes + 0.15
          const color = excedido ? ESTADO.excedido : adelantado ? ESTADO.atencion : ESTADO.bien
          return (
            <li key={p.id}>
              <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
                <span className="flex min-w-0 items-center gap-1.5">
                  <span>{icono(p.categoria)}</span>
                  <span className="truncate text-slate-300">{p.categoria}</span>
                </span>
                <span className="shrink-0 tabular-nums text-slate-300">
                  {fCorto(gastado)}
                  <span className="text-slate-500"> / {fCorto(p.monto)}</span>
                </span>
              </div>
              <div className="relative h-2.5 overflow-hidden rounded-full bg-slate-800">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${Math.min(uso * 100, 100)}%`, backgroundColor: color }}
                />
                {esMesActual && (
                  // Marca de "dónde deberías ir hoy" según los días transcurridos.
                  <span
                    className="absolute top-0 h-full w-0.5 bg-white/50"
                    style={{ left: `${Math.min(avanceMes * 100, 100)}%` }}
                    title="Ritmo esperado a esta altura del mes"
                  />
                )}
              </div>
              <p className="mt-1 text-xs font-medium" style={{ color }}>
                {excedido
                  ? `Excedido por ${fCorto(gastado - p.monto)}`
                  : adelantado
                    ? `Vas adelantado: ${formatPct(uso, 0)} usado`
                    : `Te queda ${fCorto(p.monto - gastado)}`}
              </p>
            </li>
          )
        })}
      </ul>
    </Tarjeta>
  )
}

function PendientesFijos({ pendientes, icono, onToast, conversor }) {
  const mes = mesActualISO()
  const [ocupado, setOcupado] = useState(null)

  const confirmar = async (f) => {
    // Un fijo en dólares necesita cotización para poder compararse con el resto.
    // Si todavía no hay ninguna cargada, no lo confirmamos a ciegas.
    const tc = f.moneda === USD ? conversor?.sugerida(mes) : null
    if (f.moneda === USD && !tc) {
      onToast?.({ msg: 'Cargá primero el dólar del mes en Ajustes', tone: 'error' })
      return
    }
    setOcupado(f.id)
    await confirmarFijo(f, mes, { tc })
    setOcupado(null)
    onToast?.({ msg: `${f.subcategoria} confirmado`, tone: 'ok' })
  }

  const omitir = async (f) => {
    setOcupado(f.id)
    await omitirFijo(f.id, mes)
    setOcupado(null)
    onToast?.({ msg: `${f.subcategoria} salteado este mes`, tone: 'info' })
  }

  return (
    <Tarjeta className="!border-indigo-500/25 !bg-indigo-500/10" ajustado>
      <h2 className="mb-2 flex items-center gap-1.5 px-1 text-sm font-semibold text-indigo-200">
        <CalendarClock size={15} /> Fijos por confirmar ({pendientes.length})
      </h2>
      <ul className="space-y-1.5">
        {pendientes.map((f) => (
          <li
            key={f.id}
            className="flex items-center gap-2 rounded-2xl bg-slate-900/60 p-2"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-base">
              {icono(f.categoria)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-slate-100">
                {f.subcategoria}
              </span>
              <span className="block truncate text-xs text-slate-500">
                día {f.diaMes} · {formatEn(f.monto, f.moneda)}
              </span>
            </span>
            <button
              onClick={() => omitir(f)}
              disabled={ocupado === f.id}
              className="flex size-9 items-center justify-center rounded-xl bg-slate-800 text-slate-400 active:scale-95"
              aria-label="Saltear este mes"
            >
              <X size={16} />
            </button>
            <button
              onClick={() => confirmar(f)}
              disabled={ocupado === f.id}
              className="flex h-9 items-center gap-1 rounded-xl bg-emerald-500 px-3 text-sm font-bold text-white active:scale-95"
            >
              <CheckCheck size={16} /> Pagué
            </button>
          </li>
        ))}
      </ul>
    </Tarjeta>
  )
}

function MiniTab({ activo, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors ${
        activo ? 'bg-slate-700 text-slate-100' : 'text-slate-400'
      }`}
    >
      {children}
    </button>
  )
}

function Leyenda({ color, texto }) {
  return (
    <span className="flex items-center gap-1 text-slate-400">
      <span className="size-2 rounded-full" style={{ backgroundColor: color }} />
      {texto}
    </span>
  )
}
