// El altar.
//
// Dibuja los tres niveles y maneja el formulario. No sabe NADA de donde se
// guardan las cosas: para eso le pregunta a almacen.js. Por eso este archivo
// casi no cambia cuando el altar se muda a la nube en el modulo 3.

import { arteDe } from './arte.js'
import { TIPOS, NIVELES, etiquetaDe } from './elementos.js'
import { montarAdornos } from './adornos.js'
import * as almacen from './almacen.js'

// Esta constante no existe en el codigo: Vite la reemplaza por la fecha
// del build cuando construye. Ver `define` en vite.config.js.
/* global __CONSTRUIDO__ */

const $ = (sel) => document.querySelector(sel)

// Cuantos elementos caben en cada nivel.
//
// El limite no es un capricho: sin el, el altar se llena hasta que los
// elementos se salen de la pantalla y deja de verse como un altar. Seis por
// nivel llenan la grada sin apretarse, incluso en un telefono.
const MAX_POR_NIVEL = 6

// Ancho maximo al que reducimos una imagen antes de guardarla.
const ANCHO_MAX = 720

// ---------------------------------------------------------------------
// Links y Spotify
// ---------------------------------------------------------------------

// Un link de cancion de Spotify, del que sacamos el ID para el reproductor.
// Spotify mete a veces un segmento de idioma (/intl-es/), por eso es opcional.
const SPOTIFY_TRACK = /^https:\/\/open\.spotify\.com\/(?:intl-[a-z]{2}\/)?track\/([A-Za-z0-9]{22})/

// El reproductor oficial embebido. Es un iframe y nada mas: no pide OAuth,
// no hay que registrar una app y no hace falta Premium para ponerlo.
function reproductorSpotify(link) {
  const encontrado = SPOTIFY_TRACK.exec(link)
  if (!encontrado) return null
  const iframe = document.createElement('iframe')
  iframe.src = `https://open.spotify.com/embed/track/${encontrado[1]}`
  iframe.title = 'Reproductor de Spotify'
  iframe.loading = 'lazy'
  iframe.allow = 'encrypted-media'
  iframe.referrerPolicy = 'strict-origin-when-cross-origin'
  return iframe
}

// Solo dejamos pasar https. El texto y el link de un elemento los escribe
// quien tenga acceso a la API, y un link como `javascript:...` en un href se
// ejecuta al hacer clic. Validar aqui es mas barato que confiar en el formulario.
function linkSeguro(link) {
  try {
    return new URL(link).protocol === 'https:' ? link : null
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------
// Dibujar
// ---------------------------------------------------------------------

function tarjeta(elemento, urlImagen) {
  const li = document.createElement('li')
  li.className = 'elemento'
  li.dataset.tipo = elemento.tipo

  const figura = document.createElement('div')
  figura.className = 'elemento-figura'
  if (urlImagen) {
    const img = document.createElement('img')
    img.src = urlImagen
    img.alt = elemento.texto || etiquetaDe(elemento.tipo)
    img.loading = 'lazy'
    figura.appendChild(img)
  } else {
    // El SVG sale de arte.js, que es nuestro propio codigo, por eso va con
    // innerHTML. El texto que escribe la gente NUNCA va asi: todo lo demas
    // usa textContent.
    figura.innerHTML = arteDe(elemento.tipo)
  }
  li.appendChild(figura)

  // La etiqueta que aparece al pasar el mouse. Dice que es y quien lo puso,
  // que es la informacion que no cabe en el dibujo.
  const etiqueta = document.createElement('span')
  etiqueta.className = 'elemento-etiqueta'
  etiqueta.textContent = elemento.puestoPor
    ? `${etiquetaDe(elemento.tipo)} · ${elemento.puestoPor}`
    : etiquetaDe(elemento.tipo)
  li.appendChild(etiqueta)

  if (elemento.texto) {
    const p = document.createElement('p')
    p.className = 'elemento-texto'
    p.textContent = elemento.texto
    li.appendChild(p)
  }

  const link = elemento.link ? linkSeguro(elemento.link) : null
  if (link) {
    const reproductor = reproductorSpotify(link)
    if (reproductor) {
      li.classList.add('elemento-ancho')
      li.appendChild(reproductor)
    } else {
      const a = document.createElement('a')
      a.className = 'elemento-link'
      a.href = link
      a.target = '_blank'
      a.rel = 'noopener noreferrer'
      a.textContent = 'abrir el link'
      li.appendChild(a)
    }
  }

  const quitar = document.createElement('button')
  quitar.className = 'elemento-quitar'
  quitar.type = 'button'
  quitar.title = `Quitar ${etiquetaDe(elemento.tipo)}`
  quitar.setAttribute('aria-label', `Quitar ${etiquetaDe(elemento.tipo)}`)
  quitar.textContent = '×'
  quitar.addEventListener('click', async () => {
    await almacen.borrar(elemento.id)
    await dibujar()
  })
  li.appendChild(quitar)

  return li
}

async function dibujar() {
  const elementos = await almacen.listar()
  const altar = $('#altar')
  altar.textContent = ''

  for (const { nivel, nombre, descripcion } of NIVELES) {
    const delNivel = elementos
      .filter((el) => el.nivel === nivel)
      .sort((a, b) => (a.posicion ?? 0) - (b.posicion ?? 0))

    const seccion = document.createElement('section')
    seccion.className = 'nivel'

    const encabezado = document.createElement('div')
    encabezado.className = 'nivel-encabezado'

    const h2 = document.createElement('h2')
    h2.textContent = nombre
    const gloss = document.createElement('span')
    gloss.textContent = descripcion
    h2.appendChild(gloss)
    encabezado.appendChild(h2)

    // El contador. Se pone en rojo cuando el nivel ya no acepta mas, asi
    // nadie descubre el limite hasta que lo choca.
    const cuenta = document.createElement('span')
    cuenta.className = 'nivel-cuenta'
    cuenta.textContent = `${delNivel.length} / ${MAX_POR_NIVEL}`
    if (delNivel.length >= MAX_POR_NIVEL) cuenta.classList.add('nivel-lleno')
    encabezado.appendChild(cuenta)
    seccion.appendChild(encabezado)

    const ul = document.createElement('ul')
    ul.className = 'nivel-elementos'
    if (delNivel.length === 0) {
      const vacio = document.createElement('li')
      vacio.className = 'nivel-vacio'
      vacio.textContent = 'Todavía no hay nada en este nivel'
      ul.appendChild(vacio)
    } else {
      for (const el of delNivel) {
        ul.appendChild(tarjeta(el, await almacen.urlDeImagen(el)))
      }
    }
    seccion.appendChild(ul)
    altar.appendChild(seccion)
  }

  $('#cuenta').textContent =
    elementos.length === 1 ? '1 elemento' : `${elementos.length} elementos`

  await revisarCupo()
}

// ---------------------------------------------------------------------
// Cupo del nivel elegido
// ---------------------------------------------------------------------

// Mira el nivel que esta elegido en el formulario y, si ya esta lleno,
// apaga el boton y lo dice. Se llama al dibujar y al cambiar de nivel, para
// que el aviso aparezca ANTES de que la persona intente agregar algo.
async function revisarCupo() {
  const elementos = await almacen.listar()
  const nivel = Number($('#nivel').value)
  const cuantos = elementos.filter((el) => el.nivel === nivel).length
  const lleno = cuantos >= MAX_POR_NIVEL
  const boton = $('#agregar')

  boton.disabled = lleno
  const aviso = $('#cupo')
  if (lleno) {
    const nombre = NIVELES.find((n) => n.nivel === nivel)?.nombre ?? 'Ese nivel'
    aviso.textContent = `${nombre} ya está lleno. Quita algo de ahí o elige otro nivel.`
    aviso.hidden = false
  } else {
    aviso.hidden = true
  }
  return lleno
}

// ---------------------------------------------------------------------
// Imagenes
// ---------------------------------------------------------------------

// Reduce la imagen con un canvas antes de guardarla y la devuelve como data
// URL. Asi una foto de telefono de 8 megas acaba pesando unos 80 KB.
function reducir(archivo) {
  return new Promise((resolve, reject) => {
    const lector = new FileReader()
    lector.onerror = () => reject(new Error('No pude leer esa imagen.'))
    lector.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Ese archivo no parece una imagen.'))
      img.onload = () => {
        const escala = Math.min(1, ANCHO_MAX / img.width)
        const lienzo = document.createElement('canvas')
        lienzo.width = Math.round(img.width * escala)
        lienzo.height = Math.round(img.height * escala)
        lienzo.getContext('2d').drawImage(img, 0, 0, lienzo.width, lienzo.height)
        resolve(lienzo.toDataURL('image/jpeg', 0.82))
      }
      img.src = lector.result
    }
    lector.readAsDataURL(archivo)
  })
}

// ---------------------------------------------------------------------
// Formulario
// ---------------------------------------------------------------------

function llenarTipos() {
  const select = $('#tipo')
  for (const grupo of ['tradicional', 'personal']) {
    const og = document.createElement('optgroup')
    og.label = grupo === 'tradicional' ? 'Tradicionales' : 'Personales'
    for (const [tipo, info] of Object.entries(TIPOS)) {
      if (info.grupo !== grupo) continue
      const opcion = document.createElement('option')
      opcion.value = tipo
      opcion.textContent = info.etiqueta
      og.appendChild(opcion)
    }
    select.appendChild(og)
  }
}

// Cuando cambias de tipo, el formulario se acomoda: el nivel salta al
// sugerido y el campo de texto solo aparece si ese tipo lo pide.
function acomodarFormulario() {
  const info = TIPOS[$('#tipo').value]
  if (!info) return
  $('#nivel').value = String(info.nivel)
  const pide = Boolean(info.pideTexto)
  $('#campo-texto').hidden = !pide
  $('#texto').placeholder = info.ayuda || ''
  $('#campo-link').hidden = $('#tipo').value !== 'cancion'
}

function avisar(mensaje, esError = false) {
  const aviso = $('#aviso')
  aviso.textContent = mensaje
  aviso.classList.toggle('aviso-error', esError)
  aviso.hidden = !mensaje
}

async function alAgregar(evento) {
  evento.preventDefault()
  const boton = $('#agregar')
  boton.disabled = true
  avisar('')

  try {
    const tipo = $('#tipo').value
    const nivel = Number($('#nivel').value)
    const archivo = $('#imagen').files[0]
    const elementos = await almacen.listar()
    const delNivel = elementos.filter((el) => el.nivel === nivel)

    // Segundo candado. El boton ya esta apagado cuando el nivel esta lleno,
    // pero el formulario tambien se puede mandar con Enter.
    if (delNivel.length >= MAX_POR_NIVEL) {
      const nombre = NIVELES.find((n) => n.nivel === nivel)?.nombre ?? 'Ese nivel'
      throw new Error(`${nombre} ya está lleno. Quita algo de ahí o elige otro nivel.`)
    }

    const elemento = {
      tipo,
      nivel,
      posicion: delNivel.length,
      texto: $('#texto').value.trim().slice(0, 280),
      link: $('#link').value.trim(),
      puestoPor: almacen.nombre() || 'alguien',
    }

    if (archivo) {
      if (!archivo.type.startsWith('image/')) {
        throw new Error('Eso no es una imagen.')
      }
      elemento.imagenLocal = await reducir(archivo)
    }

    await almacen.agregar(elemento)
    $('#forma').reset()
    acomodarFormulario()
    await dibujar()
    avisar(`Pusiste ${etiquetaDe(tipo).toLowerCase()} en el altar.`)
  } catch (error) {
    avisar(error.message, true)
  } finally {
    await revisarCupo()
  }
}

// ---------------------------------------------------------------------
// Arranque
// ---------------------------------------------------------------------

function mostrarModo() {
  const banner = $('#modo')
  if (almacen.MODO === 'navegador') {
    banner.textContent =
      'Tu altar está guardado solo en este navegador. Si lo abres en otro lado, no va a estar ahí.'
    banner.dataset.modo = 'navegador'
  } else {
    banner.textContent = 'Tu altar está guardado en tu propia base de datos.'
    banner.dataset.modo = 'nube'
  }
}

function prepararNombre() {
  const input = $('#nombre')
  input.value = almacen.nombre()
  input.addEventListener('change', () => almacen.guardarNombre(input.value.trim()))
}

// La marca de cuando se construyo la pagina.
//
// Suena a detalle y no lo es: es la unica parte visible del build. Cuando
// haces push, Amplify reconstruye y esta fecha cambia.
function mostrarConstruido() {
  const destino = $('#construido')
  const cuando = typeof __CONSTRUIDO__ === 'string' ? __CONSTRUIDO__ : ''
  if (!cuando) {
    destino.textContent = 'corriendo en tu máquina'
    return
  }
  destino.textContent = `publicado ${new Date(cuando).toLocaleString('es-MX', {
    dateStyle: 'short',
    timeStyle: 'short',
  })}`
}

montarAdornos()
llenarTipos()
acomodarFormulario()
prepararNombre()
mostrarModo()
mostrarConstruido()
$('#tipo').addEventListener('change', async () => {
  acomodarFormulario()
  await revisarCupo()
})
$('#nivel').addEventListener('change', revisarCupo)
$('#forma').addEventListener('submit', alAgregar)
await dibujar()
