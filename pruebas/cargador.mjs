// Para correr en Node lo que Vite resuelve solo: imports relativos sin extensión (./db → ./db.js).
import { existsSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'

export async function resolve(especificador, contexto, siguiente) {
  if (especificador.startsWith('.') && !/\.[a-z]+$/i.test(especificador)) {
    const base = fileURLToPath(new URL(especificador, contexto.parentURL))
    for (const ext of ['.js', '.jsx']) if (existsSync(base + ext)) return { url: pathToFileURL(base + ext).href, shortCircuit: true }
  }
  return siguiente(especificador, contexto)
}
