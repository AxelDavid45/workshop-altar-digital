import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite construye el altar y lo deja en dist/, que es lo que publica Amplify.
//
// La configuracion es corta a proposito: lo unico que no es default es que
// el frontend vive en web/ en lugar de en la raiz, porque la raiz la ocupa
// la infraestructura de CDK.
export default defineConfig({
  plugins: [react()],

  root: 'web',

  // El .env vive en la raiz del proyecto, no dentro de web/.
  envDir: '..',

  build: {
    outDir: '../dist',
    emptyOutDir: true,
  },

  define: {
    // La fecha en que se construyo la pagina. Vite la reemplaza por un
    // literal al construir, asi que el navegador no calcula nada.
    //
    // Es la parte visible del build: el pie de la pagina muestra esta
    // fecha, y cambia sola cada vez que haces push y Amplify reconstruye.
    __CONSTRUIDO__: JSON.stringify(new Date().toISOString()),
  },

  server: {
    // Solo tu maquina. Nadie mas en la red del evento ve tu altar en local.
    host: '127.0.0.1',
    port: 3000,
  },
})
