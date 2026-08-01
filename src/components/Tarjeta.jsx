// Contenedor visual único de todo el panel: mismo radio, mismo borde, mismo
// fondo. Si todas las secciones usan esto, el panel se lee como una sola pieza.
export default function Tarjeta({ titulo, accion, children, className = '', ajustado = false }) {
  return (
    <section
      className={`rounded-3xl border border-white/5 bg-slate-900/45 ${
        ajustado ? 'p-3' : 'p-4'
      } ${className}`}
    >
      {(titulo || accion) && (
        <header className="mb-3 flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-300">{titulo}</h2>
          {accion}
        </header>
      )}
      {children}
    </section>
  )
}
