// ============================================================================
//  Paleta del panel.
//  Los 8 tonos categóricos están validados para modo oscuro sobre la superficie
//  de las tarjetas (#101a2e): banda de luminosidad, croma, contraste ≥ 3:1 y
//  separación para daltonismo (peor par adyacente ΔE 8.4 protan / 8.7 tritan,
//  ΔE 19.3 en visión normal). No cambiar un hex suelto sin revalidar el set.
//
//  El color sigue a la CATEGORÍA, no a su posición en el ranking: la misma
//  categoría se ve del mismo color en marzo que en agosto, y filtrar no repinta
//  lo que quedó.
// ============================================================================

export const SERIES = [
  '#3987e5', // azul
  '#d95926', // naranja
  '#199e70', // aqua
  '#c98500', // amarillo
  '#d55181', // magenta
  '#008300', // verde
  '#9085e9', // violeta
  '#e66767', // rojo
]

export const GRIS = '#64748b' // el segmento "Otras": nunca compite con una serie

// Tinta y chrome del gráfico (siempre en tokens de texto, nunca en color de serie)
export const TINTA = {
  primaria: '#f1f5f9',
  secundaria: '#94a3b8',
  tenue: '#64748b',
  grilla: 'rgba(148, 163, 184, 0.14)',
  eje: 'rgba(148, 163, 184, 0.3)',
  superficie: '#101a2e',
}

// Gasto e ingreso conservan el código de color de toda la app (rosa / verde).
// Ese par NO se distingue en deuteranopía, así que en los gráficos la identidad
// la lleva siempre otro canal además del color: la posición respecto del cero
// en la evolución mensual, y la etiqueta directa en el resto.
export const FLUJO = {
  gasto: '#fb7185',
  ingreso: '#34d399',
  balance: '#818cf8',
}

// Semáforo de presupuesto: color + ícono + texto, nunca color solo.
export const ESTADO = {
  bien: '#0ca30c',
  atencion: '#fab219',
  excedido: '#d03b3b',
}

// Slot de color estable para una categoría, según su posición en la taxonomía.
export function colorDeCategoria(indice) {
  return SERIES[indice % SERIES.length]
}
