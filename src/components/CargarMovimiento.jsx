import { useEffect, useRef, useState } from 'react'
import { TrendingDown, TrendingUp, Calendar, Check, Plus, StickyNote } from 'lucide-react'
import { getCategorias, getSubcategorias, getMetodos, getIcono } from '../config'
import { agregarMovimiento, actualizarMovimiento } from '../db'
import { hoyISO } from '../utils/format'
import { parseMonto, limpiarInputMonto } from '../utils/monto'
import Chip from './Chip'

const estadoInicial = (tipo = 'gasto') => ({
  tipo,
  fecha: hoyISO(),
  monto: '',
  categoria: '',
  subcategoria: '',
  metodo: '',
  descripcion: '',
})

export default function CargarMovimiento({ editando, onGuardado, onCancelarEdicion }) {
  const [form, setForm] = useState(estadoInicial())
  const [mostrarNota, setMostrarNota] = useState(false)
  const montoRef = useRef(null)

  const esEdicion = Boolean(editando)

  // Cargar datos al entrar en modo edición.
  useEffect(() => {
    if (editando) {
      setForm({
        tipo: editando.tipo,
        fecha: editando.fecha,
        monto: String(editando.monto).replace('.', ','),
        categoria: editando.categoria,
        subcategoria: editando.subcategoria,
        metodo: editando.metodo,
        descripcion: editando.descripcion || '',
      })
      setMostrarNota(Boolean(editando.descripcion))
    }
  }, [editando])

  // Foco en el monto al iniciar (abre teclado numérico).
  useEffect(() => {
    if (!esEdicion) montoRef.current?.focus()
  }, [esEdicion])

  const set = (campo, valor) => setForm((f) => ({ ...f, [campo]: valor }))

  const cambiarTipo = (tipo) => {
    if (tipo === form.tipo) return
    // Cambian las opciones, así que reseteo categoría/subcategoría/método.
    setForm((f) => ({ ...f, tipo, categoria: '', subcategoria: '', metodo: '' }))
  }

  const elegirCategoria = (cat) => {
    setForm((f) => ({
      ...f,
      categoria: cat,
      // Si la subcategoría actual no pertenece a la nueva categoría, la limpio.
      subcategoria: getSubcategorias(f.tipo, cat).includes(f.subcategoria)
        ? f.subcategoria
        : '',
    }))
  }

  const categorias = getCategorias(form.tipo)
  const subcategorias = form.categoria ? getSubcategorias(form.tipo, form.categoria) : []
  const metodos = getMetodos(form.tipo)

  const montoNum = parseMonto(form.monto)
  const completo =
    Number.isFinite(montoNum) &&
    montoNum > 0 &&
    form.categoria &&
    form.subcategoria &&
    form.metodo

  const resetear = () => {
    setForm((f) => estadoInicial(f.tipo)) // conservo el tipo elegido
    setMostrarNota(false)
    requestAnimationFrame(() => montoRef.current?.focus())
  }

  const guardar = async (e) => {
    e.preventDefault()
    if (!completo) return

    const datos = {
      fecha: form.fecha,
      tipo: form.tipo,
      monto: montoNum,
      categoria: form.categoria,
      subcategoria: form.subcategoria,
      metodo: form.metodo,
      descripcion: form.descripcion.trim(),
    }

    if (esEdicion) {
      await actualizarMovimiento(editando.id, datos)
      onGuardado?.({ msg: 'Cambios guardados', tone: 'ok' })
    } else {
      await agregarMovimiento(datos)
      onGuardado?.({ msg: 'Movimiento guardado', tone: 'ok' })
      resetear()
    }
  }

  const esGasto = form.tipo === 'gasto'

  return (
    <form onSubmit={guardar} className="flex min-h-full flex-col">
      <div className="flex-1 space-y-5 px-4 pt-4">
        {/* Tipo: gasto / ingreso */}
        <div className="grid grid-cols-2 gap-1.5 rounded-2xl bg-slate-800/50 p-1.5 ring-1 ring-white/5">
          <button
            type="button"
            onClick={() => cambiarTipo('gasto')}
            className={`flex min-h-12 items-center justify-center gap-2 rounded-xl text-base font-semibold transition-all active:scale-95 ${
              esGasto
                ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/25'
                : 'text-slate-400'
            }`}
          >
            <TrendingDown size={18} strokeWidth={2.5} />
            Gasto
          </button>
          <button
            type="button"
            onClick={() => cambiarTipo('ingreso')}
            className={`flex min-h-12 items-center justify-center gap-2 rounded-xl text-base font-semibold transition-all active:scale-95 ${
              !esGasto
                ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                : 'text-slate-400'
            }`}
          >
            <TrendingUp size={18} strokeWidth={2.5} />
            Ingreso
          </button>
        </div>

        {/* Monto */}
        <div>
          <div
            className={`flex items-center rounded-3xl border bg-slate-800/60 px-5 py-1 ring-1 ring-inset transition-colors ${
              esGasto
                ? 'border-rose-500/30 ring-rose-500/10 focus-within:border-rose-400'
                : 'border-emerald-500/30 ring-emerald-500/10 focus-within:border-emerald-400'
            }`}
          >
            <span className="text-3xl font-light text-slate-500">$</span>
            <input
              id="monto"
              ref={montoRef}
              type="text"
              inputMode="decimal"
              enterKeyHint="done"
              placeholder="0"
              value={form.monto}
              onChange={(e) => set('monto', limpiarInputMonto(e.target.value))}
              className="w-full bg-transparent px-2 py-3 text-4xl font-bold tracking-tight text-slate-50 outline-none placeholder:text-slate-600"
            />
          </div>
        </div>

        {/* Fecha */}
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-1.5 text-sm font-medium text-slate-400">
            <Calendar size={15} /> Fecha
          </span>
          <div className="flex items-center gap-2">
            {form.fecha !== hoyISO() && (
              <button
                type="button"
                onClick={() => set('fecha', hoyISO())}
                className="rounded-lg bg-slate-800 px-3 py-2 text-sm font-medium text-indigo-300 active:scale-95"
              >
                Hoy
              </button>
            )}
            <input
              id="fecha"
              type="date"
              value={form.fecha}
              onChange={(e) => set('fecha', e.target.value)}
              className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-base text-slate-100"
            />
          </div>
        </div>

        {/* Categoría */}
        <Seccion titulo="Categoría">
          <div className="grid grid-cols-2 gap-2">
            {categorias.map((cat) => (
              <Chip
                key={cat}
                label={cat}
                icono={getIcono(cat)}
                tone={form.tipo}
                selected={form.categoria === cat}
                onClick={() => elegirCategoria(cat)}
              />
            ))}
          </div>
        </Seccion>

        {/* Subcategoría */}
        {form.categoria && (
          <Seccion titulo="Subcategoría" animar>
            <div className="grid grid-cols-2 gap-2">
              {subcategorias.map((sub) => (
                <Chip
                  key={sub}
                  label={sub}
                  tone={form.tipo}
                  selected={form.subcategoria === sub}
                  onClick={() => set('subcategoria', sub)}
                />
              ))}
            </div>
          </Seccion>
        )}

        {/* Método */}
        <Seccion titulo={esGasto ? 'Método de pago' : 'Dónde entró'}>
          <div className="grid grid-cols-2 gap-2">
            {metodos.map((m) => (
              <Chip
                key={m}
                label={m}
                icono={getIcono(m)}
                tone={form.tipo}
                selected={form.metodo === m}
                onClick={() => set('metodo', m)}
              />
            ))}
          </div>
        </Seccion>

        {/* Descripción (opcional) */}
        {mostrarNota ? (
          <div className="animate-fade-up">
            <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-slate-400">
              <StickyNote size={15} /> Nota (opcional)
            </label>
            <input
              type="text"
              value={form.descripcion}
              onChange={(e) => set('descripcion', e.target.value)}
              placeholder="Una nota corta…"
              className="w-full rounded-2xl border border-slate-700 bg-slate-800/60 px-4 py-3 text-base text-slate-100 outline-none focus:border-indigo-500 placeholder:text-slate-600"
            />
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

        <div className="h-4" />
      </div>

      {/* Barra de guardar (siempre a mano) */}
      <div className="safe-bottom sticky bottom-0 z-10 border-t border-white/5 bg-slate-950/80 px-4 pt-3 backdrop-blur-md">
        <div className="flex gap-2">
          {esEdicion && (
            <button
              type="button"
              onClick={onCancelarEdicion}
              className="min-h-14 flex-1 rounded-2xl bg-slate-800 text-base font-semibold text-slate-200 active:scale-95"
            >
              Cancelar
            </button>
          )}
          <button
            type="submit"
            disabled={!completo}
            className={`flex min-h-14 items-center justify-center gap-2 rounded-2xl text-lg font-bold transition-all ${
              esEdicion ? 'flex-1' : 'w-full'
            } ${
              completo
                ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-lg shadow-indigo-500/30 active:scale-[0.98]'
                : 'cursor-not-allowed bg-slate-800 text-slate-600'
            }`}
          >
            <Check size={20} strokeWidth={3} />
            {esEdicion ? 'Actualizar' : 'Guardar'}
          </button>
        </div>
      </div>
    </form>
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
