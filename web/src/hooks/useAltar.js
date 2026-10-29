// El estado del altar, en un solo lugar.
//
// Este hook es la unica parte de la app que le habla a almacen.js. Los
// componentes reciben datos y funciones, y no saben si por debajo hay un
// localStorage o una API.
//
// Tres cosas que hace aqui y que importan cuando el altar vive en la nube:
//
//   1. Lista UNA vez por refresco. El cupo de cada nivel se calcula del
//      estado que ya tenemos, no volviendo a preguntar.
//   2. Resuelve las URLs de las imagenes EN PARALELO con Promise.all. En
//      serie, un altar de 18 elementos son 18 viajes de red uno tras otro.
//   3. Agrega y quita de forma optimista: la pantalla cambia de inmediato
//      y, si la peticion falla, se revierte y lo dice. Con localStorage no
//      se notaba porque era instantaneo; contra una API hay 300 ms de
//      espera en cada clic.

import { useCallback, useEffect, useRef, useState } from 'react'
import * as almacen from '../datos/almacen.js'
import { CUPO_POR_NIVEL } from '../catalogo/elementos.js'

/** Resuelve la imagen de cada elemento a la vez, no una tras otra. */
async function urlesDe(elementos) {
  const urls = await Promise.all(elementos.map((el) => almacen.urlDeImagen(el)))
  return new Map(elementos.map((el, i) => [el.id, urls[i]]).filter(([, url]) => url))
}

export function useAltar() {
  const [elementos, setElementos] = useState([])
  const [imagenes, setImagenes] = useState(new Map())
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [aviso, setAviso] = useState('')

  // Las object URL que creamos para mostrar una foto antes de que el
  // guardado confirme. Hay que liberarlas o la memoria se queda colgada.
  const temporales = useRef(new Set())

  const liberar = useCallback((url) => {
    if (url && temporales.current.has(url)) {
      URL.revokeObjectURL(url)
      temporales.current.delete(url)
    }
  }, [])

  const refrescar = useCallback(async () => {
    try {
      setError(null)
      const lista = await almacen.listar()
      setElementos(lista)
      setImagenes(await urlesDe(lista))
    } catch (err) {
      setError(err.message || 'No pude leer el altar.')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    refrescar()
    // Al desmontar, soltar cualquier object URL que quedara viva.
    return () => {
      for (const url of temporales.current) URL.revokeObjectURL(url)
      temporales.current.clear()
    }
  }, [refrescar])

  const cuantosEn = useCallback(
    (nivel) => elementos.filter((el) => el.nivel === nivel).length,
    [elementos],
  )

  const nivelLleno = useCallback((nivel) => cuantosEn(nivel) >= CUPO_POR_NIVEL, [cuantosEn])

  /**
   * Pone algo en el altar.
   *
   * Aparece de inmediato con un id temporal. Cuando almacen.js confirma,
   * el temporal se reemplaza por el guardado de verdad. Si falla, se quita
   * y se dice por que.
   */
  const agregar = useCallback(
    async (datos) => {
      if (nivelLleno(datos.nivel)) {
        setError('Ese nivel ya está lleno. Quita algo de ahí o elige otro.')
        return false
      }

      const idTemporal = `pendiente-${crypto.randomUUID()}`
      const optimista = {
        ...datos,
        imagen: undefined,
        id: idTemporal,
        creadoEn: new Date().toISOString(),
        pendiente: true,
      }

      // Si trae foto, se muestra ya, sin esperar a que se guarde.
      let urlTemporal = null
      if (datos.imagen) {
        urlTemporal = URL.createObjectURL(datos.imagen)
        temporales.current.add(urlTemporal)
        setImagenes((prev) => new Map(prev).set(idTemporal, urlTemporal))
      }

      setElementos((prev) => [...prev, optimista])
      setError(null)

      try {
        const guardado = await almacen.agregar(datos)
        const url = await almacen.urlDeImagen(guardado)
        setElementos((prev) => prev.map((el) => (el.id === idTemporal ? guardado : el)))
        setImagenes((prev) => {
          const siguiente = new Map(prev)
          siguiente.delete(idTemporal)
          if (url) siguiente.set(guardado.id, url)
          return siguiente
        })
        liberar(urlTemporal)
        return true
      } catch (err) {
        // Se revierte: el elemento nunca llego a guardarse.
        setElementos((prev) => prev.filter((el) => el.id !== idTemporal))
        setImagenes((prev) => {
          const siguiente = new Map(prev)
          siguiente.delete(idTemporal)
          return siguiente
        })
        liberar(urlTemporal)
        setError(err.message || 'No pude poner eso en el altar.')
        return false
      }
    },
    [nivelLleno, liberar],
  )

  /** Quita algo del altar. Desaparece de inmediato y vuelve si falla. */
  const quitar = useCallback(
    async (id) => {
      const anterior = elementos
      setElementos((prev) => prev.filter((el) => el.id !== id))
      setError(null)
      try {
        await almacen.borrar(id)
      } catch (err) {
        setElementos(anterior)
        setError(err.message || 'No pude quitar eso del altar.')
      }
    },
    [elementos],
  )

  return {
    elementos,
    imagenes,
    cargando,
    error,
    aviso,
    setAviso,
    agregar,
    quitar,
    cuantosEn,
    nivelLleno,
    refrescar,
    modo: almacen.MODO,
  }
}
