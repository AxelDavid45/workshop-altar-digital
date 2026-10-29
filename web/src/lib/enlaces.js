// Validar un link antes de ponerlo en un href.
//
// Esto NO es paranoia de mas. El texto y el link de un elemento los escribe
// cualquiera que tenga la URL de la API, porque la ruta que agrega
// elementos esta abierta. Un link como `javascript:...` en un href se
// ejecuta al hacer clic.
//
// Validar al dibujar y no al guardar es a proposito: el formulario no es la
// unica puerta por la que entra un elemento.

/** El link si es https, o null. Todo lo demas se descarta. */
export function linkSeguro(link) {
  try {
    return new URL(link).protocol === 'https:' ? link : null
  } catch {
    // Ni siquiera es una URL.
    return null
  }
}
