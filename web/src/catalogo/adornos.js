// Adornos de la pagina.
//
// Son dos azulejos que se repiten horizontalmente con CSS: el papel picado
// de arriba y la hilera de petalos de cempasuchil que remata cada grada del
// altar. Van como data URL para que no haya ni un archivo de imagen que
// pueda faltar, y al repetirse con `background-repeat` nunca se deforman.
//
// La paleta sale de las referencias: morado profundo de fondo, naranja de
// cempasuchil, y los colores de papel picado de verdad.

export const COLORES = {
  morado: '#2e1f42',
  naranja: '#f57c1f',
  naranjaClaro: '#ffa02e',
  amarillo: '#ffc629',
  rosa: '#e0366e',
  verde: '#2ec27e',
  turquesa: '#35c2c7',
  crema: '#fff4e0',
}

function dataUrl(svg) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

// Un banderin de papel picado: rectangulo con el borde de abajo picado y
// los huecos hechos con una mascara, para que se vea el fondo a traves y
// no un color pintado encima.
function banderin(id, x, color, alto) {
  const ancho = 68
  return `
    <mask id="${id}">
      <rect x="${x}" y="8" width="${ancho}" height="${alto}" fill="#fff"/>
      <circle cx="${x + 18}" cy="${alto * 0.34}" r="7" fill="#000"/>
      <circle cx="${x + 50}" cy="${alto * 0.34}" r="7" fill="#000"/>
      <circle cx="${x + 34}" cy="${alto * 0.52}" r="4.5" fill="#000"/>
      <rect x="${x + 22}" y="${alto * 0.66}" width="5" height="9" rx="2" fill="#000"/>
      <rect x="${x + 32}" y="${alto * 0.66}" width="5" height="9" rx="2" fill="#000"/>
      <rect x="${x + 42}" y="${alto * 0.66}" width="5" height="9" rx="2" fill="#000"/>
      <circle cx="${x + 10}" cy="${alto * 0.2}" r="3" fill="#000"/>
      <circle cx="${x + 58}" cy="${alto * 0.2}" r="3" fill="#000"/>
    </mask>
    <g mask="url(#${id})">
      <rect x="${x}" y="8" width="${ancho}" height="${alto - 10}" fill="${color}"/>
      <circle cx="${x + 8}" cy="${alto - 2}" r="8" fill="${color}"/>
      <circle cx="${x + 25}" cy="${alto - 2}" r="8" fill="${color}"/>
      <circle cx="${x + 42}" cy="${alto - 2}" r="8" fill="${color}"/>
      <circle cx="${x + 59}" cy="${alto - 2}" r="8" fill="${color}"/>
    </g>`
}

// El azulejo del papel picado: cuatro banderines de colores distintos que
// al repetirse dan una tira continua.
export function papelPicado() {
  const colores = [COLORES.naranja, COLORES.verde, COLORES.rosa, COLORES.amarillo]
  const altos = [86, 92, 84, 90]
  const banderines = colores
    .map((color, i) => banderin(`p${i}`, 6 + i * 76, color, altos[i]))
    .join('')
  return dataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 310 100" width="310" height="100">
      <path d="M0 10 Q 78 2 155 10 Q 232 18 310 10" stroke="${COLORES.crema}" stroke-width="2.5" fill="none"/>
      ${banderines}
    </svg>`)
}

// La hilera de petalos de cempasuchil que remata cada grada.
export function petalos() {
  const uno = (x, y, giro, color) =>
    `<ellipse cx="${x}" cy="${y}" rx="9" ry="6" fill="${color}" transform="rotate(${giro} ${x} ${y})"/>`
  return dataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 26" width="120" height="26">
      ${uno(12, 13, -18, COLORES.naranja)}
      ${uno(30, 15, 12, COLORES.naranjaClaro)}
      ${uno(48, 12, -8, COLORES.amarillo)}
      ${uno(66, 15, 20, COLORES.naranja)}
      ${uno(84, 12, -14, COLORES.naranjaClaro)}
      ${uno(102, 14, 8, COLORES.naranja)}
    </svg>`)
}

// Pinta los adornos en la pagina. Se llama una vez al arrancar.
export function montarAdornos() {
  const papel = document.querySelector('#papel')
  if (papel) papel.style.backgroundImage = `url("${papelPicado()}")`
  document.documentElement.style.setProperty('--petalos', `url("${petalos()}")`)
}
