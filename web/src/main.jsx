// Punto de entrada. Monta React y prende los adornos del fondo.

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { montarAdornos } from './catalogo/adornos.js'
import App from './App.jsx'
import './estilos.css'

// El papel picado y los petalos son decoracion que se pinta una sola vez
// con CSS. No depende del estado del altar, asi que no necesita ser un
// componente: se monta antes y se olvida.
montarAdornos()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
