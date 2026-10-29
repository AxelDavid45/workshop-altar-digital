// Donde se guarda tu altar.
//
// El modo lo dice datos/almacen.js como un dato escrito a mano, no se
// deduce de una variable de entorno. Ese es el punto: este banner tiene
// que decir lo que ese archivo HACE de verdad. Si se dedujera de la
// configuracion, mentiria en cuanto alguien pusiera la variable sin haber
// reescrito el archivo, y este taller trata precisamente de entender donde
// viven tus datos.

const TEXTOS = {
  navegador:
    'Tu altar está guardado solo en este navegador. Si lo abres en otro lado, no va a estar ahí.',
  nube: 'Tu altar está guardado en tu propia base de datos.',
}

export default function BannerDeModo({ modo }) {
  return (
    <p id="modo" data-modo={modo}>
      {TEXTOS[modo] ?? TEXTOS.navegador}
    </p>
  )
}
