// ============================================================================
//  SEMILLA INICIAL DE CATEGORÍAS Y MÉTODOS
//  ----------------------------------------------------------------------------
//  OJO: esto ya NO es la fuente de verdad del día a día.
//
//  Ahora las categorías, subcategorías y métodos se editan DESDE LA APP
//  (Ajustes → Categorías / Métodos de pago) y viven en la base local. Este
//  archivo solo se usa UNA VEZ, la primera vez que la app corre en un
//  dispositivo, para que no arranque vacía.
//
//  Tocar acá no cambia nada en un dispositivo donde la app ya se usó: sirve
//  únicamente para definir con qué arranca una instalación nueva.
//
//  Formato:
//    categorias = { "Nombre de la categoría": ["SUBCAT 1", "SUBCAT 2", ...] }
//    metodos    = ["Método 1", "Método 2", ...]
// ============================================================================

// ============================================================================
//  GRUPOS (el nivel de arriba de las categorías)
//  ----------------------------------------------------------------------------
//  Estructura de tres capas, la misma que usan YNAB y Monarch:
//      tipo (gasto/ingreso) → GRUPO (Vivienda) → categoría (Servicios) →
//      subcategoría (LUZ)
//
//  Los grupos siguen la lógica de la COICOP Argentina 2019, el clasificador que
//  usa el INDEC para la Encuesta Nacional de Gastos de los Hogares: agrupar el
//  gasto por LA NECESIDAD QUE SATISFACE. Se adaptaron sus 12 divisiones a las
//  categorías que se usan acá, sin dejar grupos vacíos.
//
//  `naturaleza` separa lo imprescindible de lo que es elección, que es la otra
//  forma habitual de mirar un presupuesto (la regla 50/30/20):
//      esencial · disfrute · otros
// ============================================================================

export const GRUPOS = {
  gasto: [
    { nombre: 'Vivienda', emoji: '🏠' },
    { nombre: 'Alimentación', emoji: '🍔' },
    { nombre: 'Transporte', emoji: '🚕' },
    { nombre: 'Salud y cuidado', emoji: '💊' },
    { nombre: 'Ocio y estilo de vida', emoji: '🎬' },
    { nombre: 'Educación', emoji: '📚' },
    { nombre: 'Finanzas y varios', emoji: '🏦' },
  ],
  ingreso: [
    { nombre: 'Trabajo', emoji: '💼' },
    { nombre: 'Rentas', emoji: '📈' },
    { nombre: 'Otros ingresos', emoji: '✨' },
  ],
}

// A qué grupo va cada categoría de la semilla, y de qué naturaleza es.
// Lo que no figure acá cae en el último grupo del tipo.
export const CLASIFICACION = {
  // ------------------------------- GASTOS ----------------------------------
  'Vivienda': { grupo: 'Vivienda', naturaleza: 'esencial' },
  'Servicios': { grupo: 'Vivienda', naturaleza: 'esencial' },
  'Hogar': { grupo: 'Vivienda', naturaleza: 'esencial' },
  'Equipamiento': { grupo: 'Vivienda', naturaleza: 'disfrute' },
  'Alimentación': { grupo: 'Alimentación', naturaleza: 'esencial' },
  'Transporte': { grupo: 'Transporte', naturaleza: 'esencial' },
  'Salud': { grupo: 'Salud y cuidado', naturaleza: 'esencial' },
  'Cuidado personal': { grupo: 'Salud y cuidado', naturaleza: 'disfrute' },
  'Ocio y entretenimiento': { grupo: 'Ocio y estilo de vida', naturaleza: 'disfrute' },
  'Regalos y eventos': { grupo: 'Ocio y estilo de vida', naturaleza: 'disfrute' },
  'Educación': { grupo: 'Educación', naturaleza: 'esencial' },
  'Servicios financieros': { grupo: 'Finanzas y varios', naturaleza: 'otros' },
  'Imprevistos/varios': { grupo: 'Finanzas y varios', naturaleza: 'otros' },
  // ------------------------------ INGRESOS ---------------------------------
  'Sueldo': { grupo: 'Trabajo' },
  'Trabajo independiente': { grupo: 'Trabajo' },
  'Ventas': { grupo: 'Trabajo' },
  'Inversiones': { grupo: 'Rentas' },
  'Reintegros': { grupo: 'Otros ingresos' },
  'Otros': { grupo: 'Otros ingresos' },
}

// Las descripciones son cortas a propósito: van al lado del nombre en una fila
// del panel, en pantalla de teléfono.
export const NATURALEZAS = {
  esencial: { nombre: 'Esencial', descripcion: 'no se puede evitar' },
  disfrute: { nombre: 'Disfrute', descripcion: 'lo elegís vos' },
  otros: { nombre: 'Otros', descripcion: 'banco, imprevistos' },
}

export const CONFIG = {
  // -------------------------------- GASTOS ---------------------------------
  gasto: {
    categorias: {
      'Alimentación': ['COTO', 'CARNICERIA', 'VERDULERIA', 'PEYA'],
      'Cuidado personal': ['PELUQUERIA', 'GIMNASIO', 'ROPA', 'ZAPAS'],
      'Educación': ['CURSOS'],
      'Equipamiento': ['ELECTRO', 'MUEBLES'],
      'Hogar': ['LIMPIEZA'],
      'Imprevistos/varios': ['MULTA GAMBI'],
      'Ocio y entretenimiento': ['CINE', 'BARES', 'PESCA', 'STREAMING', 'JUEGOS', 'JUNTADA'],
      'Regalos y eventos': ['REGALOS'],
      'Salud': ['OBRA SOCIAL', 'FARMACIA'],
      'Servicios': ['LUZ', 'INTERNET', 'SEGURO DE INCENDIOS', 'TUENTI'],
      'Servicios financieros': ['BANCO'],
      'Transporte': ['UBER', 'SUBE'],
      'Vivienda': ['ALQUILER', 'EXPENSAS'],
    },
    metodos: [
      'Mercado Pago',
      'Mercado Pago crédito',
      'TC Visa',
      'TC Mastercard',
      'Efectivo',
      'Débito Visa',
    ],
  },

  // ------------------------------- INGRESOS --------------------------------
  // (tentativos, editalos a gusto)
  ingreso: {
    categorias: {
      'Sueldo': ['SUELDO'],
      'Trabajo independiente': ['FREELANCE', 'HONORARIOS'],
      'Ventas': ['VENTAS'],
      'Reintegros': ['REINTEGROS'],
      'Inversiones': ['INTERESES', 'RENDIMIENTOS'],
      'Otros': ['REGALOS RECIBIDOS', 'VARIOS'],
    },
    // En ingresos, el "método" es DÓNDE entró la plata.
    metodos: ['Mercado Pago', 'Efectivo', 'Débito Visa'],
  },
}

// ============================================================================
//  ICONOS (emojis)
//  ----------------------------------------------------------------------------
//  Emoji que se muestra al lado de cada categoría y método. Si agregás una
//  categoría nueva y no le ponés emoji acá, usa uno por defecto (📌). Es opcional:
//  podés ignorar todo este bloque y la app funciona igual.
// ============================================================================

export const ICONOS = {
  // Categorías de GASTO
  'Alimentación': '🍔',
  'Cuidado personal': '🧴',
  'Educación': '📚',
  'Equipamiento': '🔌',
  'Hogar': '🧹',
  'Imprevistos/varios': '⚠️',
  'Ocio y entretenimiento': '🎬',
  'Regalos y eventos': '🎁',
  'Salud': '💊',
  'Servicios': '💡',
  'Servicios financieros': '🏦',
  'Transporte': '🚕',
  'Vivienda': '🏠',
  // Categorías de INGRESO
  'Sueldo': '💼',
  'Trabajo independiente': '💻',
  'Ventas': '🏷️',
  'Reintegros': '↩️',
  'Inversiones': '📈',
  'Otros': '✨',
  // Métodos
  'Mercado Pago': '📲',
  'Mercado Pago crédito': '💳',
  'TC Visa': '💳',
  'TC Mastercard': '💳',
  'Efectivo': '💵',
  'Débito Visa': '🏧',
}

export function getIcono(nombre) {
  return ICONOS[nombre] ?? '📌'
}

// --- Helpers para leer la config (no hace falta tocar de acá para abajo) ---

export const TIPOS = ['gasto', 'ingreso']

export function getCategorias(tipo) {
  return Object.keys(CONFIG[tipo]?.categorias ?? {})
}

export function getSubcategorias(tipo, categoria) {
  return CONFIG[tipo]?.categorias?.[categoria] ?? []
}

export function getMetodos(tipo) {
  return CONFIG[tipo]?.metodos ?? []
}
