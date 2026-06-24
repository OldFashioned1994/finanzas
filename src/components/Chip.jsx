// Botón-chip grande y táctil para elegir categoría / subcategoría / método.
// `icono` es opcional (un emoji).
export default function Chip({ label, icono, selected, onClick, tone = 'gasto' }) {
  const tones = {
    gasto: selected
      ? 'border-rose-400/60 bg-rose-500/90 text-white shadow-lg shadow-rose-500/25'
      : 'border-slate-700/70 bg-slate-800/60 text-slate-200 active:bg-slate-700',
    ingreso: selected
      ? 'border-emerald-400/60 bg-emerald-500/90 text-white shadow-lg shadow-emerald-500/25'
      : 'border-slate-700/70 bg-slate-800/60 text-slate-200 active:bg-slate-700',
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-12 items-center gap-2 rounded-2xl border px-3.5 py-3 text-left text-[15px] font-medium leading-tight transition-all active:scale-95 ${tones[tone]}`}
    >
      {icono && <span className="shrink-0 text-lg leading-none">{icono}</span>}
      <span className="min-w-0 truncate">{label}</span>
    </button>
  )
}
