import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Pide al navegador que NO borre los datos locales (IndexedDB) cuando ande
// corto de espacio. Importante en el celular para no perder los movimientos.
if (navigator.storage?.persist) {
  navigator.storage.persist().catch(() => {})
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
