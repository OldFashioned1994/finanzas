import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { asegurarProteccion } from './utils/respaldo'

// Pide al navegador que NO borre los datos locales (IndexedDB) cuando ande
// corto de espacio o pase tiempo sin usar la app.
//
// Se reintenta en cada arranque a propósito: el navegador concede el permiso
// según cuánto usaste la app y si está instalada, así que el primer pedido
// —recién instalada y sin historial— es el que más chances tiene de fallar.
// Si ya está concedido, la llamada no hace nada.
asegurarProteccion().catch(() => {})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
