import { Delete } from 'lucide-react'
import { OPERADORES } from '../utils/calculadora'

// Teclado numérico propio: evita que el teclado del sistema tape media
// pantalla, garantiza teclas grandes y trae la calculadora incorporada.
export default function Numpad({ onDigito, onComa, onOperador, onRetroceso, onLimpiar, tone }) {
  const tocar = (fn, arg) => () => {
    navigator.vibrate?.(8)
    fn(arg)
  }

  const acento =
    tone === 'ingreso'
      ? 'text-emerald-300 active:bg-emerald-500/20'
      : 'text-rose-300 active:bg-rose-500/20'

  return (
    <div className="grid grid-cols-4 gap-1.5 select-none">
      {['7', '8', '9'].map((d) => (
        <Tecla key={d} onClick={tocar(onDigito, d)}>
          {d}
        </Tecla>
      ))}
      <Tecla onClick={tocar(onOperador, OPERADORES[3])} className={acento}>
        ÷
      </Tecla>

      {['4', '5', '6'].map((d) => (
        <Tecla key={d} onClick={tocar(onDigito, d)}>
          {d}
        </Tecla>
      ))}
      <Tecla onClick={tocar(onOperador, OPERADORES[2])} className={acento}>
        ×
      </Tecla>

      {['1', '2', '3'].map((d) => (
        <Tecla key={d} onClick={tocar(onDigito, d)}>
          {d}
        </Tecla>
      ))}
      <Tecla onClick={tocar(onOperador, OPERADORES[1])} className={acento}>
        −
      </Tecla>

      <Tecla onClick={tocar(onComa)}>,</Tecla>
      <Tecla onClick={tocar(onDigito, '0')}>0</Tecla>
      <Tecla
        onClick={tocar(onRetroceso)}
        onContextMenu={(e) => {
          e.preventDefault()
          onLimpiar()
        }}
        className="text-slate-400"
      >
        <Delete size={22} strokeWidth={2} />
      </Tecla>
      <Tecla onClick={tocar(onOperador, OPERADORES[0])} className={acento}>
        +
      </Tecla>
    </div>
  )
}

function Tecla({ children, onClick, onContextMenu, className = '' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      onContextMenu={onContextMenu}
      className={`flex min-h-13 items-center justify-center rounded-2xl bg-slate-800/70 text-2xl font-semibold text-slate-100 ring-1 ring-white/5 transition-transform active:scale-95 active:bg-slate-700 ${className}`}
    >
      {children}
    </button>
  )
}
