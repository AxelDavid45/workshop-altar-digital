// Las tres gradas del altar.
//
// Arriba a quien recuerdas, en medio lo que le gustaba, abajo lo que
// necesita para el camino. El orden del arreglo NIVELES es el orden en que
// se dibujan, y el CSS las va ensanchando hacia abajo.

import { NIVELES } from '../../catalogo/elementos.js'
import Grada from './Grada.jsx'

/** Los elementos de una grada, en el orden en que se pusieron. */
function deLaGrada(elementos, nivel) {
  return elementos
    .filter((el) => el.nivel === nivel)
    .sort((a, b) => a.creadoEn.localeCompare(b.creadoEn))
}

export default function Altar({ elementos, imagenes, onQuitar }) {
  return (
    <div id="altar">
      {NIVELES.map(({ nivel, nombre, descripcion }) => (
        <Grada
          key={nivel}
          nombre={nombre}
          descripcion={descripcion}
          elementos={deLaGrada(elementos, nivel)}
          imagenes={imagenes}
          onQuitar={onQuitar}
        />
      ))}
    </div>
  )
}
