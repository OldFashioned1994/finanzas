import { useMemo, useState } from 'react'
import { Plus, Receipt, PieChart, Settings, Wallet, PiggyBank, ChevronLeft } from 'lucide-react'
import CargarMovimiento from './components/CargarMovimiento'
import ListaMovimientos from './components/ListaMovimientos'
import Dashboard from './components/Dashboard'
import Ajustes from './components/Ajustes'
import Fondos from './components/Fondos'
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
  fondos: 'Fondos',
  ajustes: 'Ajustes',
}

function Contenido() {
  const { fijos } = useDatos()
  // Abre en el panel: lo primero que querés ver al entrar es cómo venís, no un
  // formulario en blanco. Para cargar está el botón flotante.
  const [vista, setVista] = useState('panel')
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
      return
    }
    // Cargar es una pantalla aparte: al guardar se cierra y volvés al panel, con
    // el balance ya actualizado. Si querés cargar otro, el + está ahí mismo.
    setPlantilla(null)
    setVista('panel')
  }

  // La carga es una pantalla aparte: se entra con el botón +, se sale con la
  // flecha. Mientras estás cargando, la barra de abajo se va para dejar toda la
  // pantalla a las categorías.
  const cargando = vista === 'cargar'
  const volver = () => {
    setEditando(null)
    setPlantilla(null)
    setVista('panel')
  }

  return (
    <div className="mx-auto flex h-full max-w-md flex-col">
      <header className="safe-top z-20 flex items-center gap-2 border-b border-white/5 bg-slate-950/60 px-4 pb-2.5 backdrop-blur-md">
        {cargando ? (
          <button
            onClick={volver}
            className="-ml-1.5 flex size-9 shrink-0 items-center justify-center rounded-xl text-slate-300 active:scale-95 active:bg-white/5"
            aria-label="Volver"
          >
            <ChevronLeft size={24} />
          </button>
        ) : (
          <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-lg shadow-indigo-500/30">
            <Wallet size={17} className="text-white" strokeWidth={2.5} />
          </span>
        )}
        <h1 className="truncate text-lg font-bold text-slate-100">
          {editando ? 'Editando movimiento' : cargando ? 'Nuevo movimiento' : TITULOS[vista]}
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
          <Dashboard
            onVerMovimientos={verMovimientos}
            onToast={setToast}
            onIrAFondos={() => ir('fondos')}
          />
        )}
        {vista === 'movimientos' && (
          <ListaMovimientos
            filtroInicial={filtroMovimientos}
            onEditar={editar}
            onRepetir={repetir}
            onToast={setToast}
          />
        )}
        {vista === 'fondos' && <Fondos onToast={setToast} />}
        {vista === 'ajustes' && <Ajustes onToast={setToast} />}
      </main>

      {/* Botón de cargar: flotante y siempre a la vista, salvo cuando ya estás
          cargando. Es la acción principal de la app. */}
      {!cargando && (
        <button
          onClick={() => ir('cargar')}
          className="safe-bottom fixed bottom-16 right-4 z-30 flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-white shadow-xl shadow-indigo-500/40 transition-transform active:scale-90"
          aria-label="Cargar un movimiento"
        >
          <Plus size={28} strokeWidth={2.5} />
        </button>
      )}

      {/* Mientras cargás, la barra se va: toda la pantalla para las categorías */}
      <nav
        className={`safe-bottom z-20 grid grid-cols-4 gap-0.5 border-t border-white/5 bg-slate-950/85 px-1.5 pt-1.5 backdrop-blur-md ${
          cargando ? 'hidden' : ''
        }`}
      >
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
        <TabInferior activo={vista === 'fondos'} onClick={() => ir('fondos')} Icon={PiggyBank}>
          Fondos
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
      className={`relative flex min-h-13 flex-col items-center justify-center gap-0.5 rounded-2xl px-0.5 text-[10px] font-semibold leading-tight transition-colors active:scale-95 ${
        activo ? 'bg-indigo-500/15 text-indigo-300' : 'text-slate-500'
      }`}
    >
      <Icon size={19} strokeWidth={activo ? 2.4 : 2} />
      {children}
      {badge > 0 && (
        <span className="absolute right-1.5 top-1 flex size-4 items-center justify-center rounded-full bg-amber-400 text-[10px] font-bold text-slate-900">
          {badge}
        </span>
      )}
    </button>
  )
}
