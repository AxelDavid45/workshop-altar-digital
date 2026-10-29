// Una cosa puesta en el altar.
//
// ---------------------------------------------------------------------
//  AQUI ESTABA EL BUG DEL REPRODUCTOR DE SPOTIFY.
// ---------------------------------------------------------------------
//
// La primera version de esta pagina borraba el altar entero y lo volvia a
// construir en cada cambio. Eso destruye y recrea TODOS los nodos, incluido
// el iframe de Spotify, asi que la cancion se reiniciaba cada vez que
// alguien agregaba o quitaba cualquier otra cosa.
//
// Con React el arreglo no es codigo que haya que escribir: Grada le pone
// `key={el.id}` a cada elemento, React reconoce cual es cual entre un
// render y el siguiente, y el iframe de una cancion que no cambio nunca se
// vuelve a montar. Borras una vela y la musica sigue.
//
// Lo unico que hay que cuidar es que `src` sea estable, y de eso se encarga
// urlDelReproductor en lib/spotify.js.

import { etiquetaDe } from '../../catalogo/elementos.js'
import { arteDe } from '../../catalogo/arte.js'
import { idDeCancion, urlDelReproductor } from '../../lib/spotify.js'
import { linkSeguro } from '../../lib/enlaces.js'

export default function Elemento({ elemento, urlImagen, onQuitar }) {
  const etiqueta = etiquetaDe(elemento.tipo)
  const link = linkSeguro(elemento.link)
  const cancion = link ? idDeCancion(link) : null

  const clases = ['elemento']
  if (cancion) clases.push('elemento-ancho')
  if (elemento.pendiente) clases.push('elemento-pendiente')

  return (
    <li className={clases.join(' ')} data-tipo={elemento.tipo}>
      <div className="elemento-figura">
        {urlImagen ? (
          <img src={urlImagen} alt={elemento.texto || etiqueta} loading="lazy" />
        ) : (
          // El SVG sale de catalogo/arte.js, que es NUESTRO codigo, por eso
          // va con dangerouslySetInnerHTML. El texto que escribe la gente
          // nunca va asi: React lo escapa solo cuando va como hijo normal.
          <div
            className="elemento-arte"
            dangerouslySetInnerHTML={{ __html: arteDe(elemento.tipo) }}
          />
        )}
      </div>

      <span className="elemento-etiqueta">
        {elemento.puestoPor ? `${etiqueta} · ${elemento.puestoPor}` : etiqueta}
      </span>

      {elemento.texto && <p className="elemento-texto">{elemento.texto}</p>}

      {cancion && (
        <iframe
          className="elemento-spotify"
          src={urlDelReproductor(cancion)}
          title={`Reproductor de Spotify: ${elemento.texto || etiqueta}`}
          loading="lazy"
          allow="encrypted-media"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      )}

      {link && !cancion && (
        <a className="elemento-link" href={link} target="_blank" rel="noopener noreferrer">
          abrir el link
        </a>
      )}

      <button
        className="elemento-quitar"
        type="button"
        title={`Quitar ${etiqueta}`}
        aria-label={`Quitar ${etiqueta}`}
        disabled={elemento.pendiente}
        onClick={() => onQuitar(elemento.id)}
      >
        ×
      </button>
    </li>
  )
}
