import { TINTA, FLUJO } from '../../utils/paleta'
import { formatCortoEn, ARS } from '../../utils/moneda'

// Ritmo de gasto: cuánto llevás gastado acumulado día a día, contra la misma
// curva del mes anterior. Responde "¿voy más rápido o más lento que el mes
// pasado?" sin tener que esperar al cierre.
//
// Las dos series son el mismo dato en dos momentos, así que comparten hue y se
// distinguen por intensidad + trazo punteado (canal redundante al color).

const W = 320
const H = 120
const PAD_IZQ = 4
const PAD_DER = 4
const PAD_SUP = 12
const PAD_INF = 16

export default function RitmoMes({ actual, anterior, diaHoy, moneda = ARS }) {
  const formatCorto = (n) => formatCortoEn(n, moneda)
  const maxActual = actual.length ? actual[actual.length - 1].acum : 0
  const maxAnterior = anterior.length ? anterior[anterior.length - 1].acum : 0
  const max = Math.max(maxActual, maxAnterior, 1)
  const dias = Math.max(actual.length, anterior.length, 1)

  const x = (dia) => PAD_IZQ + ((dia - 1) / Math.max(dias - 1, 1)) * (W - PAD_IZQ - PAD_DER)
  const y = (v) => H - PAD_INF - (v / max) * (H - PAD_SUP - PAD_INF)

  // El mes en curso solo se dibuja hasta hoy: proyectar la línea hasta fin de
  // mes sería mostrar como gasto real algo que todavía no pasó.
  const hasta = diaHoy ?? actual.length
  const puntosActual = actual.filter((p) => p.dia <= hasta)
  const ultimo = puntosActual[puntosActual.length - 1]

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 'auto' }}>
      {[0.5, 1].map((f) => (
        <line
          key={f}
          x1={PAD_IZQ}
          y1={y(max * f)}
          x2={W - PAD_DER}
          y2={y(max * f)}
          stroke={TINTA.grilla}
          strokeWidth="1"
        />
      ))}
      <line x1={PAD_IZQ} y1={y(0)} x2={W - PAD_DER} y2={y(0)} stroke={TINTA.eje} strokeWidth="1" />

      {anterior.length > 1 && (
        <polyline
          points={anterior.map((p) => `${x(p.dia)},${y(p.acum)}`).join(' ')}
          fill="none"
          stroke={TINTA.tenue}
          strokeWidth="2"
          strokeDasharray="4 3"
          strokeLinecap="round"
        />
      )}

      {puntosActual.length > 1 && (
        <polyline
          points={puntosActual.map((p) => `${x(p.dia)},${y(p.acum)}`).join(' ')}
          fill="none"
          stroke={FLUJO.gasto}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {ultimo && (
        <>
          <circle
            cx={x(ultimo.dia)}
            cy={y(ultimo.acum)}
            r="4"
            fill={FLUJO.gasto}
            stroke={TINTA.superficie}
            strokeWidth="2"
          />
          <text
            x={Math.min(x(ultimo.dia) + 7, W - 44)}
            y={Math.max(y(ultimo.acum) - 6, 10)}
            fontSize="10"
            fill={TINTA.primaria}
            className="font-bold"
          >
            {formatCorto(ultimo.acum)}
          </text>
        </>
      )}

      {maxAnterior > 0 && (
        <text
          x={W - PAD_DER}
          y={y(maxAnterior) - 4}
          textAnchor="end"
          fontSize="9"
          fill={TINTA.tenue}
        >
          mes anterior {formatCorto(maxAnterior)}
        </text>
      )}

      <text x={PAD_IZQ} y={H - 4} fontSize="9" fill={TINTA.tenue}>
        día 1
      </text>
      <text x={W - PAD_DER} y={H - 4} textAnchor="end" fontSize="9" fill={TINTA.tenue}>
        día {dias}
      </text>
    </svg>
  )
}
