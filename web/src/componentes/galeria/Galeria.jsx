// La galeria: lo que puedes poner en el altar.
//
// Esto reemplaza los tres <select> que tenia la primera version. El cambio
// no es cosmetico, resuelve dos problemas de raiz:
//
//   - Antes el formulario pedia "Imagen propia (opcional)" SIEMPRE, hasta
//     para la sal. Ahora cada tipo declara que campos pide (ver
//     catalogo/elementos.js) y el panel se arma con eso, asi que una vela
//     no tiene campo de imagen porque para una vela ese campo no existe.
//
//   - Antes la grada se elegia en un dropdown. Ahora cada cosa cae en su
//     grada natural, que es como se arma un altar de verdad: las flores y
//     el agua abajo, la foto arriba. El panel deja moverla si quieres.
//
// Lo que no pide nada cae directo al picarle. Lo que pide algo abre panel.

import { TIPOS } from '../../catalogo/elementos.js'
import Opcion from './Opcion.jsx'

const GRUPOS = [
  { id: 'tradicional', titulo: 'Tradicionales', pista: 'Se ponen y ya' },
  { id: 'personal', titulo: 'Suyas', pista: 'Estas piden un dato' },
]

function tiposDe(grupo) {
  return Object.entries(TIPOS).filter(([, info]) => info.grupo === grupo)
}

export default function Galeria({ nivelLleno, onElegir }) {
  return (
    <section className="galeria" aria-labelledby="galeria-titulo">
      <h2 id="galeria-titulo">Qué le pones</h2>

      {GRUPOS.map((grupo) => (
        <div className="galeria-grupo" key={grupo.id}>
          <p className="galeria-grupo-titulo">
            {grupo.titulo}
            <span>{grupo.pista}</span>
          </p>
          <ul className="galeria-rejilla">
            {tiposDe(grupo.id).map(([tipo, info]) => (
              <Opcion
                key={tipo}
                tipo={tipo}
                info={info}
                lleno={nivelLleno(info.nivel)}
                onElegir={onElegir}
              />
            ))}
          </ul>
        </div>
      ))}
    </section>
  )
}
