import { TINTA } from '../../utils/paleta'
import { formatCorto, formatPct } from '../../utils/format'

// Anillo de composición: cuánto pesa cada categoría sobre el total del período.
// Los segmentos se separan con un hueco del color de la superficie (2px) para
// que dos tonos vecinos nunca se lean como uno solo.
const R = 46
const CIRC = 2 * Math.PI * R
const HUECO = 2.4

export default function Donut({ datos, total, seleccion, onSelect, etiqueta = 'Gastos' }) {
  let acumulado = 0
  const activo = datos.find((d) => d.nombre === seleccion)

  return (
    <svg viewBox="0 0 120 120" className="h-44 w-44 shrink-0 -rotate-90">
      {/* Riel de fondo: da forma al anillo aunque haya un solo segmento */}
      <circle cx="60" cy="60" r={R} fill="none" stroke="rgba(148,163,184,0.12)" strokeWidth="15" />

      {datos.map((d) => {
        const largo = Math.max(d.pct * CIRC - HUECO, 0.6)
        const offset = -acumulado * CIRC
        acumulado += d.pct
        const seleccionado = seleccion === d.nombre
        return (
          <circle
            key={d.nombre}
            cx="60"
            cy="60"
            r={R}
            fill="none"
            stroke={d.color}
            strokeWidth={seleccionado ? 19 : 15}
            strokeDasharray={`${largo} ${CIRC - largo}`}
            strokeDashoffset={offset}
            strokeLinecap="butt"
            opacity={seleccion && !seleccionado ? 0.35 : 1}
            className="cursor-pointer transition-all duration-200"
            onClick={() => onSelect?.(seleccionado ? null : d.nombre)}
          />
        )
      })}

      {/* Centro: el total del período, o el detalle de lo que tocaste */}
      <g className="rotate-90" style={{ transformOrigin: '60px 60px' }}>
        <text
          x="60"
          y={activo ? 52 : 55}
          textAnchor="middle"
          fontSize="9"
          fill={TINTA.secundaria}
          className="font-medium"
        >
          {activo ? recortar(activo.nombre, 14) : etiqueta}
        </text>
        <text
          x="60"
          y={activo ? 66 : 70}
          textAnchor="middle"
          fontSize={activo ? 15 : 16}
          fill={TINTA.primaria}
          className="font-bold"
        >
          {formatCorto(activo ? activo.total : total)}
        </text>
        {activo && (
          <text x="60" y="78" textAnchor="middle" fontSize="10" fill={activo.color} className="font-bold">
            {formatPct(activo.pct)}
          </text>
        )}
      </g>
    </svg>
  )
}

function recortar(texto, max) {
  return texto.length > max ? `${texto.slice(0, max - 1)}…` : texto
}
