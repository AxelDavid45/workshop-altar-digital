// El altar completo.
//
// Este archivo solo COMPONE: no tiene logica de datos ni de presentacion.
// El estado vive en hooks/useAltar.js, y cada pieza de la pantalla en su
// componente. Si algo se rompe, el archivo donde buscarlo se adivina por
// el nombre.

import { useState } from 'react'
import { TIPOS, necesitaPanel } from './catalogo/elementos.js'
import { useAltar } from './hooks/useAltar.js'
import { useNombre } from './hooks/useNombre.js'
import Encabezado from './componentes/layout/Encabezado.jsx'
import BannerDeModo from './componentes/layout/BannerDeModo.jsx'
import PieDePagina from './componentes/layout/PieDePagina.jsx'
import Altar from './componentes/altar/Altar.jsx'
import Galeria from './componentes/galeria/Galeria.jsx'
import Panel from './componentes/panel/Panel.jsx'
import AltarCargando from './componentes/estado/AltarCargando.jsx'
import AvisoDeError from './componentes/estado/AvisoDeError.jsx'

export default function App() {
  const altar = useAltar()
  const { nombre, guardar, comoFirma } = useNombre()

  // Que tipo tiene el panel abierto, o null si se ve la galeria.
  const [eligiendo, setEligiendo] = useState(null)

  // Lo que no pide ningun dato cae directo a su grada natural. La galeria
  // ya apaga el boton cuando esa grada esta llena, asi que aqui no puede
  // llegar un tipo sin lugar.
  async function elegir(tipo) {
    if (necesitaPanel(tipo)) {
      setEligiendo(tipo)
      return
    }
    await altar.agregar({
      tipo,
      nivel: TIPOS[tipo].nivel,
      texto: '',
      link: '',
      puestoPor: comoFirma,
    })
  }

  async function poner(datos) {
    return altar.agregar({ ...datos, puestoPor: comoFirma })
  }

  return (
    <>
      <Encabezado nombre={nombre} onNombre={guardar} />
      <BannerDeModo modo={altar.modo} />

      {altar.error && <AvisoDeError mensaje={altar.error} onReintentar={altar.refrescar} />}

      <main>
        {altar.cargando ? (
          <AltarCargando />
        ) : (
          <Altar
            elementos={altar.elementos}
            imagenes={altar.imagenes}
            onQuitar={altar.quitar}
          />
        )}

        <aside>
          {eligiendo ? (
            <Panel
              tipo={eligiendo}
              nivelLleno={altar.nivelLleno}
              cuantosEn={altar.cuantosEn}
              onPoner={poner}
              onCancelar={() => setEligiendo(null)}
            />
          ) : (
            <Galeria nivelLleno={altar.nivelLleno} onElegir={elegir} />
          )}
        </aside>
      </main>

      <PieDePagina total={altar.elementos.length} />
    </>
  )
}
