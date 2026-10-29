// Mientras trae el altar.
//
// Con localStorage esto no hacia falta, porque leer era instantaneo. En
// cuanto el altar vive en la nube hay una espera de red, y sin esto la
// pagina se ve vacia y parece que se rompio.
//
// Dibuja las tres gradas en su lugar para que el contenido no brinque
// cuando lleguen los datos.

import { NIVELES } from '../../catalogo/elementos.js'

export default function AltarCargando() {
  return (
    <div id="altar" aria-busy="true">
      {NIVELES.map(({ nivel, nombre }) => (
        <section className="nivel nivel-esqueleto" key={nivel}>
          <div className="nivel-encabezado">
            <h2>{nombre}</h2>
          </div>
          <ul className="nivel-elementos">
            <li className="nivel-vacio">Trayendo tu altar...</li>
          </ul>
        </section>
      ))}
    </div>
  )
}
