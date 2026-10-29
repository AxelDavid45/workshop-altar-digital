// En que grada va.
//
// Cada cosa tiene su grada natural, pero un altar es de quien lo arma: si
// tu abuela guardaba la sal arriba, va arriba. Una grada llena se ve
// apagada y con su cuenta, no desaparece: asi se entiende por que no se
// puede elegir.

import { NIVELES, CUPO_POR_NIVEL } from '../../catalogo/elementos.js'

export default function SelectorDeGrada({ nivel, nivelLleno, cuantosEn, onCambiar }) {
  return (
    <fieldset className="panel-niveles">
      <legend>En qué grada</legend>
      {NIVELES.map((n) => {
        const lleno = nivelLleno(n.nivel)
        return (
          <label key={n.nivel} className={lleno ? 'esta-lleno' : ''}>
            <input
              type="radio"
              name="nivel"
              value={n.nivel}
              checked={nivel === n.nivel}
              disabled={lleno}
              onChange={() => onCambiar(n.nivel)}
            />
            <span>{n.nombre}</span>
            <small>
              {cuantosEn(n.nivel)} / {CUPO_POR_NIVEL}
            </small>
          </label>
        )
      })}
    </fieldset>
  )
}
