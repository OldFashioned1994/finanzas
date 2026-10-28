import { useEffect, useState } from 'react'
import { Copy, RefreshCw, Link2 } from 'lucide-react'
import { clavesReloj, olvidarReloj, sincronizarReloj, vincularReloj } from '../../reloj'

// El reloj (T-Rex 3): vincular una vez, copiar la clave que va en la app Zepp y sincronizar.
// Si el buzón se reinició (rechaza la clave), se puede volver a vincular desde acá.
export default function EditorReloj({ onToast }) {
  const [claves, setClaves] = useState(undefined)
  const [rechazada, setRechazada] = useState(false)
  const [ocupado, setOcupado] = useState(false)

  useEffect(() => {
    clavesReloj().then(setClaves)
  }, [])

  const vincular = async () => {
    setOcupado(true)
    try {
      const r = await vincularReloj()
      if (r.yaVinculado) return onToast?.({ msg: 'El buzón ya está vinculado a otro dispositivo', tone: 'error' })
      if (!r.ok) return onToast?.({ msg: 'El buzón no respondió', tone: 'error' })
      setClaves(await clavesReloj())
      setRechazada(false)
      onToast?.({ msg: 'Reloj vinculado ⌚', tone: 'ok' })
    } catch {
      onToast?.({ msg: 'El buzón no respondió', tone: 'error' })
    } finally {
      setOcupado(false)
    }
  }

  const volverAVincular = async () => {
    await olvidarReloj()
    setClaves(null)
    await vincular()
  }

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(claves.reloj)
      onToast?.({ msg: 'Clave copiada', tone: 'ok' })
    } catch {
      onToast?.({ msg: 'No se pudo copiar', tone: 'error' })
    }
  }

  const sincronizar = async () => {
    setOcupado(true)
    try {
      const r = await sincronizarReloj()
      setRechazada(!!r.claveInvalida)
      onToast?.(
        r.sinRed
          ? { msg: 'El buzón no respondió', tone: 'error' }
          : r.claveInvalida
            ? { msg: 'El buzón rechazó la clave', tone: 'error' }
            : {
                msg: r.importados
                  ? `${r.importados} gasto${r.importados === 1 ? '' : 's'} del reloj`
                  : 'Al día',
                tone: 'ok',
              },
      )
    } finally {
      setOcupado(false)
    }
  }

  if (claves === undefined) return null
  if (!claves)
    return (
      <button
        onClick={vincular}
        disabled={ocupado}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-500 px-4 py-3 text-sm font-semibold text-white active:scale-[0.99] disabled:opacity-50"
      >
        <Link2 size={16} />
        Vincular el reloj
      </button>
    )

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 rounded-2xl bg-slate-800/50 p-3">
        <span className="min-w-0 flex-1">
          <span className="block text-xs text-slate-500">Clave del reloj</span>
          <span className="block truncate font-mono text-sm text-slate-200">
            {claves.reloj.slice(0, 6)}…{claves.reloj.slice(-4)}
          </span>
        </span>
        <button
          onClick={copiar}
          className="flex items-center gap-1.5 rounded-xl bg-slate-700 px-3 py-2 text-sm font-semibold text-slate-100 active:scale-[0.98]"
        >
          <Copy size={15} />
          Copiar
        </button>
      </div>
      <button
        onClick={sincronizar}
        disabled={ocupado}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-800/70 px-4 py-3 text-sm font-semibold text-slate-100 active:scale-[0.99] disabled:opacity-50"
      >
        <RefreshCw size={16} className={ocupado ? 'animate-spin' : ''} />
        Sincronizar ahora
      </button>
      {rechazada && (
        <button
          onClick={volverAVincular}
          disabled={ocupado}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-500 px-4 py-3 text-sm font-semibold text-white active:scale-[0.99] disabled:opacity-50"
        >
          <Link2 size={16} />
          Volver a vincular
        </button>
      )}
    </div>
  )
}
