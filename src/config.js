// ============================================================================
//  CONFIGURACIÓN EDITABLE
//  ----------------------------------------------------------------------------
//  Este es EL archivo para tocar cuando quieras agregar/quitar/renombrar
//  categorías, subcategorías o métodos de pago. No hace falta tocar nada más.
//
//  Formato:
//    categorias = { "Nombre de la categoría": ["SUBCAT 1", "SUBCAT 2", ...] }
//    metodos    = ["Método 1", "Método 2", ...]
//
//  Reglas simples:
//    - El orden en que las escribís es el orden en que aparecen los botones.
//    - Una categoría puede tener una sola subcategoría (ej: Educación: CURSOS).
//    - Si renombrás algo, los movimientos viejos conservan el texto anterior;
//      no se rompen, solo quedan con el nombre con el que se cargaron.
// ============================================================================

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
