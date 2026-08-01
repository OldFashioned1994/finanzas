import { useEffect, useState } from 'react'
import { CheckCircle2, Info, AlertCircle, Undo2 } from 'lucide-react'

// Toast de confirmación rápida. Se auto-oculta.
// Si el toast trae `undo`, se muestra el botón de deshacer y el toast dura más:
// equivocarse de tecla al cargar es lo más común, y volver atrás tiene que ser
// un toque, no ir a buscar el movimiento a la lista.
export default function Toast({ toast, onDone }) {
  const [deshecho, setDeshecho] = useState(false)

  useEffect(() => {
    setDeshecho(false)
    if (!toast) return
    const t = setTimeout(onDone, toast.undo ? 4200 : 1800)
    return () => clearTimeout(t)
  }, [toast, onDone])

  if (!toast) return null

  const config = {
    ok: { cls: 'bg-emerald-500', Icon: CheckCircle2 },
    info: { cls: 'bg-indigo-500', Icon: Info },
    error: { cls: 'bg-rose-500', Icon: AlertCircle },
  }
  const { cls, Icon } = config[toast.tone] || config.ok

  const deshacer = async () => {
    setDeshecho(true)
    navigator.vibrate?.(12)
    await toast.undo()
    onDone()
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-50 flex justify-center px-4">
      <div
        className={`safe-top animate-pop-in pointer-events-auto flex max-w-full items-center gap-2 rounded-2xl py-2.5 pl-4 pr-2.5 text-base font-semibold text-white shadow-xl shadow-black/30 ${cls}`}
      >
        <Icon size={20} strokeWidth={2.5} className="shrink-0" />
        <span className="min-w-0 truncate">{toast.msg}</span>
        {toast.undo && !deshecho && (
          <button
            onClick={deshacer}
            className="ml-1 flex shrink-0 items-center gap-1 rounded-xl bg-black/25 px-2.5 py-1.5 text-sm font-bold active:scale-95"
          >
            <Undo2 size={15} strokeWidth={2.5} /> Deshacer
          </button>
        )}
      </div>
    </div>
  )
}
