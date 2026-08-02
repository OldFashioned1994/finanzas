// ============================================================================
//  Que los datos no se borren solos.
// ----------------------------------------------------------------------------
//  Los movimientos viven en el IndexedDB de este dispositivo. Por defecto el
//  navegador se guarda el derecho de borrarlos si le falta espacio o si pasás
//  tiempo sin abrir la app. `navigator.storage.persist()` le pide que no lo
//  haga, y cuando lo concede deja de borrarlos por esos motivos.
//
//  La app lo pedía al arrancar, pero nunca revisaba si se lo habían concedido.
//  El navegador es más propenso a darlo cuando la app está instalada y usada, o
//  sea que el primer pedido —recién instalada, sin historial— es justo el que
//  más chances tiene de fallar. Por eso ahora se reintenta y se puede verificar.
//
//  Con eso alcanza para el uso normal. Lo único que igual borra todo es algo
//  fuera del alcance de cualquier web: borrar los datos del sitio a mano,
//  desinstalar la app o perder el teléfono. Para eso está el backup.
// ============================================================================

import { setAjuste } from '../db'
import { hoyISO } from './format'

// ¿Corre como app instalada y no como una pestaña más de Safari?
// Importa: en iPhone, un sitio suelto en Safari pierde sus datos a los 7 días
// sin usarlo; instalado en la pantalla de inicio, esa regla no corre.
export function estaInstalada() {
  if (typeof window === 'undefined') return false
  return (
    window.navigator.standalone === true ||
    window.matchMedia?.('(display-mode: standalone)').matches === true
  )
}

export function esIOS() {
  if (typeof navigator === 'undefined') return false
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

// En iPhone, compartir el archivo es la forma de dejarlo en la app Archivos.
export function puedeCompartirArchivos() {
  if (typeof navigator === 'undefined' || !navigator.canShare) return false
  try {
    return navigator.canShare({
      files: [new File(['{}'], 'prueba.json', { type: 'application/json' })],
    })
  } catch {
    return false
  }
}

export async function estaProtegido() {
  if (!navigator.storage?.persisted) return null
  return navigator.storage.persisted().catch(() => false)
}

export async function pedirProteccion() {
  if (!navigator.storage?.persist) return false
  try {
    return await navigator.storage.persist()
  } catch {
    return false
  }
}

// Se llama al abrir la app: si la protección todavía no está, se vuelve a pedir.
// Cuesta nada y con el tiempo el navegador la concede.
export async function asegurarProteccion() {
  const ya = await estaProtegido()
  if (ya === null) return null
  if (ya) return true
  return pedirProteccion()
}

export async function registrarBackup(cantidadMovimientos) {
  await setAjuste('ultimoBackup', { fecha: hoyISO(), movimientos: cantidadMovimientos })
}

// Hace cuánto que no guardás una copia y cuántos movimientos quedaron afuera.
export function estadoRespaldo(ajustes, cantidadActual) {
  const ultimo = ajustes?.ultimoBackup
  if (!ultimo?.fecha) {
    return { nunca: true, dias: null, sinRespaldar: cantidadActual, conviene: cantidadActual >= 20 }
  }
  const dias = Math.max(0, Math.round((Date.parse(hoyISO()) - Date.parse(ultimo.fecha)) / 86400000))
  const sinRespaldar = Math.max(0, cantidadActual - (ultimo.movimientos ?? 0))
  return {
    nunca: false,
    dias,
    sinRespaldar,
    fecha: ultimo.fecha,
    // Sin alarmismo: recién a los dos meses o con bastante cargado sin copiar.
    conviene: dias >= 60 || sinRespaldar >= 60,
  }
}
