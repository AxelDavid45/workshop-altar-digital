// Quien esta armando el altar.
//
// Es su propio hook porque es su propio dato: no pertenece a ningun
// elemento. En la primera version "Tu nombre" vivia dentro del formulario
// de agregar cosas, lo cual decia que tu nombre era una propiedad de una
// vela. No lo es.

import { useCallback, useState } from 'react'
import * as almacen from '../datos/almacen.js'

export function useNombre() {
  const [nombre, setNombre] = useState(() => almacen.nombre())

  const guardar = useCallback((valor) => {
    setNombre(valor)
    almacen.guardarNombre(valor)
  }, [])

  // Lo que se guarda en un elemento cuando nadie puso su nombre.
  const comoFirma = nombre.trim() || 'alguien'

  return { nombre, guardar, comoFirma }
}
