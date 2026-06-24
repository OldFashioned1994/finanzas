import { useState } from 'react'
import { PlusCircle, Receipt, Download, Wallet } from 'lucide-react'
import CargarMovimiento from './components/CargarMovimiento'
import ListaMovimientos from './components/ListaMovimientos'
import Toast from './components/Toast'
import { db } from './db'
import { exportarXlsx } from './utils/export'

export default function App() {
  const [vista, setVista] = useState('cargar') // 'cargar' | 'movimientos'
  const [editando, setEditando] = useState(null)
  const [toast, setToast] = useState(null)

  const irACargar = () => {
    setEditando(null)
    setVista('cargar')
  }

  const irAMovimientos = () => {
    setEditando(null)
    setVista('movimientos')
  }

  const handleEditar = (mov) => {
    setEditando(mov)
    setVista('cargar')
  }

  const handleGuardado = (t) => {
    setToast(t)
    if (editando) {
      setEditando(null)
      setVista('movimientos')
    }
  }

  const exportar = async () => {
    try {
      const movimientos = await db.movimientos.toArray()
      if (movimientos.length === 0) {
        setToast({ msg: 'No hay movimientos para exportar', tone: 'info' })
        return
      }
      await exportarXlsx(movimientos)
      setToast({ msg: `Exportados ${movimientos.length} movimientos`, tone: 'ok' })
    } catch (err) {
      console.error(err)
      setToast({ msg: 'No se pudo exportar', tone: 'error' })
    }
  }

  return (
    <div className="mx-auto flex h-full max-w-md flex-col">
      {/* Header */}
      <header className="safe-top z-20 border-b border-white/5 bg-slate-950/60 px-4 pb-3 backdrop-blur-md">
        <div className="mb-3 flex items-center justify-between">
          <h1 className="flex items-center gap-2 text-xl font-bold text-slate-100">
            <span className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-500 shadow-lg shadow-indigo-500/30">
              <Wallet size={17} className="text-white" strokeWidth={2.5} />
            </span>
            Finanzas
          </h1>
          {vista === 'movimientos' && (
            <button
              onClick={exportar}
              className="flex items-center gap-1.5 rounded-xl bg-slate-800 px-3.5 py-2 text-sm font-semibold text-indigo-300 active:scale-95 active:bg-slate-700"
            >
              <Download size={16} /> Exportar
            </button>
          )}
        </div>

        {/* Tabs */}
        <nav className="grid grid-cols-2 gap-1.5 rounded-2xl bg-slate-800/50 p-1.5 ring-1 ring-white/5">
          <TabButton activo={vista === 'cargar'} onClick={irACargar} Icon={PlusCircle}>
            {editando ? 'Editando' : 'Cargar'}
          </TabButton>
          <TabButton activo={vista === 'movimientos'} onClick={irAMovimientos} Icon={Receipt}>
            Movimientos
          </TabButton>
        </nav>
      </header>

      {/* Contenido */}
      <main className="flex-1 overflow-y-auto">
        {vista === 'cargar' ? (
          <CargarMovimiento
            editando={editando}
            onGuardado={handleGuardado}
            onCancelarEdicion={irAMovimientos}
          />
        ) : (
          <ListaMovimientos onEditar={handleEditar} />
        )}
      </main>

      <Toast toast={toast} onDone={() => setToast(null)} />
    </div>
  )
}

function TabButton({ activo, onClick, Icon, children }) {
  return (
    <button
      onClick={onClick}
      className={`flex min-h-11 items-center justify-center gap-2 rounded-xl text-base font-semibold transition-all active:scale-95 ${
        activo ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/25' : 'text-slate-400'
      }`}
    >
      <Icon size={18} strokeWidth={2.5} />
      {children}
    </button>
  )
}
