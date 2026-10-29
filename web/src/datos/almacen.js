// Donde se guarda el altar.
//
// ---------------------------------------------------------------------
//  ESTE ES EL UNICO ARCHIVO QUE CAMBIA EN EL MODULO 3.
// ---------------------------------------------------------------------
//
// Hasta el modulo 2 todo se guardaba en el localStorage de ESTE navegador.
// Por eso si abrias tu altar en el telefono no estaba ahi: nunca salio de
// tu laptop.
//
// Esta es la version reescrita para hablarle a tu propia API. Compárala con
// la de `main` y fijate en lo que NO cambio:
//
//   - Las cuatro funciones tienen la misma firma y siguen siendo async,
//     aunque localStorage sea sincrono. Eso estaba puesto desde el
//     principio justo para este momento.
//   - `agregar` sigue recibiendo el File crudo de la imagen. Lo que cambia
//     es a donde va: antes se volvia un data URL guardado en el navegador,
//     ahora se sube a S3 y el elemento guarda solo su llave.
//   - NI UN COMPONENTE se toca. Ni el hook que maneja el estado. Lo unico
//     que sabe de donde salen los datos es este archivo.
//
// Cuando la frontera entre tu app y donde viven tus datos cabe en un
// archivo, mudarte de localStorage a una base de datos es un cambio chico
// y facil de revisar. Eso no fue suerte: fue el diseño.
//
// La URL de tu API no va en el codigo. Va como VITE_API_URL en las
// variables de entorno de Amplify, y Vite la mete al bundle al construir.
// En tu laptop, si quieres apuntar tu altar local a tu API, copia
// .env.example como .env y ponla ahi.

import { reducirABlob } from '../lib/imagen.js'

// Este archivo guarda en la nube, siempre. Por eso el modo esta escrito
// aqui como un dato y no se deduce de la configuracion: el banner de la
// pagina tiene que decir lo que ESTE archivo hace de verdad, no lo que
// alguien puso en una variable de entorno.
export const MODO = 'nube'

// La base de tu API. Sale del output de `cdk deploy` y va como
// VITE_API_URL en Amplify. Vite solo expone al navegador las variables
// que empiezan con VITE_, justo para que no se te escape un secreto.
const API = import.meta.env.VITE_API_URL

const LLAVE_ALTAR = 'ofrenda:altarId'
const LLAVE_NOMBRE = 'ofrenda:nombre'

// Tu altar tiene un ID unico. Se genera la primera vez y se guarda en
// localStorage, asi que es el mismo en tu laptop y en tu telefono solo
// si lo copias. Para este taller, cada persona tiene su propio altar.
function altarId() {
  let id = localStorage.getItem(LLAVE_ALTAR)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(LLAVE_ALTAR, id)
  }
  return id
}

/** El mensaje de error que mando la API, o uno de respaldo. */
async function errorDe(respuesta, respaldo) {
  const cuerpo = await respuesta.json().catch(() => ({}))
  return new Error(cuerpo.error || respaldo)
}

// ---------------------------------------------------------------------
// Imagenes
// ---------------------------------------------------------------------

// Pide una URL firmada a la API y sube el archivo directo a S3.
//
// La imagen NUNCA pasa por la Lambda: el altar pide permiso, la API le da
// una URL que vive 5 minutos, y el navegador sube ahi. Por eso puedes
// subir una foto de 8 megas sin que la Lambda se quede sin memoria.
async function subirImagen(archivo) {
  const blob = await reducirABlob(archivo)

  const permiso = await fetch(`${API}/uploads`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      altarId: altarId(),
      contentType: 'image/jpeg',
    }),
  })
  if (!permiso.ok) {
    throw await errorDe(permiso, 'No pude pedir permiso para subir la imagen.')
  }

  const { url, imageKey } = await permiso.json()

  // El PUT va directo a S3, no a tu API. Por eso S3 tiene que aceptar el
  // origen de tu pagina (CORS), y por eso la URL firmada lleva la
  // autorizacion dentro.
  const subida = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'image/jpeg' },
    body: blob,
  })
  if (!subida.ok) {
    throw new Error('No pude subir la imagen a S3.')
  }

  return imageKey
}

// ---------------------------------------------------------------------
// Las cuatro funciones que el resto de la app conoce
// ---------------------------------------------------------------------

/** Todos los elementos del altar, ordenados por cuando se pusieron. */
export async function listar() {
  const respuesta = await fetch(`${API}/elements?altarId=${altarId()}`)
  if (!respuesta.ok) {
    throw await errorDe(respuesta, 'No pude leer tu altar.')
  }
  const { elementos } = await respuesta.json()
  return elementos.sort((a, b) => a.creadoEn.localeCompare(b.creadoEn))
}

/**
 * Agrega un elemento y devuelve como quedo guardado.
 *
 * Si trae `imagen` (el File del formulario), primero se sube a S3 y el
 * elemento que viaja a la API lleva solo su `imageKey`. El componente
 * entrega el archivo y no se entera de nada de esto.
 */
export async function agregar(elemento) {
  const { imagen, ...resto } = elemento
  let imageKey
  if (imagen) {
    imageKey = await subirImagen(imagen)
  }

  const respuesta = await fetch(`${API}/elements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      altarId: altarId(),
      ...resto,
      ...(imageKey && { imageKey }),
    }),
  })
  if (!respuesta.ok) {
    throw await errorDe(respuesta, 'No pude agregar el elemento.')
  }
  return respuesta.json()
}

/** Quita un elemento del altar. */
export async function borrar(id) {
  const respuesta = await fetch(`${API}/elements`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      altarId: altarId(),
      borrar: true,
      id,
    }),
  })
  if (!respuesta.ok) {
    throw await errorDe(respuesta, 'No pude quitar el elemento.')
  }
}

/**
 * De donde sale la imagen de un elemento.
 *
 * En la nube el elemento solo guarda su `imageKey`. El bucket es privado,
 * asi que para ver la imagen el navegador le pide a la API una URL firmada
 * de lectura. El navegador nunca necesita saber el nombre del bucket: la
 * API lo sabe y firma por el. Esa URL vive una hora.
 *
 * Es la forma que AWS recomienda para objetos privados: el bucket queda
 * cerrado y la unica puerta es una URL firmada con fecha de caducidad.
 */
export async function urlDeImagen(elemento) {
  if (!elemento.imageKey) return null
  const respuesta = await fetch(`${API}/uploads/${elemento.imageKey}`)
  if (!respuesta.ok) {
    // Si una imagen no se puede leer, el altar muestra el arte por
    // default en vez de romperse entero por una foto.
    console.warn('No pude leer la imagen', elemento.imageKey)
    return null
  }
  const { url } = await respuesta.json()
  return url
}

// ---------------------------------------------------------------------
// Nombre
// ---------------------------------------------------------------------

// El nombre se queda en localStorage incluso en modo nube: es de quien
// esta armando el altar en ESTE navegador, no del altar.

/** Quien esta poniendo cosas en el altar. */
export function nombre() {
  return localStorage.getItem(LLAVE_NOMBRE) || ''
}

export function guardarNombre(valor) {
  localStorage.setItem(LLAVE_NOMBRE, valor.slice(0, 40))
}
