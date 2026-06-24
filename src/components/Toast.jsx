import { useEffect } from 'react'
import { CheckCircle2, Info, AlertCircle } from 'lucide-react'

// Toast de confirmación rápida. Se auto-oculta.
export default function Toast({ toast, onDone }) {
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(onDone, 1800)
    return () => clearTimeout(t)
  }, [toast, onDone])

  if (!toast) return null

  const config = {
    ok: { cls: 'bg-emerald-500', Icon: CheckCircle2 },
    info: { cls: 'bg-indigo-500', Icon: Info },
    error: { cls: 'bg-rose-500', Icon: AlertCircle },
  }
  const { cls, Icon } = config[toast.tone] || config.ok

  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-50 flex justify-center px-4">
      <div
        className={`safe-top animate-pop-in pointer-events-auto flex items-center gap-2 rounded-2xl px-5 py-3 text-base font-semibold text-white shadow-xl shadow-black/30 ${cls}`}
      >
        <Icon size={20} strokeWidth={2.5} />
        {toast.msg}
      </div>
    </div>
  )
}
