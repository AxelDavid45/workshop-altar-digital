// Reducir una imagen antes de guardarla.
//
// Una foto de telefono puede pesar 8 MB. Guardarla asi llena el
// localStorage en tres fotos, y en la nube te cuesta transferencia por algo
// que se va a ver en una tarjeta de 200 pixeles.
//
// Esto vive aparte de almacen.js porque las DOS versiones lo necesitan: la
// de navegador la convierte en data URL, y la de la nube la sube a S3 como
// Blob. Lo que cambia es el destino, no el redimensionado.

/** Ancho maximo. Arriba de esto no se nota en una tarjeta del altar. */
export const ANCHO_MAX = 720

/** Carga el archivo en un <img> para poder medirlo y dibujarlo. */
function cargarImagen(archivo) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(archivo)
    const img = new Image()
    img.onload = () => {
      // La URL temporal se libera en cuanto el navegador ya decodifico la
      // imagen. Si no, cada foto que subas deja memoria colgada.
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Ese archivo no parece una imagen.'))
    }
    img.src = url
  })
}

/** Dibuja la imagen reducida en un canvas y lo devuelve. */
async function aLienzo(archivo) {
  if (!archivo.type.startsWith('image/')) {
    throw new Error('Eso no es una imagen.')
  }
  const img = await cargarImagen(archivo)
  const escala = Math.min(1, ANCHO_MAX / img.width)
  const lienzo = document.createElement('canvas')
  lienzo.width = Math.round(img.width * escala)
  lienzo.height = Math.round(img.height * escala)
  lienzo.getContext('2d').drawImage(img, 0, 0, lienzo.width, lienzo.height)
  return lienzo
}

/**
 * La imagen reducida como data URL, que es un texto.
 * Asi la guarda la version de navegador, dentro del propio elemento.
 */
export async function reducirADataUrl(archivo) {
  const lienzo = await aLienzo(archivo)
  return lienzo.toDataURL('image/jpeg', 0.82)
}

/**
 * La imagen reducida como Blob, que son bytes.
 * Asi la sube a S3 la version de la nube, con una URL firmada.
 */
export async function reducirABlob(archivo) {
  const lienzo = await aLienzo(archivo)
  return new Promise((resolve, reject) => {
    lienzo.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('No pude convertir la imagen.'))),
      'image/jpeg',
      0.82,
    )
  })
}
