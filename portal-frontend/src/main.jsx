import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Em produção, silencia console.log (evita vazamento de dados em consoles abertos).
// console.error/warn continuam ativos para diagnóstico real de falhas.
if (!import.meta.env.DEV) {
  console.log = () => {}
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
