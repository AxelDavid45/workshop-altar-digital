// Una cosa que puedes poner, dibujada y pickeable.
//
// Si su grada natural esta llena, el boton se apaga y el titulo dice cual
// lo esta. Asi el limite se ve ANTES de intentar, no despues de un error.

import { necesitaPanel, nombreDeNivel } from '../../catalogo/elementos.js'
import { arteDe } from '../../catalogo/arte.js'

function tituloDe(tipo, info, lleno) {
  if (lleno) return `${nombreDeNivel(info.nivel)} ya está lleno`
  if (necesitaPanel(tipo)) return `${info.etiqueta}: te va a pedir un dato`
  return `Poner ${info.etiqueta.toLowerCase()} en el altar`
}

export default function Opcion({ tipo, info, lleno, onElegir }) {
  const titulo = tituloDe(tipo, info, lleno)

  return (
    <li>
      <button
        type="button"
        className="opcion"
        disabled={lleno}
        title={titulo}
        aria-label={titulo}
        onClick={() => onElegir(tipo)}
      >
        <span
          className="opcion-arte"
          aria-hidden="true"
          dangerouslySetInnerHTML={{ __html: arteDe(tipo) }}
        />
        <span className="opcion-nombre">{info.etiqueta}</span>
        <span className="opcion-nivel">{nombreDeNivel(info.nivel)}</span>
      </button>
    </li>
  )
}
