// Catalogo de tipos de elemento.
//
// Todo lo que se pone en el altar es un elemento. Una flor y una foto son
// el mismo objeto con un `tipo` distinto, igual que en un altar de verdad,
// donde todo se coloca a mano.
//
// Agregar un tipo nuevo aqui NO necesita tocar el backend: es un valor mas
// de `tipo`, su etiqueta, y su dibujo en arte.js.

export const TIPOS = {
  // Tradicionales
  cempasuchil: { etiqueta: 'Cempasúchil', grupo: 'tradicional', nivel: 1, pideTexto: false },
  vela: { etiqueta: 'Vela', grupo: 'tradicional', nivel: 2, pideTexto: false },
  papel: { etiqueta: 'Papel picado', grupo: 'tradicional', nivel: 3, pideTexto: false },
  sal: { etiqueta: 'Sal', grupo: 'tradicional', nivel: 1, pideTexto: false },
  agua: { etiqueta: 'Agua', grupo: 'tradicional', nivel: 1, pideTexto: false },
  pan: { etiqueta: 'Pan de muerto', grupo: 'tradicional', nivel: 2, pideTexto: false },
  copal: { etiqueta: 'Copal', grupo: 'tradicional', nivel: 1, pideTexto: false },

  // Personales
  foto: { etiqueta: 'Foto', grupo: 'personal', nivel: 3, pideTexto: true, ayuda: 'De quién es' },
  recuerdo: { etiqueta: 'Recuerdo', grupo: 'personal', nivel: 3, pideTexto: true, ayuda: 'Lo que quieras dejar escrito' },
  cancion: { etiqueta: 'Canción', grupo: 'personal', nivel: 2, pideTexto: true, ayuda: 'Título y artista' },
  comida: { etiqueta: 'Comida', grupo: 'personal', nivel: 2, pideTexto: true, ayuda: 'Su platillo favorito' },
  bebida: { etiqueta: 'Bebida', grupo: 'personal', nivel: 2, pideTexto: true, ayuda: 'Qué tomaba' },
  objeto: { etiqueta: 'Objeto', grupo: 'personal', nivel: 2, pideTexto: true, ayuda: 'Algo que era suyo' },
  calaverita: { etiqueta: 'Calaverita', grupo: 'personal', nivel: 3, pideTexto: true, ayuda: 'El nombre que va en la frente' },
}

export const NIVELES = [
  { nivel: 3, nombre: 'Arriba', descripcion: 'A quién recuerdas' },
  { nivel: 2, nombre: 'En medio', descripcion: 'Lo que le gustaba' },
  { nivel: 1, nombre: 'Abajo', descripcion: 'Lo que necesita para el camino' },
]

export function etiquetaDe(tipo) {
  return TIPOS[tipo]?.etiqueta || tipo
}

// El altar no arranca vacio. Esto es un set tradicional tipico, para que
// desde el primer deploy se vea vestido y nadie empiece en una pagina
// en blanco. Se puede borrar elemento por elemento.
export function setTradicional() {
  const base = [
    { tipo: 'papel', nivel: 3, posicion: 0 },
    { tipo: 'vela', nivel: 2, posicion: 0 },
    { tipo: 'pan', nivel: 2, posicion: 1 },
    { tipo: 'vela', nivel: 2, posicion: 2 },
    { tipo: 'cempasuchil', nivel: 1, posicion: 0 },
    { tipo: 'agua', nivel: 1, posicion: 1 },
    { tipo: 'sal', nivel: 1, posicion: 2 },
    { tipo: 'copal', nivel: 1, posicion: 3 },
    { tipo: 'cempasuchil', nivel: 1, posicion: 4 },
  ]
  const ahora = Date.now()
  return base.map((el, i) => ({
    ...el,
    // Las semillas se separan un milisegundo para que el orden de creacion
    // sea estable cuando se guarden en la base de datos.
    id: `semilla-${i}`,
    texto: '',
    link: '',
    puestoPor: 'el altar',
    creadoEn: new Date(ahora + i).toISOString(),
  }))
}
