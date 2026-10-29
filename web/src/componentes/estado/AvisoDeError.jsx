// Cuando algo falla.
//
// Contra localStorage casi nunca fallaba nada. Contra una API por red falla
// de todo: se cae el wifi, la URL esta mal, la Lambda devuelve 502. Sin
// esto, el unico lugar donde se vería el error es la consola, y nadie en un
// taller tiene la consola abierta.
//
// Lleva boton de reintentar porque la mayoria de estos errores son
// temporales.

export default function AvisoDeError({ mensaje, onReintentar }) {
  return (
    <p className="aviso-error" role="alert">
      {mensaje}{' '}
      <button type="button" onClick={onReintentar}>
        Volver a intentar
      </button>
    </p>
  )
}
