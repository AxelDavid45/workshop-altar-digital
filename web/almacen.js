// Donde se guarda el altar.
//
// ---------------------------------------------------------------------
//  ESTE ES EL UNICO ARCHIVO QUE CAMBIA EN EL MODULO 3.
// ---------------------------------------------------------------------
//
// Ahora mismo todo se guarda en el localStorage de ESTE navegador. Por eso
// si abres tu altar en el telefono no esta ahi: nunca salio de tu laptop.
//
// En el modulo 3 este archivo se reescribe para hablarle a tu propia API.
// Las cuatro funciones de abajo mantienen su firma y siguen siendo async,
// asi que `altar.js` no se toca ni una linea. Eso es a proposito: cuando
// la frontera entre tu app y donde viven los datos cabe en un archivo,
// cambiar de localStorage a una base de datos es un cambio chico y
// facil de revisar.

import { setTradicional } from './elementos.js'

// Este archivo guarda en el navegador, siempre. Por eso el modo esta escrito
// aqui como un dato y no se deduce de la configuracion: el banner de la
// pagina tiene que decir lo que ESTE archivo hace de verdad, no lo que
// alguien puso en una variable de entorno. Cuando lo reescribas para
// hablarle a tu API, cambias esta linea a 'nube' y el banner se acomoda.
export const MODO = 'navegador'

const LLAVE = 'ofrenda:elementos'
const LLAVE_NOMBRE = 'ofrenda:nombre'

function leerTodo() {
  try {
    const crudo = localStorage.getItem(LLAVE)
    if (crudo === null) {
      // Primera vez: el altar arranca con su set tradicional.
      const semilla = setTradicional()
      localStorage.setItem(LLAVE, JSON.stringify(semilla))
      return semilla
    }
    const lista = JSON.parse(crudo)
    return Array.isArray(lista) ? lista : []
  } catch {
    // Si el localStorage trae basura, mejor un altar vacio que una pagina
    // rota. No lo borramos solo: puede ser el altar de alguien.
    console.warn('No pude leer el altar guardado en este navegador.')
    return []
  }
}

function escribirTodo(lista) {
  try {
    localStorage.setItem(LLAVE, JSON.stringify(lista))
  } catch {
    throw new Error(
      'Ya no cabe nada mas en este navegador. Borra algun elemento con imagen, ' +
        'o construye tu backend para que las imagenes vivan en S3.'
    )
  }
}

/** Todos los elementos del altar, ordenados por cuando se pusieron. */
export async function listar() {
  return leerTodo().sort((a, b) => a.creadoEn.localeCompare(b.creadoEn))
}

/** Agrega un elemento y devuelve como quedo guardado. */
export async function agregar(elemento) {
  const lista = leerTodo()
  const nuevo = {
    ...elemento,
    id: crypto.randomUUID(),
    creadoEn: new Date().toISOString(),
  }
  lista.push(nuevo)
  escribirTodo(lista)
  return nuevo
}

/** Quita un elemento del altar. */
export async function borrar(id) {
  escribirTodo(leerTodo().filter((el) => el.id !== id))
}

/**
 * De donde sale la imagen de un elemento.
 *
 * En el navegador la imagen viaja dentro del propio elemento como data URL.
 * Cuando el altar vive en la nube, aqui va la URL firmada de S3 y el
 * elemento solo guarda su `imageKey`.
 */
export async function urlDeImagen(elemento) {
  return elemento.imagenLocal || null
}

/** Quien esta poniendo cosas en el altar. Se pregunta una sola vez. */
export function nombre() {
  return localStorage.getItem(LLAVE_NOMBRE) || ''
}

export function guardarNombre(valor) {
  localStorage.setItem(LLAVE_NOMBRE, valor.slice(0, 40))
}
