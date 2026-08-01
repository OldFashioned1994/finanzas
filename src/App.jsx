import { useMemo, useState } from 'react'
import { PlusCircle, Receipt, PieChart, Settings, Wallet } from 'lucide-react'
import CargarMovimiento from './components/CargarMovimiento'
import ListaMovimientos from './components/ListaMovimientos'
import Dashboard from './components/Dashboard'
import Ajustes from './components/Ajustes'
import Toast from './components/Toast'
import { DatosProvider, useDatos } from './state/datos'
import { fijosPendientes } from './utils/calc'

export default function App() {
  return (
    <DatosProvider>
      <Contenido />
    </DatosProvider>
  )
}

const TITULOS = {
  cargar: 'Cargar',
  panel: 'Panel',
  movimientos: 'Movimientos',
  ajustes: 'Ajustes',
}

function Contenido() {
  const { fijos } = useDatos()
  const [vista, setVista] = useState('cargar')
  const [editando, setEditando] = useState(null)
  const [plantilla, setPlantilla] = useState(null)
  const [filtroMovimientos, setFiltroMovimientos] = useState(null)
  const [toast, setToast] = useState(null)

  const pendientes = useMemo(() => fijosPendientes(fijos).length, [fijos])

  const ir = (destino) => {
    if (destino !== 'cargar') setEditando(null)
    setVista(destino)
  }

  const editar = (mov) => {
    setPlantilla(null)
    setEditando(mov)
    setVista('cargar')
  }

  // Repetir: mismo movimiento, fecha de hoy, monto listo para ajustar.
  const repetir = (mov) => {
    setEditando(null)
    setPlantilla({ ...mov, _t: Date.now() })
    setVista('cargar')
    setToast({ msg: 'Listo para repetir: revisá el monto', tone: 'info' })
  }

  const verMovimientos = (filtro) => {
    setFiltroMovimientos({ ...filtro, _t: Date.now() })
    setVista('movimientos')
  }

  const guardado = (t) => {
    setToast(t)
    if (editando) {
      setEditando(null)
      setVista('movimientos')
    }
  }

  return (
    <div className="mx-auto flex h-full max-w-md flex-col">
      <header className="safe-top z-20 flex items-center justify-between border-b border-white/5 bg-slate-950/60 px-4 pb-2.5 backdrop-blur-md">
        <h1 className="flex items-center gap-2 text-lg font-bold text-slate-100">
          <span className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-lg shadow-indigo-500/30">
            <Wallet size={17} className="text-white" strokeWidth={2.5} />
          </span>
          {editando ? 'Editando movimiento' : TITULOS[vista]}
        </h1>
      </header>

      <main className="flex-1 overflow-y-auto overscroll-contain">
        {vista === 'cargar' && (
          <CargarMovimiento
            editando={editando}
            plantilla={plantilla}
            onGuardado={guardado}
            onCancelarEdicion={() => {
              setEditando(null)
              setVista('movimientos')
            }}
          />
        )}
        {vista === 'panel' && (
          <Dashboard onVerMovimientos={verMovimientos} onToast={setToast} />
        )}
        {vista === 'movimientos' && (
          <ListaMovimientos
            filtroInicial={filtroMovimientos}
            onEditar={editar}
            onRepetir={repetir}
            onToast={setToast}
          />
        )}
        {vista === 'ajustes' && <Ajustes onToast={setToast} />}
      </main>

      {/* La carga está a un toque desde cualquier pantalla */}
      <nav className="safe-bottom z-20 grid grid-cols-4 gap-1 border-t border-white/5 bg-slate-950/85 px-2 pt-1.5 backdrop-blur-md">
        <TabInferior activo={vista === 'cargar'} onClick={() => ir('cargar')} Icon={PlusCircle}>
          Cargar
        </TabInferior>
        <TabInferior
          activo={vista === 'panel'}
          onClick={() => ir('panel')}
          Icon={PieChart}
          badge={pendientes}
        >
          Panel
        </TabInferior>
        <TabInferior
          activo={vista === 'movimientos'}
          onClick={() => {
            setFiltroMovimientos(null)
            ir('movimientos')
          }}
          Icon={Receipt}
        >
          Movimientos
        </TabInferior>
        <TabInferior activo={vista === 'ajustes'} onClick={() => ir('ajustes')} Icon={Settings}>
          Ajustes
        </TabInferior>
      </nav>

      <Toast toast={toast} onDone={() => setToast(null)} />
    </div>
  )
}

function TabInferior({ activo, onClick, Icon, badge, children }) {
  return (
    <button
      onClick={onClick}
      className={`relative flex min-h-13 flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-semibold transition-colors active:scale-95 ${
        activo ? 'bg-indigo-500/15 text-indigo-300' : 'text-slate-500'
      }`}
    >
      <Icon size={21} strokeWidth={activo ? 2.4 : 2} />
      {children}
      {badge > 0 && (
        <span className="absolute right-3 top-1.5 flex size-4 items-center justify-center rounded-full bg-amber-400 text-[10px] font-bold text-slate-900">
          {badge}
        </span>
      )}
    </button>
  )
}
