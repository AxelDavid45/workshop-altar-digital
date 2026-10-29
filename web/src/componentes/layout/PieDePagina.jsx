// El pie de la pagina: cuantas cosas tiene el altar y cuando se publico.

import { cuandoSeConstruyo } from '../../lib/build.js'

function cuantas(n) {
  return n === 1 ? '1 elemento' : `${n} elementos`
}

export default function PieDePagina({ total }) {
  return (
    <footer>
      <p>
        <span>{cuantas(total)}</span> · Ofrenda en la Nube ·{' '}
        <span>{cuandoSeConstruyo()}</span>
      </p>
    </footer>
  )
}
