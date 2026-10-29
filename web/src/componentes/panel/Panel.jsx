// El panel que aparece cuando lo que elegiste pide un dato.
//
// Solo dibuja los campos que ESE tipo declara en catalogo/elementos.js. No
// hay campos escondidos con `hidden`: si una vela no pide imagen, el input
// de imagen no llega a existir. Por eso ya no puede pasar que el
// formulario te pida una foto para poner sal.

import { useEffect, useRef, useState } from 'react'
import { TIPOS, NIVELES } from '../../catalogo/elementos.js'
import SelectorDeGrada from './SelectorDeGrada.jsx'

export default function Panel({ tipo, nivelLleno, cuantosEn, onPoner, onCancelar }) {
  const info = TIPOS[tipo]
  const [texto, setTexto] = useState('')
  const [link, setLink] = useState('')
  const [imagen, setImagen] = useState(null)
  const [nivel, setNivel] = useState(info.nivel)
  const [guardando, setGuardando] = useState(false)
  const primerCampo = useRef(null)

  // Al abrir, el foco va al primer campo. Con teclado el panel es
  // inservible si hay que tabular desde el principio de la pagina.
  useEffect(() => {
    primerCampo.current?.focus()
  }, [tipo])

  // Si la grada natural de esta cosa esta llena, el panel abre apuntando a
  // una que si tenga lugar, en vez de abrir en un error.
  useEffect(() => {
    if (nivelLleno(info.nivel)) {
      const libre = NIVELES.find((n) => !nivelLleno(n.nivel))
      if (libre) setNivel(libre.nivel)
    }
  }, [tipo, info.nivel, nivelLleno])

  async function alEnviar(evento) {
    evento.preventDefault()
    setGuardando(true)
    const ok = await onPoner({
      tipo,
      nivel,
      texto: texto.trim().slice(0, 280),
      link: link.trim(),
      imagen,
    })
    setGuardando(false)
    if (ok) onCancelar()
  }

  return (
    <form className="panel" onSubmit={alEnviar}>
      <div className="panel-encabezado">
        <h3>{info.etiqueta}</h3>
        <button type="button" className="panel-cerrar" onClick={onCancelar} aria-label="Cancelar">
          ×
        </button>
      </div>

      {info.pideTexto && (
        <label>
          <span>{info.ayuda}</span>
          <input
            ref={primerCampo}
            type="text"
            maxLength={280}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
          />
        </label>
      )}

      {info.pideLink && (
        <label>
          <span>Link de Spotify</span>
          <input
            type="url"
            placeholder="https://open.spotify.com/track/..."
            value={link}
            onChange={(e) => setLink(e.target.value)}
          />
          <small>Pega el link de una canción y queda el reproductor.</small>
        </label>
      )}

      {info.pideImagen && (
        <label>
          <span>Tu propia imagen</span>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImagen(e.target.files[0] ?? null)}
          />
          <small>Si no pones ninguna, se usa el dibujo de arriba.</small>
        </label>
      )}

      <SelectorDeGrada
        nivel={nivel}
        nivelLleno={nivelLleno}
        cuantosEn={cuantosEn}
        onCambiar={setNivel}
      />

      <button type="submit" className="panel-poner" disabled={guardando || nivelLleno(nivel)}>
        {guardando ? 'Poniéndolo...' : 'Ponerlo en el altar'}
      </button>
    </form>
  )
}
