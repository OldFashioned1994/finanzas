import { TINTA, FLUJO } from '../../utils/paleta'
import { formatCorto } from '../../utils/format'

// Evolución mensual como barras divergentes desde el cero: los ingresos suben,
// los gastos bajan. La identidad de cada serie la lleva la POSICIÓN respecto de
// la línea cero, no solo el color — el par rosa/verde es justamente el que no se
// distingue en daltonismo rojo-verde, así que nunca queda como único canal.
// Un solo eje vertical compartido: las dos series son la misma magnitud (plata).

const W = 320
const H = 150
const PAD_SUP = 10
const PAD_INF = 20

export default function EvolucionMeses({ serie, mesActivo, onSelect }) {
  const max = Math.max(...serie.map((s) => Math.max(s.gastos, s.ingresos)), 1)
  const alto = H - PAD_SUP - PAD_INF
  const maxIngreso = Math.max(...serie.map((s) => s.ingresos), 0)
  const maxGasto = Math.max(...serie.map((s) => s.gastos), 0)
  const total = maxIngreso + maxGasto || 1

  // El cero se ubica según cuánto espacio pide cada lado, pero la ESCALA es
  // única para arriba y abajo: 1 peso mide lo mismo en las dos direcciones.
  const yCero = PAD_SUP + alto * (maxIngreso / total)
  const escala = alto / total

  const anchoMes = W / serie.length
  const anchoBarra = Math.min(anchoMes * 0.56, 16)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 'auto' }}>
      {/* Línea cero */}
      <line x1="0" y1={yCero} x2={W} y2={yCero} stroke={TINTA.eje} strokeWidth="1" />

      {serie.map((s, i) => {
        const cx = i * anchoMes + anchoMes / 2
        const x = cx - anchoBarra / 2
        const hIng = s.ingresos * escala
        const hGas = s.gastos * escala
        const activo = s.mes === mesActivo
        return (
          <g key={s.mes} onClick={() => onSelect?.(s.mes)} className="cursor-pointer">
            {/* Zona táctil holgada: el dedo no tiene que acertarle a la barra */}
            <rect x={i * anchoMes} y="0" width={anchoMes} height={H} fill="transparent" />
            {activo && (
              <rect
                x={i * anchoMes + 1}
                y={PAD_SUP - 6}
                width={anchoMes - 2}
                height={alto + 12}
                rx="6"
                fill="rgba(148,163,184,0.12)"
              />
            )}
            {s.ingresos > 0 && (
              <path
                d={barra(x, yCero - hIng, anchoBarra, hIng, true)}
                fill={FLUJO.ingreso}
                opacity={activo || !mesActivo ? 1 : 0.55}
              />
            )}
            {s.gastos > 0 && (
              <path
                d={barra(x, yCero, anchoBarra, hGas, false)}
                fill={FLUJO.gasto}
                opacity={activo || !mesActivo ? 1 : 0.55}
              />
            )}
            <text
              x={cx}
              y={H - 7}
              textAnchor="middle"
              fontSize="9"
              fill={activo ? TINTA.primaria : TINTA.tenue}
              className={activo ? 'font-bold' : ''}
            >
              {inicialMes(s.mes)}
            </text>
          </g>
        )
      })}

      {/* Etiqueta directa del mes activo, para no depender de un tooltip */}
      {(() => {
        const s = serie.find((x) => x.mes === mesActivo)
        if (!s || (!s.gastos && !s.ingresos)) return null
        const i = serie.indexOf(s)
        const cx = i * anchoMes + anchoMes / 2
        const anclaIzq = cx < 60
        const anclaDer = cx > W - 60
        return (
          <text
            x={anclaIzq ? 2 : anclaDer ? W - 2 : cx}
            y={PAD_SUP - 1}
            textAnchor={anclaIzq ? 'start' : anclaDer ? 'end' : 'middle'}
            fontSize="9.5"
            fill={TINTA.secundaria}
            className="font-semibold"
          >
            −{formatCorto(s.gastos)} · +{formatCorto(s.ingresos)}
          </text>
        )
      })()}

      <title>{`Máximo del período: ${formatCorto(max)}`}</title>
    </svg>
  )
}

// Barra con el extremo de dato redondeado y el otro anclado a la línea cero.
function barra(x, y, w, h, haciaArriba) {
  const r = Math.min(3, w / 2, h)
  if (h <= 0.5) return ''
  return haciaArriba
    ? `M${x},${y + h} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + w - r},${y} Q${x + w},${y} ${x + w},${y + r} L${x + w},${y + h} Z`
    : `M${x},${y} L${x},${y + h - r} Q${x},${y + h} ${x + r},${y + h} L${x + w - r},${y + h} Q${x + w},${y + h} ${x + w},${y + h - r} L${x + w},${y} Z`
}

const INICIALES = ['E', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']

function inicialMes(mesISO) {
  return INICIALES[Number(mesISO.slice(5, 7)) - 1] ?? '?'
}
