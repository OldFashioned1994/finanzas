import { useRef, useState } from 'react'
import {
  ChevronDown,
  Tags,
  CreditCard,
  Target,
  CalendarClock,
  Database,
  Download,
  Upload,
  FileSpreadsheet,
  Sparkles,
  ShieldCheck,
  CircleDollarSign,
  Layers,
} from 'lucide-react'
import { useDatos } from '../state/datos'
import { setAjuste } from '../db'
import { exportarXlsx } from '../utils/export'
import { exportarBackup, importarBackup } from '../utils/backup'
import Tarjeta from './Tarjeta'
import EditorCategorias from './ajustes/EditorCategorias'
import EditorMetodos from './ajustes/EditorMetodos'
import EditorPresupuestos from './ajustes/EditorPresupuestos'
import EditorFijos from './ajustes/EditorFijos'
import EditorDolar from './ajustes/EditorDolar'
import EditorGrupos from './ajustes/EditorGrupos'

export default function Ajustes({ onToast }) {
  const { movimientos, categorias, fijos, presupuestos, ajustes, cotizaciones, conversor } =
    useDatos()
  const [abierta, setAbierta] = useState(null)

  const toggle = (id) => setAbierta(abierta === id ? null : id)

  return (
    <div className="space-y-2 px-3 pb-6 pt-3">
      <Seccion
        id="presupuestos"
        titulo="Presupuestos"
        detalle={`${presupuestos.length} definidos`}
        Icon={Target}
        abierta={abierta === 'presupuestos'}
        onToggle={toggle}
      >
        <EditorPresupuestos onToast={onToast} />
      </Seccion>

      <Seccion
        id="fijos"
        titulo="Gastos fijos"
        detalle={`${fijos.filter((f) => f.activo).length} activos`}
        Icon={CalendarClock}
        abierta={abierta === 'fijos'}
        onToggle={toggle}
      >
        <EditorFijos onToast={onToast} />
      </Seccion>

      <Seccion
        id="dolar"
        titulo="Dólar"
        detalle={
          cotizaciones.length
            ? `${cotizaciones.length} cotizacion${cotizaciones.length === 1 ? '' : 'es'} cargadas`
            : 'sin cotizaciones'
        }
        Icon={CircleDollarSign}
        abierta={abierta === 'dolar'}
        onToggle={toggle}
      >
        <EditorDolar onToast={onToast} />
      </Seccion>

      <Seccion
        id="grupos"
        titulo="Grupos"
        detalle="El nivel de arriba de las categorías"
        Icon={Layers}
        abierta={abierta === 'grupos'}
        onToggle={toggle}
      >
        <EditorGrupos onToast={onToast} />
      </Seccion>

      <Seccion
        id="categorias"
        titulo="Categorías"
        detalle={`${categorias.filter((c) => !c.archivada).length} activas`}
        Icon={Tags}
        abierta={abierta === 'categorias'}
        onToggle={toggle}
      >
        <EditorCategorias onToast={onToast} />
      </Seccion>

      <Seccion
        id="metodos"
        titulo="Métodos de pago"
        Icon={CreditCard}
        abierta={abierta === 'metodos'}
        onToggle={toggle}
      >
        <EditorMetodos onToast={onToast} />
      </Seccion>

      <Seccion
        id="datos"
        titulo="Datos y respaldo"
        detalle={`${movimientos.length} movimientos`}
        Icon={Database}
        abierta={abierta === 'datos'}
        onToggle={toggle}
      >
        <PanelDatos movimientos={movimientos} onToast={onToast} conversor={conversor} />
      </Seccion>

      <Seccion
        id="preferencias"
        titulo="Preferencias"
        Icon={Sparkles}
        abierta={abierta === 'preferencias'}
        onToggle={toggle}
      >
        <Interruptor
          titulo="Ordenar por uso"
          descripcion="Pone primero las categorías y métodos que más usás últimamente."
          activo={ajustes.ordenPorUso !== false}
          onChange={(v) => setAjuste('ordenPorUso', v)}
        />
      </Seccion>

      <p className="px-2 pt-2 text-center text-xs leading-relaxed text-slate-600">
        Todo se guarda en este dispositivo. Nada viaja a internet.
      </p>
    </div>
  )
}

function PanelDatos({ movimientos, onToast, conversor }) {
  const inputRef = useRef(null)
  const [modo, setModo] = useState('fusionar')
  const [ocupado, setOcupado] = useState(false)

  const exportarPlanilla = async () => {
    if (!movimientos.length) {
      onToast?.({ msg: 'No hay movimientos para exportar', tone: 'info' })
      return
    }
    await exportarXlsx(movimientos, conversor)
    onToast?.({ msg: `Exportados ${movimientos.length} movimientos`, tone: 'ok' })
  }

  const respaldar = async () => {
    const n = await exportarBackup()
    onToast?.({ msg: `Backup de ${n} movimientos descargado`, tone: 'ok' })
  }

  const restaurar = async (e) => {
    const archivo = e.target.files?.[0]
    e.target.value = ''
    if (!archivo) return
    if (
      modo === 'reemplazar' &&
      !window.confirm('Esto BORRA todo lo que hay ahora y lo reemplaza por el backup. ¿Seguís?')
    ) {
      return
    }
    setOcupado(true)
    try {
      const n = await importarBackup(archivo, modo)
      onToast?.({
        msg: modo === 'reemplazar' ? `Restaurados ${n} movimientos` : `Sumados ${n} movimientos`,
        tone: 'ok',
      })
    } catch (err) {
      onToast?.({ msg: err.message || 'No se pudo importar', tone: 'error' })
    } finally {
      setOcupado(false)
    }
  }

  return (
    <div className="space-y-3">
      <button
        onClick={respaldar}
        className="flex min-h-12 w-full items-center gap-3 rounded-2xl bg-slate-800/70 px-3 text-left active:scale-[0.99]"
      >
        <Download size={18} className="shrink-0 text-indigo-300" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-slate-100">Descargar backup</span>
          <span className="block text-xs text-slate-500">
            Copia completa (.json): movimientos, categorías, presupuestos y fijos
          </span>
        </span>
      </button>

      <button
        onClick={exportarPlanilla}
        className="flex min-h-12 w-full items-center gap-3 rounded-2xl bg-slate-800/70 px-3 text-left active:scale-[0.99]"
      >
        <FileSpreadsheet size={18} className="shrink-0 text-emerald-300" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-slate-100">Exportar planilla</span>
          <span className="block text-xs text-slate-500">
            .xlsx para abrir en Excel o Google Sheets
          </span>
        </span>
      </button>

      <div className="rounded-2xl bg-slate-800/40 p-3">
        <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-100">
          <Upload size={16} className="text-amber-300" /> Restaurar backup
        </p>
        <div className="mb-2 grid grid-cols-2 gap-1 rounded-xl bg-slate-900/60 p-1">
          <button
            onClick={() => setModo('fusionar')}
            className={`min-h-9 rounded-lg text-xs font-semibold ${
              modo === 'fusionar' ? 'bg-slate-700 text-slate-100' : 'text-slate-400'
            }`}
          >
            Sumar a lo que hay
          </button>
          <button
            onClick={() => setModo('reemplazar')}
            className={`min-h-9 rounded-lg text-xs font-semibold ${
              modo === 'reemplazar' ? 'bg-rose-500/80 text-white' : 'text-slate-400'
            }`}
          >
            Reemplazar todo
          </button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          onChange={restaurar}
          className="hidden"
        />
        <button
          onClick={() => inputRef.current?.click()}
          disabled={ocupado}
          className="min-h-11 w-full rounded-xl bg-slate-700 text-sm font-semibold text-slate-100 active:scale-95 disabled:opacity-50"
        >
          {ocupado ? 'Importando…' : 'Elegir archivo…'}
        </button>
        <p className="mt-2 text-xs leading-relaxed text-slate-500">
          {modo === 'fusionar'
            ? 'Agrega solo los movimientos que no estén ya cargados; no duplica.'
            : 'Borra todo lo actual y deja exactamente el contenido del backup.'}
        </p>
      </div>

      <div className="flex gap-2 rounded-2xl bg-slate-800/30 p-3 text-xs leading-relaxed text-slate-500">
        <ShieldCheck size={16} className="mt-0.5 shrink-0 text-slate-600" />
        <p>
          Los datos viven solo en este navegador. Si borrás los datos del sitio, desinstalás la app o
          cambiás de teléfono, se pierden: descargá un backup cada tanto y guardalo en Drive.
        </p>
      </div>
    </div>
  )
}

function Seccion({ id, titulo, detalle, Icon, abierta, onToggle, children }) {
  return (
    <Tarjeta ajustado className={abierta ? 'ring-1 ring-indigo-500/20' : ''}>
      <button
        onClick={() => onToggle(id)}
        className="flex w-full items-center gap-3 px-1 py-1.5 text-left"
      >
        <Icon size={18} className="shrink-0 text-indigo-300" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-slate-100">{titulo}</span>
          {detalle && <span className="block text-xs text-slate-500">{detalle}</span>}
        </span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-slate-500 transition-transform ${abierta ? 'rotate-180' : ''}`}
        />
      </button>
      {abierta && <div className="animate-fade-up mt-3 border-t border-white/5 pt-3">{children}</div>}
    </Tarjeta>
  )
}

function Interruptor({ titulo, descripcion, activo, onChange }) {
  return (
    <button
      onClick={() => onChange(!activo)}
      className="flex w-full items-center gap-3 rounded-2xl bg-slate-800/50 p-3 text-left active:scale-[0.99]"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-slate-100">{titulo}</span>
        <span className="block text-xs leading-relaxed text-slate-500">{descripcion}</span>
      </span>
      <span
        className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
          activo ? 'bg-indigo-500' : 'bg-slate-700'
        }`}
      >
        <span
          className={`absolute top-1 size-5 rounded-full bg-white transition-all ${
            activo ? 'left-6' : 'left-1'
          }`}
        />
      </span>
    </button>
  )
}
