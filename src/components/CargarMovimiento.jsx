import { useEffect, useMemo, useRef, useState } from 'react'
import {
  TrendingDown,
  TrendingUp,
  Check,
  Plus,
  StickyNote,
  Equal,
  Zap,
  CalendarDays,
  X,
  ArrowLeftRight,
  Pencil,
} from 'lucide-react'
import {
  agregarMovimiento,
  actualizarMovimiento,
  borrarMovimiento,
  agregarCompraEnCuotas,
  borrarCompra,
} from '../db'
import { useDatos, useCategoriasDe, useMetodosDe, useIconos } from '../state/datos'
import { hoyISO, formatFecha } from '../utils/format'
import { combosFrecuentes, defaultsDeCategoria, rankingUso } from '../utils/calc'
import { ARS, USD, MONEDAS, formatRedondoEn } from '../utils/moneda'
import { parseMonto, limpiarInputMonto } from '../utils/monto'
import * as C from '../utils/calculadora'
import Numpad from './Numpad'
import EditorEtiquetas from './EditorEtiquetas'
import Chip from './Chip'

export default function CargarMovimiento({ editando, plantilla, onGuardado, onCancelarEdicion }) {
  const { movimientos, ajustes, conversor } = useDatos()
  const icono = useIconos()
  const esEdicion = Boolean(editando)

  const [tipo, setTipo] = useState('gasto')
  const [fecha, setFecha] = useState(hoyISO())
  const [calc, setCalc] = useState(C.estadoInicialCalc)
  const [moneda, setMoneda] = useState(ARS)
  // Cotización de este movimiento, como texto (se tipea a mano).
  const [tc, setTc] = useState('')
  const [mostrarTc, setMostrarTc] = useState(false)
  const [categoria, setCategoria] = useState('')
  const [subcategoria, setSubcategoria] = useState('')
  const [metodo, setMetodo] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [mostrarNota, setMostrarNota] = useState(false)
  // 1 = un solo pago. Más de 1 genera una compra financiada con sus cuotas.
  const [cuotas, setCuotas] = useState(1)
  const [tags, setTags] = useState([])
  // El teclado ocupa media pantalla, así que solo está cuando hace falta:
  // abierto al empezar (lo primero es el monto) y se va solo en cuanto tocás
  // una categoría, que es cuando ya terminaste de tipear.
  const [numpadAbierto, setNumpadAbierto] = useState(true)
  // Si el usuario eligió a mano, dejamos de pisarle la elección con sugerencias.
  const tocado = useRef({ sub: false, metodo: false })
  const fechaRef = useRef(null)

  const categorias = useCategoriasDe(tipo)
  const metodos = useMetodosDe(tipo)
  const ordenPorUso = ajustes.ordenPorUso !== false

  // --- Sugerencias a partir del historial ---------------------------------

  const combos = useMemo(
    () => (esEdicion ? [] : combosFrecuentes(movimientos, tipo, 4)),
    [movimientos, tipo, esEdicion],
  )

  const categoriasOrdenadas = useMemo(() => {
    if (!ordenPorUso) return categorias
    const uso = rankingUso(movimientos, tipo, 'categoria')
    return [...categorias].sort((a, b) => (uso.get(b.nombre) ?? 0) - (uso.get(a.nombre) ?? 0))
  }, [categorias, movimientos, tipo, ordenPorUso])

  const metodosOrdenados = useMemo(() => {
    if (!ordenPorUso) return metodos
    const uso = rankingUso(movimientos, tipo, 'metodo')
    return [...metodos].sort((a, b) => (uso.get(b.nombre) ?? 0) - (uso.get(a.nombre) ?? 0))
  }, [metodos, movimientos, tipo, ordenPorUso])

  const catActual = categorias.find((c) => c.nombre === categoria)
  const subcategorias = catActual?.subcategorias ?? []

  // --- Modo edición --------------------------------------------------------

  useEffect(() => {
    if (!editando) return
    setTipo(editando.tipo)
    setFecha(editando.fecha)
    setCalc(C.desdeNumero(editando.monto))
    setCategoria(editando.categoria)
    setSubcategoria(editando.subcategoria)
    setMetodo(editando.metodo)
    setDescripcion(editando.descripcion || '')
    setMostrarNota(Boolean(editando.descripcion))
    setTags(editando.tags ?? [])
    setNumpadAbierto(true)
    setMoneda(editando.moneda === USD ? USD : ARS)
    setTc(editando.tc ? String(editando.tc).replace('.', ',') : '')
    setMostrarTc(Boolean(editando.tc))
    tocado.current = { sub: true, metodo: true }
  }, [editando])

  // "Repetir" desde la lista: viene todo cargado menos la fecha, que pasa a ser
  // hoy. El monto queda puesto para confirmarlo o corregirlo.
  useEffect(() => {
    if (!plantilla) return
    setTipo(plantilla.tipo)
    setFecha(hoyISO())
    setCalc(C.desdeNumero(plantilla.monto))
    setCategoria(plantilla.categoria)
    setSubcategoria(plantilla.subcategoria)
    setMetodo(plantilla.metodo)
    setDescripcion(plantilla.descripcion || '')
    setMostrarNota(Boolean(plantilla.descripcion))
    setTags(plantilla.tags ?? [])
    setNumpadAbierto(true)
    setMoneda(plantilla.moneda === USD ? USD : ARS)
    // La cotización NO se copia: el dólar de hace un mes no es el de hoy.
    setTc('')
    setMostrarTc(plantilla.moneda === USD)
    tocado.current = { sub: true, metodo: true }
  }, [plantilla])

  // --- Acciones ------------------------------------------------------------

  const cambiarTipo = (t) => {
    if (t === tipo) return
    setTipo(t)
    setCategoria('')
    setSubcategoria('')
    setMetodo('')
    tocado.current = { sub: false, metodo: false }
  }

  // Elegir categoría completa sola la subcategoría y el método que más usás
  // en ella. Si después tocás otra cosa, manda tu elección.
  const elegirCategoria = (cat) => {
    // Si estás eligiendo categoría, el monto ya está: el teclado sobra.
    setNumpadAbierto(false)
    setCategoria(cat)
    const sugeridos = defaultsDeCategoria(movimientos, tipo, cat)
    const subsDeCat = categorias.find((c) => c.nombre === cat)?.subcategorias ?? []

    if (!tocado.current.sub) {
      setSubcategoria(sugeridos.subcategoria || (subsDeCat.length === 1 ? subsDeCat[0] : ''))
    } else if (!subsDeCat.includes(subcategoria)) {
      setSubcategoria(subsDeCat.length === 1 ? subsDeCat[0] : '')
      tocado.current.sub = false
    }

    if (!tocado.current.metodo && sugeridos.metodo) setMetodo(sugeridos.metodo)
  }

  const aplicarCombo = (combo) => {
    navigator.vibrate?.(12)
    setNumpadAbierto(false)
    setCategoria(combo.categoria)
    setSubcategoria(combo.subcategoria)
    setMetodo(combo.metodo)
    const met = metodos.find((m) => m.nombre === combo.metodo)
    if (met?.moneda && met.moneda !== moneda) cambiarMoneda(met.moneda)
    tocado.current = { sub: true, metodo: true }
  }

  const elegirSub = (s) => {
    tocado.current.sub = true
    setSubcategoria(s)
  }

  // Elegir un método con moneda propia (ej: "Efectivo USD") cambia solo la
  // moneda del monto: si pagás de la caja de dólares, el gasto es en dólares.
  const elegirMetodo = (m) => {
    tocado.current.metodo = true
    setMetodo(m.nombre)
    if (m.moneda && m.moneda !== moneda) cambiarMoneda(m.moneda)
  }

  const cambiarMoneda = (nueva) => {
    setMoneda(nueva)
    if (nueva === USD) {
      setMostrarTc(true)
      // Se precarga la última cotización conocida; siempre se puede pisar.
      if (!tc) {
        const sugerida = conversor.sugerida(fecha.slice(0, 7))
        if (sugerida > 0) setTc(String(sugerida).replace('.', ','))
      }
    } else {
      // Un gasto en pesos por defecto no lleva cotización. El número tipeado se
      // conserva por si volvés a activarla, pero deja de aplicarse.
      setMostrarTc(false)
    }
  }

  const activarTc = () => {
    setMostrarTc(true)
    if (!tc) {
      const sugerida = conversor.sugerida(fecha.slice(0, 7))
      if (sugerida > 0) setTc(String(sugerida).replace('.', ','))
    }
  }

  const monto = C.valorCalc(calc)
  const tcNum = parseMonto(tc)
  // La cotización solo cuenta si está visible: si la ocultaste, no se guarda
  // aunque el número siga escrito.
  const tcValido = mostrarTc && Number.isFinite(tcNum) && tcNum > 0
  const esUSD = moneda === USD
  const montoValido = Number.isFinite(monto) && monto > 0
  // En dólares la cotización es obligatoria: sin ella el movimiento no se podría
  // comparar con nada de lo que está en pesos.
  const completo =
    montoValido && categoria && subcategoria && metodo && (!esUSD || tcValido)
  const pendiente = C.hayPendiente(calc)

  // Equivalente en la otra moneda, para verlo mientras se carga.
  const equivalente =
    montoValido && tcValido
      ? esUSD
        ? formatRedondoEn(monto * tcNum, ARS)
        : formatRedondoEn(monto / tcNum, USD)
      : null

  // Etiquetas ya usadas, para no tener que re-tipearlas.
  const etiquetasUsadas = useMemo(() => {
    const set = new Set()
    for (const m of movimientos) for (const t of m.tags ?? []) set.add(t)
    return [...set].sort()
  }, [movimientos])

  const resetear = (nuevoTipo = tipo) => {
    setCalc(C.limpiar())
    setCategoria('')
    setSubcategoria('')
    setMetodo('')
    setDescripcion('')
    setMostrarNota(false)
    setFecha(hoyISO())
    setTipo(nuevoTipo)
    setCuotas(1)
    setTags([])
    // Listo para el siguiente: lo primero vuelve a ser el monto.
    setNumpadAbierto(true)
    // La moneda y la cotización se conservan: si estás cargando gastos en
    // dólares, lo más probable es que el próximo también lo sea.
    tocado.current = { sub: false, metodo: false }
  }

  const guardar = async () => {
    if (pendiente) {
      setCalc(C.igual(calc))
      return
    }
    if (!completo) return
    navigator.vibrate?.(18)

    const datos = {
      fecha,
      tipo,
      monto: Math.round(monto * 100) / 100,
      moneda,
      // La cotización se guarda con el movimiento y queda congelada ahí.
      tc: tcValido ? tcNum : null,
      categoria,
      subcategoria,
      metodo,
      descripcion: descripcion.trim(),
      tags,
    }

    // Compra en cuotas: se generan las N de una vez, una por mes. Ya las debés,
    // así que cada mes futuro tiene que mostrar la suya.
    if (!esEdicion && cuotas > 1 && tipo === 'gasto') {
      const compraId = await agregarCompraEnCuotas({
        descripcion: datos.descripcion || subcategoria,
        montoTotal: datos.monto,
        cantidadCuotas: cuotas,
        primerMes: fecha.slice(0, 7),
        diaMes: Number(fecha.slice(8, 10)),
        categoria,
        subcategoria,
        metodo,
        moneda,
        tc: datos.tc,
        tags,
      })
      onGuardado?.({
        msg: `${cuotas} cuotas de ${formatRedondoEn(datos.monto / cuotas, moneda)}`,
        tone: 'ok',
        undo: () => borrarCompra(compraId),
      })
      resetear()
      return
    }

    if (esEdicion) {
      await actualizarMovimiento(editando.id, datos)
      onGuardado?.({ msg: 'Cambios guardados', tone: 'ok' })
      return
    }

    const id = await agregarMovimiento(datos)
    onGuardado?.({
      msg: `Guardado · ${datos.subcategoria}${esUSD ? ' (US$)' : ''}`,
      tone: 'ok',
      // Deshacer: si te equivocaste de tecla, un toque y no pasó nada.
      undo: () => borrarMovimiento(id),
    })
    resetear()
  }

  // --- Teclado físico (escritorio) -----------------------------------------

  useEffect(() => {
    const onKey = (e) => {
      const enInput = ['INPUT', 'TEXTAREA'].includes(e.target.tagName)
      if (enInput) return
      if (e.key >= '0' && e.key <= '9') setCalc((c) => C.digito(c, e.key))
      else if (e.key === ',' || e.key === '.') setCalc((c) => C.coma(c))
      else if (e.key === 'Backspace') setCalc((c) => C.retroceso(c))
      else if (e.key === 'Escape') setCalc(C.limpiar())
      else if (['+', '-', '*', '/'].includes(e.key)) {
        const mapa = { '+': '+', '-': '−', '*': '×', '/': '÷' }
        setCalc((c) => C.operador(c, mapa[e.key]))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        guardar()
      } else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const esGasto = tipo === 'gasto'
  const display = C.displayCalc(calc)
  const expresion = C.expresionCalc(calc)
  const esHoy = fecha === hoyISO()
  const ayer = desplazarDias(hoyISO(), -1)

  return (
    <div className="flex min-h-full flex-col">
      <div className="flex-1 space-y-4 px-4 pt-3">
        {/* Tipo */}
        <div className="grid grid-cols-2 gap-1.5 rounded-2xl bg-slate-800/50 p-1.5 ring-1 ring-white/5">
          <BotonTipo
            activo={esGasto}
            onClick={() => cambiarTipo('gasto')}
            Icon={TrendingDown}
            clase="bg-rose-500 shadow-rose-500/25"
          >
            Gasto
          </BotonTipo>
          <BotonTipo
            activo={!esGasto}
            onClick={() => cambiarTipo('ingreso')}
            Icon={TrendingUp}
            clase="bg-emerald-500 shadow-emerald-500/25"
          >
            Ingreso
          </BotonTipo>
        </div>

        {/* Monto + fecha */}
        <div
          className={`rounded-3xl border bg-slate-900/50 px-5 py-3 ${
            esGasto ? 'border-rose-500/25' : 'border-emerald-500/25'
          }`}
        >
          <div className="flex h-7 items-center justify-between gap-2">
            {/* Moneda del movimiento */}
            <div className="flex gap-0.5 rounded-xl bg-slate-800/80 p-0.5">
              {[ARS, USD].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => cambiarMoneda(m)}
                  className={`min-w-9 rounded-lg px-2 py-1 text-xs font-bold transition-colors ${
                    moneda === m ? 'bg-slate-600 text-white' : 'text-slate-400'
                  }`}
                >
                  {MONEDAS[m].corto}
                </button>
              ))}
            </div>
            {expresion && (
              <span className="text-sm font-medium text-slate-500 tabular-nums">{expresion}</span>
            )}
          </div>

          {/* Tocar el monto vuelve a abrir el teclado */}
          <button
            type="button"
            onClick={() => setNumpadAbierto(true)}
            className="flex w-full items-baseline gap-1.5 text-left"
            aria-label="Editar el monto"
          >
            <span className="text-3xl font-light text-slate-500">{MONEDAS[moneda].simbolo}</span>
            <span
              className={`min-w-0 flex-1 truncate text-right text-[2.6rem] font-bold leading-tight tracking-tight tabular-nums ${
                display ? 'text-slate-50' : 'text-slate-700'
              }`}
            >
              {display || '0'}
            </span>
            {!numpadAbierto && (
              <Pencil size={15} className="mb-1 shrink-0 text-slate-600" />
            )}
          </button>

          {/* Cotización: obligatoria en dólares, opcional en pesos para el caso
              "lo pagué en pesos pero me lo cobraron en dólares". */}
          {mostrarTc ? (
            <div className="mt-2 flex items-center gap-2 border-t border-white/5 pt-2">
              <label className="shrink-0 text-xs font-medium text-slate-400">Cotización</label>
              <div className="flex min-h-9 items-center rounded-xl bg-slate-800/80 px-2">
                <span className="text-xs text-slate-500">$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={tc}
                  onChange={(e) => setTc(limpiarInputMonto(e.target.value))}
                  placeholder="1310"
                  className="w-20 bg-transparent px-1 text-base font-semibold tabular-nums text-slate-100 outline-none placeholder:text-slate-600"
                  aria-label="Cotización del dólar"
                />
              </div>
              {equivalente ? (
                <span className="min-w-0 flex-1 truncate text-right text-sm font-semibold text-indigo-300 tabular-nums">
                  = {equivalente}
                </span>
              ) : (
                <span className="min-w-0 flex-1 truncate text-right text-xs text-slate-500">
                  {esUSD ? 'Poné a cuánto está el dólar' : 'pesos por dólar'}
                </span>
              )}
              {!esUSD && (
                <button
                  type="button"
                  onClick={() => {
                    setMostrarTc(false)
                    setTc('')
                  }}
                  className="shrink-0 text-slate-500 active:text-slate-300"
                  aria-label="Quitar cotización"
                >
                  <X size={15} />
                </button>
              )}
            </div>
          ) : (
            <div className="mt-2 flex items-center justify-between gap-2 border-t border-white/5 pt-2">
              <button
                type="button"
                onClick={activarTc}
                className="flex items-center gap-1 rounded-lg px-1.5 py-1 text-xs font-medium text-slate-500 active:text-indigo-300"
              >
                <ArrowLeftRight size={13} /> Me lo cobraron en dólares
              </button>
            </div>
          )}

          <div className="mt-1.5 flex items-center justify-end gap-1.5">
            <ChipFecha activo={esHoy} onClick={() => setFecha(hoyISO())}>
              Hoy
            </ChipFecha>
            <ChipFecha activo={fecha === ayer} onClick={() => setFecha(ayer)}>
              Ayer
            </ChipFecha>
            <button
              type="button"
              onClick={() => {
                fechaRef.current?.showPicker?.() ?? fechaRef.current?.focus()
              }}
              className={`relative flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium ${
                !esHoy && fecha !== ayer
                  ? 'bg-indigo-500/20 text-indigo-200'
                  : 'text-slate-400 active:bg-slate-800'
              }`}
            >
              <CalendarDays size={15} />
              {!esHoy && fecha !== ayer ? formatFecha(fecha) : 'Otro día'}
              <input
                ref={fechaRef}
                type="date"
                value={fecha}
                onChange={(e) => e.target.value && setFecha(e.target.value)}
                className="absolute inset-0 opacity-0"
                tabIndex={-1}
              />
            </button>
          </div>
        </div>

        {/* Frecuentes: un toque completa categoría + subcategoría + método */}
        {combos.length > 0 && (
          <div>
            <h2 className="mb-2 flex items-center gap-1.5 text-sm font-medium text-slate-400">
              <Zap size={14} className="text-amber-400" /> Frecuentes
            </h2>
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
              {combos.map((c) => {
                const activo =
                  c.categoria === categoria && c.subcategoria === subcategoria && c.metodo === metodo
                return (
                  <button
                    key={`${c.categoria}|${c.subcategoria}|${c.metodo}`}
                    type="button"
                    onClick={() => aplicarCombo(c)}
                    className={`flex shrink-0 items-center gap-2 rounded-2xl border px-3 py-2 text-left transition-all active:scale-95 ${
                      activo
                        ? esGasto
                          ? 'border-rose-400/60 bg-rose-500/20'
                          : 'border-emerald-400/60 bg-emerald-500/20'
                        : 'border-slate-700/70 bg-slate-800/50'
                    }`}
                  >
                    <span className="text-lg leading-none">{icono(c.categoria)}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-slate-100">
                        {c.subcategoria}
                      </span>
                      <span className="block truncate text-xs text-slate-500">{c.metodo}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Categoría */}
        <Seccion titulo="Categoría">
          <div className="grid grid-cols-2 gap-2">
            {categoriasOrdenadas.map((cat) => (
              <Chip
                key={cat.id}
                label={cat.nombre}
                icono={cat.emoji}
                tone={tipo}
                selected={categoria === cat.nombre}
                onClick={() => elegirCategoria(cat.nombre)}
              />
            ))}
          </div>
        </Seccion>

        {/* Subcategoría */}
        {categoria && subcategorias.length > 0 && (
          <Seccion titulo="Subcategoría" animar>
            <div className="grid grid-cols-2 gap-2">
              {subcategorias.map((sub) => (
                <Chip
                  key={sub}
                  label={sub}
                  tone={tipo}
                  selected={subcategoria === sub}
                  onClick={() => elegirSub(sub)}
                />
              ))}
            </div>
          </Seccion>
        )}

        {/* Método */}
        <Seccion titulo={esGasto ? 'Método de pago' : 'Dónde entró'}>
          <div className="grid grid-cols-2 gap-2">
            {metodosOrdenados.map((m) => (
              <Chip
                key={m.id}
                label={m.moneda === USD ? `${m.nombre} · US$` : m.nombre}
                icono={m.emoji}
                tone={tipo}
                selected={metodo === m.nombre}
                onClick={() => elegirMetodo(m)}
              />
            ))}
          </div>
        </Seccion>

        {/* Cuotas y etiquetas */}
        {tipo === 'gasto' && !esEdicion && (
          <Seccion titulo="Cómo lo pagás">
            <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
              {[1, 3, 6, 9, 12, 18, 24].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setCuotas(n)}
                  className={`min-h-11 shrink-0 rounded-xl px-3.5 text-sm font-semibold transition-all active:scale-95 ${
                    cuotas === n
                      ? 'bg-indigo-500 text-white'
                      : 'bg-slate-800/60 text-slate-300 ring-1 ring-white/5'
                  }`}
                >
                  {n === 1 ? 'Un pago' : `${n} cuotas`}
                </button>
              ))}
            </div>
            {cuotas > 1 && montoValido && (
              <p className="mt-1.5 text-xs text-indigo-200">
                {cuotas} cuotas de{' '}
                <strong className="font-semibold">
                  {formatRedondoEn(monto / cuotas, moneda)}
                </strong>{' '}
                · empieza {formatFecha(fecha)}
              </p>
            )}
          </Seccion>
        )}

        <EditorEtiquetas tags={tags} onChange={setTags} sugerencias={etiquetasUsadas} />

        {/* Nota opcional */}
        {mostrarNota ? (
          <div className="animate-fade-up">
            <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-400">
              <StickyNote size={15} /> Nota
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                placeholder="Una nota corta…"
                className="w-full rounded-2xl border border-slate-700 bg-slate-800/60 px-4 py-3 text-base text-slate-100 outline-none placeholder:text-slate-600 focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={() => {
                  setDescripcion('')
                  setMostrarNota(false)
                }}
                className="rounded-2xl bg-slate-800 px-3 text-slate-400 active:scale-95"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setMostrarNota(true)}
            className="flex items-center gap-1.5 text-sm font-medium text-indigo-300 active:text-indigo-200"
          >
            <Plus size={16} /> Agregar nota
          </button>
        )}

        <div className="h-2" />
      </div>

      {/* Teclado + guardar, siempre a mano abajo */}
      <div className="safe-bottom sticky bottom-0 z-10 space-y-2 border-t border-white/5 bg-slate-950/85 px-3 pt-2 backdrop-blur-md">
        {/* El teclado se pliega en lugar de desmontarse, para que aparezca y
            desaparezca con un deslizamiento y no de un salto. */}
        <div
          className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out ${
            numpadAbierto ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
          }`}
        >
          <div className="overflow-hidden">
            <button
              type="button"
              onClick={() => setNumpadAbierto(false)}
              className="mx-auto mb-1.5 flex h-5 w-16 items-center justify-center rounded-full active:bg-white/5"
              aria-label="Cerrar el teclado"
            >
              <span className="h-1 w-9 rounded-full bg-slate-600" />
            </button>
            <Numpad
              tone={tipo}
              onDigito={(d) => setCalc((c) => C.digito(c, d))}
              onComa={() => setCalc((c) => C.coma(c))}
              onOperador={(op) => setCalc((c) => C.operador(c, op))}
              onRetroceso={() => setCalc((c) => C.retroceso(c))}
              onLimpiar={() => setCalc(C.limpiar())}
            />
          </div>
        </div>

        <div className="flex gap-2">
          {esEdicion && (
            <button
              type="button"
              onClick={onCancelarEdicion}
              className="min-h-13 flex-1 rounded-2xl bg-slate-800 text-base font-semibold text-slate-200 active:scale-95"
            >
              Cancelar
            </button>
          )}
          <button
            type="button"
            onClick={guardar}
            disabled={!completo && !pendiente}
            className={`flex min-h-13 items-center justify-center gap-2 rounded-2xl text-lg font-bold transition-all ${
              esEdicion ? 'flex-[2]' : 'w-full'
            } ${
              pendiente
                ? 'bg-slate-700 text-slate-100 active:scale-[0.98]'
                : completo
                  ? esGasto
                    ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-500/25 active:scale-[0.98]'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/25 active:scale-[0.98]'
                  : 'cursor-not-allowed bg-slate-800/80 text-slate-600'
            }`}
          >
            {pendiente ? (
              <>
                <Equal size={20} strokeWidth={3} /> Calcular
              </>
            ) : (
              <>
                <Check size={20} strokeWidth={3} /> {esEdicion ? 'Actualizar' : 'Guardar'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

function BotonTipo({ activo, onClick, Icon, clase, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-11 items-center justify-center gap-2 rounded-xl text-base font-semibold transition-all active:scale-95 ${
        activo ? `${clase} text-white shadow-lg` : 'text-slate-400'
      }`}
    >
      <Icon size={18} strokeWidth={2.5} />
      {children}
    </button>
  )
}

function ChipFecha({ activo, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors ${
        activo ? 'bg-indigo-500/20 text-indigo-200' : 'text-slate-400 active:bg-slate-800'
      }`}
    >
      {children}
    </button>
  )
}

function Seccion({ titulo, children, animar }) {
  return (
    <div className={animar ? 'animate-fade-up' : undefined}>
      <h2 className="mb-2 text-sm font-medium text-slate-400">{titulo}</h2>
      {children}
    </div>
  )
}

function desplazarDias(iso, dias) {
  const [a, m, d] = iso.split('-').map(Number)
  const fecha = new Date(a, m - 1, d + dias)
  return `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(
    fecha.getDate(),
  ).padStart(2, '0')}`
}
