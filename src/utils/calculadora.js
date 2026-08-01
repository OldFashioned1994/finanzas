// ============================================================================
//  Mini calculadora de bolsillo para el campo monto.
//  Encadena operaciones en el orden en que las tocás (sin precedencia), que es
//  como funciona una calculadora física y lo que uno espera al ir sumando los
//  tickets del súper: 1200 + 340 + 85.
// ============================================================================

export const OPERADORES = ['+', '−', '×', '÷']

export const estadoInicialCalc = {
  actual: '', // lo que se está tipeando, como texto ('1234,5')
  acumulado: null, // resultado parcial de la cadena
  operador: null, // operación pendiente
}

// Número que representa el estado (lo que se guardaría si tocás guardar).
export function valorCalc(e) {
  const actual = aNumero(e.actual)
  if (e.operador == null) return actual ?? e.acumulado ?? NaN
  // Con una operación pendiente y sin segundo operando, vale el acumulado.
  if (actual == null) return e.acumulado ?? NaN
  return aplicar(e.acumulado ?? 0, actual, e.operador)
}

export function hayPendiente(e) {
  return e.operador != null
}

export function estaVacia(e) {
  return e.actual === '' && e.acumulado == null
}

// --- Acciones -------------------------------------------------------------

export function digito(e, d) {
  // Máximo 2 decimales: más precisión no sirve para plata.
  const [, dec] = e.actual.split(',')
  if (dec != null && dec.length >= 2) return e
  if (e.actual === '0' && d === '0') return e
  const actual = e.actual === '0' ? d : e.actual + d
  return { ...e, actual }
}

export function coma(e) {
  if (e.actual.includes(',')) return e
  return { ...e, actual: e.actual === '' ? '0,' : e.actual + ',' }
}

export function operador(e, op) {
  const actual = aNumero(e.actual)
  // Tocar otro operador seguido solo cambia el operador pendiente.
  if (actual == null) {
    if (e.acumulado == null) return e
    return { ...e, operador: op }
  }
  const acumulado = e.operador != null ? aplicar(e.acumulado ?? 0, actual, e.operador) : actual
  return { actual: '', acumulado, operador: op }
}

export function igual(e) {
  const actual = aNumero(e.actual)
  if (e.operador == null || actual == null) return e
  const resultado = aplicar(e.acumulado ?? 0, actual, e.operador)
  return { actual: formatearNumero(resultado), acumulado: null, operador: null }
}

export function retroceso(e) {
  if (e.actual !== '') return { ...e, actual: e.actual.slice(0, -1) }
  if (e.operador != null) return { ...e, operador: null }
  if (e.acumulado != null) return { ...estadoInicialCalc }
  return e
}

export function limpiar() {
  return { ...estadoInicialCalc }
}

// Carga un número ya existente (ej: al editar un movimiento).
export function desdeNumero(n) {
  if (n == null || !Number.isFinite(n)) return { ...estadoInicialCalc }
  return { actual: formatearNumero(n), acumulado: null, operador: null }
}

// --- Presentación ---------------------------------------------------------

const fmt = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 })

// Lo que se muestra en grande: siempre el operando en curso.
export function displayCalc(e) {
  if (e.actual !== '') return conSeparadores(e.actual)
  if (e.operador != null || e.acumulado != null) return fmt.format(e.acumulado ?? 0)
  return ''
}

// Línea chica de arriba: la cuenta en curso ('1.200 +').
export function expresionCalc(e) {
  if (e.operador == null) return ''
  return `${fmt.format(e.acumulado ?? 0)} ${e.operador}`
}

// Separador de miles mientras se tipea, respetando la coma decimal a medio
// escribir ('1234,' tiene que seguir mostrando la coma).
function conSeparadores(texto) {
  const [ent, dec] = texto.split(',')
  const entero = ent === '' ? '0' : fmt.format(Number(ent))
  if (dec == null) return entero
  return `${entero},${dec}`
}

function formatearNumero(n) {
  const redondeado = Math.round(n * 100) / 100
  return String(redondeado).replace('.', ',')
}

function aNumero(texto) {
  if (texto === '' || texto === ',') return null
  const n = parseFloat(texto.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

function aplicar(a, b, op) {
  switch (op) {
    case '+':
      return a + b
    case '−':
      return a - b
    case '×':
      return a * b
    case '÷':
      return b === 0 ? a : a / b
    default:
      return b
  }
}
