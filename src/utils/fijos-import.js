// Importar gastos fijos desde un archivo (formato «finanzas-fijos» v1), en funciones puras:
// sin base ni pantalla, para probarlas solas (node --test src/utils/fijos-import.test.js).
//
// El archivo es un JSON { formato: 'finanzas-fijos', version: 1, fijos: [...] } y cada fijo:
//   descripcion, tipo ('gasto'|'ingreso'), monto, moneda ('ARS'|'USD'), diaMes (1-31),
//   categoria, subcategoria, metodo, debito (true si se debita solo) y, para una categoría
//   que no exista, grupo y naturaleza opcionales.

export const FORMATO_FIJOS = 'finanzas-fijos'

/** Para comparar nombres: sin acentos, sin mayúsculas y sin espacios de más. */
export const normalizar = (s) =>
  String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()

const texto = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

/** El texto del archivo → { fijos, errores }. Un fijo con datos inválidos no entra y se avisa. */
export function leerArchivoFijos(contenido) {
  let datos
  try {
    datos = typeof contenido === 'string' ? JSON.parse(contenido) : contenido
  } catch {
    return { fijos: [], errores: ['El archivo no es un JSON válido'] }
  }
  if (!datos || datos.formato !== FORMATO_FIJOS || !Array.isArray(datos.fijos)) {
    return { fijos: [], errores: ['El archivo no es de gastos fijos'] }
  }
  const fijos = []
  const errores = []
  datos.fijos.forEach((f, i) => {
    const monto = Number(f?.monto)
    const diaMes = Number(f?.diaMes)
    const item = {
      descripcion: texto(f?.descripcion, 60),
      tipo: f?.tipo === 'ingreso' ? 'ingreso' : 'gasto',
      monto: Math.round(monto * 100) / 100,
      moneda: f?.moneda === 'USD' ? 'USD' : 'ARS',
      diaMes: Math.trunc(diaMes),
      categoria: texto(f?.categoria, 60),
      subcategoria: texto(f?.subcategoria, 60),
      metodo: texto(f?.metodo, 60),
      debito: f?.debito === true,
      grupo: texto(f?.grupo, 60),
      naturaleza: ['esencial', 'disfrute', 'otros'].includes(f?.naturaleza) ? f.naturaleza : null,
    }
    const nombre = item.descripcion || `fila ${i + 1}`
    if (!(monto > 0) || monto > 1e10) errores.push(`${nombre}: monto inválido`)
    else if (!(diaMes >= 1 && diaMes <= 31)) errores.push(`${nombre}: día inválido`)
    else if (!item.categoria || !item.subcategoria || !item.metodo) errores.push(`${nombre}: falta categoría, subcategoría o método`)
    else fijos.push(item)
  })
  return { fijos, errores }
}

/**
 * Cruza lo leído con lo que ya hay en la app. Cada fijo vuelve con:
 *   categoria/subcategoria/metodo con el nombre que YA usa la app si existe (sin importar
 *   mayúsculas ni acentos), las marcas nuevaCategoria/nuevaSubcategoria/nuevoMetodo para lo
 *   que se va a crear, yaEsta si parece repetido e incluir (sugerencia: no los repetidos).
 */
export function prepararImportacion(fijosLeidos, { fijos = [], categorias = [], metodos = [] }) {
  const existentes = fijos.map((f) => ({
    desc: normalizar(f.descripcion),
    clave: `${f.tipo}|${normalizar(f.categoria)}|${normalizar(f.subcategoria)}`,
  }))
  return fijosLeidos.map((f) => {
    const cat = categorias.find((c) => c.tipo === f.tipo && normalizar(c.nombre) === normalizar(f.categoria))
    const sub = cat?.subcategorias?.find((s) => normalizar(s) === normalizar(f.subcategoria))
    const met = metodos.find((m) => m.tipo === f.tipo && normalizar(m.nombre) === normalizar(f.metodo))
    const categoria = cat?.nombre ?? f.categoria
    const subcategoria = sub ?? f.subcategoria
    const desc = normalizar(f.descripcion)
    const clave = `${f.tipo}|${normalizar(categoria)}|${normalizar(subcategoria)}`
    // Repetido: la misma descripción, o un fijo sin descripción con la misma categoría y sub.
    const yaEsta = existentes.some((e) => (desc && e.desc === desc) || (!e.desc && e.clave === clave))
    return {
      ...f,
      categoria,
      subcategoria,
      metodo: met?.nombre ?? f.metodo,
      nuevaCategoria: !cat,
      nuevaSubcategoria: !sub,
      nuevoMetodo: !met,
      yaEsta,
      incluir: !yaEsta,
    }
  })
}
