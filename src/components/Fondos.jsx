import { useMemo, useState } from 'react'
import {
  Plus,
  TrendingUp,
  Target,
  X,
  Trash2,
  ArrowDownToLine,
  ArrowUpFromLine,
  RefreshCw,
  Coins,
  AlertCircle,
  ChevronDown,
} from 'lucide-react'
import { useDatos, useMetodosDe } from '../state/datos'
import {
  agregarFondo,
  actualizarFondo,
  borrarFondo,
  aportarAFondo,
  valuarFondo,
  acreditarInteres,
  borrarOpFondo,
} from '../db'
import { TIPOS_INVERSION, estadoFondo, resumenFondos, aporteMensualSugerido } from '../utils/fondos'
import { hoyISO, formatFecha, formatPct } from '../utils/format'
import { ARS, USD, MONEDAS, formatEn, formatRedondoEn } from '../utils/moneda'
import { parseMonto, limpiarInputMonto } from '../utils/monto'
import Tarjeta from './Tarjeta'

export default function Fondos({ onToast }) {
  const { fondos, opsFondo, conversor, ajustes } = useDatos()
  const [clase, setClase] = useState('inversion')
  const [creando, setCreando] = useState(false)
  const [abierto, setAbierto] = useState(null)

  const monedaVista = ajustes.monedaPanel === USD ? USD : ARS
  const delaClase = useMemo(() => fondos.filter((f) => f.clase === clase), [fondos, clase])
  const resumen = useMemo(
    () => resumenFondos(delaClase, opsFondo, conversor, monedaVista),
    [delaClase, opsFondo, conversor, monedaVista],
  )

  const esInversion = clase === 'inversion'

  return (
    <div className="space-y-3 px-3 pb-6 pt-3">
      <div className="grid grid-cols-2 gap-1 rounded-2xl bg-slate-800/50 p-1 ring-1 ring-white/5">
        <button
          onClick={() => {
            setClase('inversion')
            setCreando(false)
            setAbierto(null)
          }}
          className={`flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold active:scale-95 ${
            esInversion ? 'bg-indigo-500 text-white' : 'text-slate-400'
          }`}
        >
          <TrendingUp size={17} /> Inversiones
        </button>
        <button
          onClick={() => {
            setClase('meta')
            setCreando(false)
            setAbierto(null)
          }}
          className={`flex min-h-11 items-center justify-center gap-2 rounded-xl text-sm font-semibold active:scale-95 ${
            !esInversion ? 'bg-indigo-500 text-white' : 'text-slate-400'
          }`}
        >
          <Target size={17} /> Metas
        </button>
      </div>

      {/* Totales */}
      {delaClase.length > 0 && (
        <Tarjeta>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs text-slate-400">{esInversion ? 'Valor hoy' : 'Juntado'}</p>
              <p className="mt-0.5 truncate text-2xl font-bold tabular-nums text-slate-50">
                {formatRedondoEn(resumen.valor, monedaVista)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">
                {esInversion ? 'Rendimiento' : 'Aportado'}
              </p>
              <p
                className={`mt-0.5 truncate text-2xl font-bold tabular-nums ${
                  esInversion
                    ? resumen.rendimiento >= 0
                      ? 'text-emerald-400'
                      : 'text-rose-400'
                    : 'text-slate-300'
                }`}
              >
                {esInversion
                  ? formatRedondoEn(resumen.rendimiento, monedaVista)
                  : formatRedondoEn(resumen.aportado, monedaVista)}
              </p>
              {esInversion && resumen.rendimientoPct != null && (
                <p
                  className={`text-xs font-medium ${
                    resumen.rendimiento >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {resumen.rendimiento >= 0 ? '+' : ''}
                  {formatPct(resumen.rendimientoPct, 1)} sobre lo aportado
                </p>
              )}
            </div>
          </div>
        </Tarjeta>
      )}

      {/* Lista de fondos */}
      {resumen.estados.length === 0 && !creando && (
        <Tarjeta>
          <div className="flex flex-col items-center gap-3 py-10 text-center text-slate-500">
            {esInversion ? <TrendingUp size={38} strokeWidth={1.5} /> : <Target size={38} strokeWidth={1.5} />}
            <p className="max-w-xs text-sm leading-relaxed">
              {esInversion
                ? 'Acá van tus plazos fijos, dólares guardados, fondos y cripto. Cargás cuánto pusiste y cuánto vale hoy, y la app calcula lo que rindió.'
                : 'Metas para juntar de a poco: un viaje, el seguro anual, el fondo de emergencia.'}
            </p>
          </div>
        </Tarjeta>
      )}

      {resumen.estados.map((estado) => (
        <FichaFondo
          key={estado.fondo.id}
          estado={estado}
          abierto={abierto === estado.fondo.id}
          onToggle={() => setAbierto(abierto === estado.fondo.id ? null : estado.fondo.id)}
          onToast={onToast}
        />
      ))}

      {creando ? (
        <FormularioFondo
          clase={clase}
          onCancelar={() => setCreando(false)}
          onGuardar={async (datos) => {
            await agregarFondo({ clase, ...datos })
            setCreando(false)
            onToast?.({ msg: esInversion ? 'Inversión creada' : 'Meta creada', tone: 'ok' })
          }}
        />
      ) : (
        <button
          onClick={() => setCreando(true)}
          className="flex min-h-12 w-full items-center justify-center gap-1.5 rounded-2xl bg-indigo-500 font-semibold text-white active:scale-95"
        >
          <Plus size={19} /> {esInversion ? 'Nueva inversión' : 'Nueva meta'}
        </button>
      )}

      <p className="px-2 pt-1 text-center text-xs leading-relaxed text-slate-600">
        Poner plata acá no cuenta como gasto: es una transferencia entre bolsillos tuyos.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------

function FichaFondo({ estado, abierto, onToggle, onToast }) {
  const { fondo, valor, aportado, rendimiento, rendimientoPct, ultimaValuacion, diasDesdeValuacion } =
    estado
  const [accion, setAccion] = useState(null)
  const moneda = fondo.moneda ?? ARS
  const esMeta = fondo.clase === 'meta'
  const sugerido = aporteMensualSugerido(estado)

  const eliminar = async () => {
    if (!window.confirm(`¿Borrar "${fondo.nombre}" y todo su historial?`)) return
    await borrarFondo(fondo.id)
    onToast?.({ msg: 'Fondo borrado', tone: 'info' })
  }

  return (
    <Tarjeta ajustado>
      <button onClick={onToggle} className="flex w-full items-center gap-3 p-1 text-left">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-slate-800 text-xl">
          {fondo.emoji}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold text-slate-100">{fondo.nombre}</span>
          <span className="block truncate text-xs text-slate-500">
            {esMeta
              ? `Objetivo ${formatRedondoEn(fondo.objetivo, moneda)}`
              : `${TIPOS_INVERSION.find((t) => t.id === fondo.tipo)?.nombre ?? 'Otro'} · aportaste ${formatRedondoEn(aportado, moneda)}`}
          </span>
        </span>
        <span className="shrink-0 text-right">
          <span className="block font-bold tabular-nums text-slate-50">
            {formatRedondoEn(valor, moneda)}
          </span>
          {!esMeta && rendimientoPct != null && (
            <span
              className={`block text-xs font-semibold tabular-nums ${
                rendimiento >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {rendimiento >= 0 ? '+' : ''}
              {formatPct(rendimientoPct, 1)}
            </span>
          )}
        </span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-slate-500 transition-transform ${abierto ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Progreso de la meta */}
      {esMeta && estado.progreso != null && (
        <div className="mt-2 px-1">
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-emerald-500 transition-all"
              style={{ width: `${estado.progreso * 100}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between text-xs">
            <span className="font-medium text-emerald-400">{formatPct(estado.progreso, 0)}</span>
            <span className="text-slate-500">
              {estado.falta > 0 ? `faltan ${formatRedondoEn(estado.falta, moneda)}` : '¡Completa!'}
              {sugerido ? ` · ${formatRedondoEn(sugerido, moneda)}/mes` : ''}
            </span>
          </div>
        </div>
      )}

      {/* Aviso de valuación vieja: un valor de hace tres meses no es el valor */}
      {!esMeta && diasDesdeValuacion != null && diasDesdeValuacion > 45 && (
        <p className="mt-2 flex items-center gap-1.5 rounded-xl bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-200">
          <AlertCircle size={13} className="shrink-0" />
          Valuado hace {diasDesdeValuacion} días: actualizalo para que el número sirva.
        </p>
      )}
      {!esMeta && !ultimaValuacion && aportado > 0 && (
        <p className="mt-2 flex items-center gap-1.5 rounded-xl bg-slate-800/60 px-2.5 py-1.5 text-xs text-slate-400">
          <AlertCircle size={13} className="shrink-0" />
          Todavía no cargaste cuánto vale: se muestra lo aportado.
        </p>
      )}

      {abierto && (
        <div className="animate-fade-up mt-3 space-y-3 border-t border-white/5 pt-3">
          {/* Acciones */}
          <div className="grid grid-cols-4 gap-1.5">
            <BotonAccion Icon={ArrowDownToLine} onClick={() => setAccion('aporte')} tono="emerald">
              Aportar
            </BotonAccion>
            <BotonAccion Icon={ArrowUpFromLine} onClick={() => setAccion('retiro')}>
              Retirar
            </BotonAccion>
            <BotonAccion Icon={RefreshCw} onClick={() => setAccion('valuacion')}>
              Valuar
            </BotonAccion>
            {!esMeta && (
              <BotonAccion Icon={Coins} onClick={() => setAccion('interes')} tono="amber">
                Interés
              </BotonAccion>
            )}
          </div>

          {accion && (
            <FormularioOperacion
              fondo={fondo}
              accion={accion}
              onCancelar={() => setAccion(null)}
              onListo={(msg) => {
                setAccion(null)
                onToast?.({ msg, tone: 'ok' })
              }}
            />
          )}

          {/* Historial */}
          {estado.ops.length > 0 && (
            <div>
              <p className="mb-1.5 text-xs font-medium text-slate-400">Movimientos del fondo</p>
              <ul className="space-y-1">
                {[...estado.ops].reverse().slice(0, 12).map((op) => (
                  <li
                    key={op.id}
                    className="flex items-center gap-2 rounded-xl bg-slate-800/40 px-2.5 py-1.5 text-sm"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-slate-300">{NOMBRE_OP[op.tipo]}</span>
                      <span className="block text-xs text-slate-500">
                        {formatFecha(op.fecha)}
                        {op.tipo === 'interes' && (op.cobrado ? ' · cobrado' : ' · reinvertido')}
                      </span>
                    </span>
                    <span className={`shrink-0 tabular-nums ${COLOR_OP[op.tipo]}`}>
                      {op.tipo === 'retiro' ? '−' : op.tipo === 'valuacion' ? '=' : '+'}
                      {formatEn(op.monto, moneda)}
                    </span>
                    <button
                      onClick={() => borrarOpFondo(op.id)}
                      className="shrink-0 text-slate-600 active:text-rose-400"
                      aria-label="Borrar operación"
                    >
                      <X size={14} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex items-center justify-between border-t border-white/5 pt-2">
            <label className="flex items-center gap-2 text-xs text-slate-400">
              <input
                type="checkbox"
                checked={!fondo.activo}
                onChange={(e) => actualizarFondo(fondo.id, { activo: e.target.checked ? 0 : 1 })}
                className="size-4 accent-indigo-500"
              />
              Archivado
            </label>
            <button
              onClick={eliminar}
              className="flex items-center gap-1 text-xs font-semibold text-rose-400 active:text-rose-300"
            >
              <Trash2 size={13} /> Borrar
            </button>
          </div>
        </div>
      )}
    </Tarjeta>
  )
}

const NOMBRE_OP = {
  aporte: 'Aporte',
  retiro: 'Retiro',
  valuacion: 'Valuación',
  interes: 'Interés',
}
const COLOR_OP = {
  aporte: 'text-emerald-400',
  retiro: 'text-rose-400',
  valuacion: 'text-slate-300',
  interes: 'text-amber-300',
}

function BotonAccion({ Icon, children, onClick, tono = 'slate' }) {
  const clases =
    tono === 'emerald'
      ? 'bg-emerald-500/15 text-emerald-300'
      : tono === 'amber'
        ? 'bg-amber-500/15 text-amber-300'
        : 'bg-slate-800 text-slate-300'
  return (
    <button
      onClick={onClick}
      className={`flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-semibold active:scale-95 ${clases}`}
    >
      <Icon size={16} />
      {children}
    </button>
  )
}

// ---------------------------------------------------------------------------

function FormularioOperacion({ fondo, accion, onCancelar, onListo }) {
  const [monto, setMonto] = useState('')
  const [fecha, setFecha] = useState(hoyISO())
  const [metodo, setMetodo] = useState('')
  const [cobrado, setCobrado] = useState(false)
  const [nota, setNota] = useState('')
  const metodos = useMetodosDe(accion === 'retiro' || (accion === 'interes' && cobrado) ? 'ingreso' : 'gasto')

  const montoNum = parseMonto(monto)
  const valido = Number.isFinite(montoNum) && montoNum > 0
  // Solo el aporte y el retiro necesitan saber de dónde sale o a dónde entra.
  const pideMetodo = accion === 'aporte' || accion === 'retiro' || (accion === 'interes' && cobrado)

  const titulos = {
    aporte: 'Poner plata',
    retiro: 'Sacar plata',
    valuacion: 'Cuánto vale hoy',
    interes: 'Interés acreditado',
  }

  const guardar = async () => {
    if (!valido) return
    if (accion === 'aporte' || accion === 'retiro') {
      await aportarAFondo(fondo.id, {
        fecha,
        monto: montoNum,
        metodo: metodo || null,
        moneda: fondo.moneda,
        nota,
        retiro: accion === 'retiro',
      })
      onListo(accion === 'aporte' ? 'Aporte registrado' : 'Retiro registrado')
    } else if (accion === 'valuacion') {
      await valuarFondo(fondo.id, { fecha, monto: montoNum, nota })
      onListo('Valor actualizado')
    } else {
      await acreditarInteres(fondo.id, {
        fecha,
        monto: montoNum,
        cobrado,
        metodo: cobrado ? metodo || null : null,
        nota,
      })
      onListo('Interés registrado')
    }
  }

  return (
    <div className="animate-fade-up space-y-2 rounded-2xl border border-indigo-500/25 bg-slate-900/60 p-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200">{titulos[accion]}</h3>
        <button onClick={onCancelar} className="text-slate-500">
          <X size={18} />
        </button>
      </div>

      <div className="flex gap-2">
        <div className="flex min-h-12 flex-1 items-center rounded-xl bg-slate-800 px-3">
          <span className="text-slate-500">{MONEDAS[fondo.moneda ?? ARS].simbolo}</span>
          <input
            value={monto}
            inputMode="decimal"
            autoFocus
            onChange={(e) => setMonto(limpiarInputMonto(e.target.value))}
            placeholder="0"
            className="w-full bg-transparent px-2 text-lg font-semibold tabular-nums text-slate-100 outline-none placeholder:text-slate-600"
            aria-label="Monto"
          />
        </div>
        <input
          type="date"
          value={fecha}
          onChange={(e) => e.target.value && setFecha(e.target.value)}
          className="min-h-12 shrink-0 rounded-xl border border-slate-700 bg-slate-800 px-2 text-sm text-slate-100"
          aria-label="Fecha"
        />
      </div>

      {accion === 'interes' && (
        <label className="flex items-start gap-2 rounded-xl bg-slate-800/60 p-2.5">
          <input
            type="checkbox"
            checked={cobrado}
            onChange={(e) => setCobrado(e.target.checked)}
            className="mt-0.5 size-4 shrink-0 accent-emerald-500"
          />
          <span className="text-xs leading-relaxed text-slate-300">
            <strong className="font-semibold">Lo cobré</strong> — la plata salió del fondo y entró a
            una cuenta. Se registra como ingreso del mes.
            <span className="mt-0.5 block text-slate-500">
              Si no lo marcás, el interés queda adentro reinvirtiéndose y solo sube el valor del
              fondo.
            </span>
          </span>
        </label>
      )}

      {pideMetodo && (
        <select
          value={metodo}
          onChange={(e) => setMetodo(e.target.value)}
          className="min-h-11 w-full rounded-xl border border-slate-700/70 bg-slate-800/60 px-3 text-base text-slate-100 outline-none focus:border-indigo-500"
        >
          <option value="">
            {accion === 'aporte' ? 'De dónde sale… (opcional)' : 'A dónde entra… (opcional)'}
          </option>
          {metodos.map((m) => (
            <option key={m.id} value={m.nombre}>
              {m.nombre}
            </option>
          ))}
        </select>
      )}

      <input
        type="text"
        value={nota}
        onChange={(e) => setNota(e.target.value)}
        placeholder="Nota (opcional)"
        className="min-h-11 w-full rounded-xl border border-slate-700/70 bg-slate-800/60 px-3 text-base text-slate-100 outline-none placeholder:text-slate-600 focus:border-indigo-500"
      />

      <button
        onClick={guardar}
        disabled={!valido}
        className={`min-h-12 w-full rounded-xl font-bold active:scale-95 ${
          valido ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-600'
        }`}
      >
        Guardar
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------

function FormularioFondo({ clase, onGuardar, onCancelar }) {
  const esInversion = clase === 'inversion'
  const [nombre, setNombre] = useState('')
  const [tipo, setTipo] = useState('plazo_fijo')
  const [moneda, setMoneda] = useState(ARS)
  const [emoji, setEmoji] = useState(esInversion ? '🏦' : '🎯')
  const [objetivo, setObjetivo] = useState('')
  const [fechaObjetivo, setFechaObjetivo] = useState('')

  const objetivoNum = parseMonto(objetivo)
  const valido = nombre.trim() && (esInversion || (Number.isFinite(objetivoNum) && objetivoNum > 0))

  const elegirTipo = (t) => {
    setTipo(t.id)
    setEmoji(t.emoji)
    if (t.id === 'dolares') setMoneda(USD)
  }

  return (
    <div className="animate-fade-up space-y-2.5 rounded-2xl border border-indigo-500/25 bg-slate-900/60 p-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-200">
          {esInversion ? 'Nueva inversión' : 'Nueva meta'}
        </h3>
        <button onClick={onCancelar} className="text-slate-500">
          <X size={18} />
        </button>
      </div>

      <div className="flex gap-2">
        <input
          value={emoji}
          onChange={(e) => setEmoji(e.target.value.slice(0, 2))}
          maxLength={2}
          className="size-12 shrink-0 rounded-xl bg-slate-800 text-center text-xl outline-none focus:ring-1 focus:ring-indigo-500"
          aria-label="Emoji"
        />
        <input
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          placeholder={esInversion ? 'Plazo fijo Galicia' : 'Viaje a Brasil'}
          className="min-h-12 flex-1 rounded-xl border border-slate-700/70 bg-slate-800/60 px-3 text-base text-slate-100 outline-none placeholder:text-slate-600 focus:border-indigo-500"
          aria-label="Nombre"
        />
      </div>

      {esInversion && (
        <div className="grid grid-cols-3 gap-1.5">
          {TIPOS_INVERSION.map((t) => (
            <button
              key={t.id}
              onClick={() => elegirTipo(t)}
              className={`flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl px-1 text-[11px] font-medium leading-tight active:scale-95 ${
                tipo === t.id ? 'bg-indigo-500/25 text-indigo-100 ring-1 ring-indigo-400/40' : 'bg-slate-800 text-slate-400'
              }`}
            >
              <span className="text-base">{t.emoji}</span>
              {t.nombre}
            </button>
          ))}
        </div>
      )}

      {!esInversion && (
        <div className="flex gap-2">
          <div className="flex min-h-12 flex-1 items-center rounded-xl bg-slate-800 px-3">
            <span className="text-slate-500">{MONEDAS[moneda].simbolo}</span>
            <input
              value={objetivo}
              inputMode="decimal"
              onChange={(e) => setObjetivo(limpiarInputMonto(e.target.value))}
              placeholder="Objetivo"
              className="w-full bg-transparent px-2 text-base tabular-nums text-slate-100 outline-none placeholder:text-slate-600"
              aria-label="Objetivo"
            />
          </div>
          <input
            type="date"
            value={fechaObjetivo}
            onChange={(e) => setFechaObjetivo(e.target.value)}
            className="min-h-12 shrink-0 rounded-xl border border-slate-700 bg-slate-800 px-2 text-sm text-slate-100"
            aria-label="Fecha objetivo"
          />
        </div>
      )}

      <div className="flex gap-1 rounded-xl bg-slate-800/60 p-1">
        {[ARS, USD].map((m) => (
          <button
            key={m}
            onClick={() => setMoneda(m)}
            className={`min-h-9 flex-1 rounded-lg text-sm font-semibold ${
              moneda === m ? 'bg-slate-700 text-white' : 'text-slate-400'
            }`}
          >
            {MONEDAS[m].nombre}
          </button>
        ))}
      </div>

      <button
        onClick={() =>
          onGuardar({
            nombre: nombre.trim(),
            emoji,
            tipo: esInversion ? tipo : null,
            moneda,
            objetivo: esInversion ? null : objetivoNum,
            fechaObjetivo: fechaObjetivo || null,
          })
        }
        disabled={!valido}
        className={`min-h-12 w-full rounded-xl font-bold active:scale-95 ${
          valido ? 'bg-indigo-500 text-white' : 'bg-slate-800 text-slate-600'
        }`}
      >
        Crear
      </button>
    </div>
  )
}
