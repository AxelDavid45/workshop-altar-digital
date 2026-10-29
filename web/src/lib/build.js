// Cuando se construyo esta pagina.
//
// `__CONSTRUIDO__` no existe en el codigo: Vite la reemplaza por un literal
// al construir. Ver `define` en vite.config.js.
//
// Suena a detalle y no lo es: es la unica parte VISIBLE del build. Haces
// push, Amplify reconstruye, y esta fecha cambia sola. Ahi se ve que tu
// codigo paso por un pipeline antes de llegar a quien visita tu altar.
//
// Vive aparte para que ningun componente tenga que declarar un global.

/* global __CONSTRUIDO__ */
const CRUDO = typeof __CONSTRUIDO__ === 'string' ? __CONSTRUIDO__ : ''

/** Una linea lista para mostrar, ya sea en local o publicado. */
export function cuandoSeConstruyo() {
  if (!CRUDO) return 'corriendo en tu máquina'
  const fecha = new Date(CRUDO).toLocaleString('es-MX', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
  return `publicado ${fecha}`
}
