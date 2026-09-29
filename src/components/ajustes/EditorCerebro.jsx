import { useEffect, useState } from 'react'
import { setAjuste, getAjuste } from '../../db'
import { probarCerebro, importarDelCerebro } from '../../cerebro'

// Conexión con el segundo cerebro de WhatsApp: solo hay que pegar el token
// (se lo pedís al bot escribiéndole "token" en el chat con vos mismo).
export default function EditorCerebro({ onToast }) {
  const [token, setToken] = useState('')
  const [probando, setProbando] = useState(false)

  useEffect(() => {
    getAjuste('cerebroToken', '').then((t) => setToken(t || ''))
  }, [])

  const guardar = async () => {
    const t = token.trim()
    await setAjuste('cerebroToken', t)
    if (!t) return onToast?.({ msg: 'Token borrado: la app dejó de consultar el cerebro', tone: 'info' })

    setProbando(true)
    try {
      const r = await probarCerebro(t)
      if (!r.ok) {
        onToast?.({
          msg: r.tokenInvalido ? 'El cerebro rechazó el token: revisalo' : 'El cerebro no respondió',
          tone: 'error',
        })
        return
      }
      const imp = await importarDelCerebro()
      onToast?.({
        msg: imp.importados
          ? `Conectado 🧠 — ${imp.importados} gasto${imp.importados === 1 ? '' : 's'} importado${imp.importados === 1 ? '' : 's'}`
          : 'Conectado con el cerebro 🧠',
        tone: 'ok',
      })
    } catch {
      onToast?.({ msg: 'El cerebro no respondió', tone: 'error' })
    } finally {
      setProbando(false)
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-xs leading-relaxed text-slate-500">
        Los gastos que te mandás por WhatsApp (chat con vos mismo) se importan solos al abrir la
        app. Para conectar, escribile <span className="font-semibold text-slate-300">token</span> al
        chat y pegá acá lo que te responde.
      </p>
      <input
        type="text"
        inputMode="text"
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        value={token}
        onChange={(e) => setToken(e.target.value)}
        placeholder="token del cerebro"
        className="w-full rounded-2xl bg-slate-800/70 px-4 py-3 font-mono text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:ring-1 focus:ring-indigo-500/40"
      />
      <button
        onClick={guardar}
        disabled={probando}
        className="w-full rounded-2xl bg-indigo-500 py-3 text-sm font-semibold text-white active:scale-[0.99] disabled:opacity-60"
      >
        {probando ? 'Probando…' : 'Guardar y probar'}
      </button>
    </div>
  )
}
