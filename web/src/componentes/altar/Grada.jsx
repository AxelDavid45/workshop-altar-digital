// Una grada del altar, con su encabezado, su contador y sus elementos.

import { CUPO_POR_NIVEL } from '../../catalogo/elementos.js'
import Elemento from './Elemento.jsx'

export default function Grada({ nombre, descripcion, elementos, imagenes, onQuitar }) {
  const lleno = elementos.length >= CUPO_POR_NIVEL

  return (
    <section className="nivel">
      <div className="nivel-encabezado">
        <h2>
          {nombre}
          <span>{descripcion}</span>
        </h2>
        {/* El contador se pone ambar cuando la grada ya no acepta mas, asi
            nadie descubre el limite hasta que lo choca. */}
        <span className={`nivel-cuenta${lleno ? ' nivel-lleno' : ''}`}>
          {elementos.length} / {CUPO_POR_NIVEL}
        </span>
      </div>

      <ul className="nivel-elementos">
        {elementos.length === 0 ? (
          <li className="nivel-vacio">Todavía no hay nada en este nivel</li>
        ) : (
          elementos.map((el) => (
            // La `key` es lo que arregla el reproductor de Spotify: React
            // reconoce cada elemento entre renders y no vuelve a montar el
            // iframe de una cancion que no cambio.
            <Elemento
              key={el.id}
              elemento={el}
              urlImagen={imagenes.get(el.id)}
              onQuitar={onQuitar}
            />
          ))
        )}
      </ul>
    </section>
  )
}
