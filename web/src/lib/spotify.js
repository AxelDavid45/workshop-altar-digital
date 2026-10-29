// Spotify.
//
// Solo el reproductor embebido, que es un iframe y nada mas: no pide OAuth,
// no hay que registrar una app y no hace falta Premium para ponerlo.
//
// El Web Playback SDK si pediria Premium, un flujo de autorizacion y URLs
// de redireccion registradas, y en este taller cada persona tiene su propio
// dominio de amplifyapp.com. Por eso no se usa, y esta escrito aqui para
// que nadie intente "mejorarlo" despues.

// Spotify mete a veces un segmento de idioma (/intl-es/), por eso es opcional.
const TRACK = /^https:\/\/open\.spotify\.com\/(?:intl-[a-z]{2}\/)?track\/([A-Za-z0-9]{22})/

/** El id de la cancion, o null si el link no es una cancion de Spotify. */
export function idDeCancion(link) {
  return TRACK.exec(link || '')?.[1] ?? null
}

/**
 * La URL del reproductor.
 *
 * Sin parametros extra, a proposito: React vuelve a montar el iframe si el
 * `src` cambia, asi que esta cadena tiene que ser identica entre renders o
 * la cancion se reinicia.
 */
export function urlDelReproductor(id) {
  return `https://open.spotify.com/embed/track/${id}`
}
