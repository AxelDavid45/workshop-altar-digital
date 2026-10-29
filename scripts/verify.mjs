// npm run verify <N> [url o api-url]
//
// Los checkpoints de cada módulo, probados de verdad contra lo que ya
// desplegaste. Corre con Node puro (fetch nativo de Node 24), sin AWS CLI
// y sin dependencias.
//
//   npm run verify 2 https://main.<app-id>.amplifyapp.com   tu página publicada
//   npm run verify 3 [https://<api>.execute-api...]          tu backend
//   npm run verify 4 https://main.<app-id>.amplifyapp.com   tu página vestida
//
// En el módulo 3, si no pasas la URL de tu API, la leo de tu .env
// (VITE_API_URL). Los elementos de prueba que creo se borran al terminar.

import { readFileSync, existsSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const RAIZ = join(__dirname, '..')

// ---------------------------------------------------------------------
// Salida
// ---------------------------------------------------------------------
const tty = process.stdout.isTTY
const col = (code, s) => (tty ? `\x1b[${code}m${s}\x1b[0m` : s)
const verde = (s) => col('32', s)
const rojo = (s) => col('31', s)
const gris = (s) => col('90', s)

class Falla extends Error {
  constructor(mensaje, pista) {
    super(mensaje)
    this.pista = pista
  }
}
const esperar = (cond, mensaje, pista) => {
  if (!cond) throw new Falla(mensaje, pista)
}

// ---------------------------------------------------------------------
// Resolver la URL de la API: argumento, o VITE_API_URL del .env
// ---------------------------------------------------------------------
function apiDelEnv() {
  const env = join(RAIZ, '.env')
  if (!existsSync(env)) return null
  const texto = readFileSync(env, 'utf8')
  const linea = texto.split('\n').find((l) => l.trim().startsWith('VITE_API_URL='))
  if (!linea) return null
  const valor = linea.split('=').slice(1).join('=').trim()
  return valor || null
}

function resolverApi(argumento) {
  const cruda = argumento || apiDelEnv()
  esperar(
    cruda,
    'No sé cuál es tu API',
    'Pásala: npm run verify 3 https://<api>.execute-api... , o ponla como VITE_API_URL en tu .env'
  )
  // Sin diagonal final, para armar las rutas sin dobles //
  return cruda.replace(/\/+$/, '')
}

// ---------------------------------------------------------------------
// Checkpoints
// ---------------------------------------------------------------------

async function checkpointSitio(url, { bundleConApi = false } = {}) {
  esperar(url, 'Falta la URL de tu página', 'npm run verify 2 https://main.<app-id>.amplifyapp.com')
  let u
  try {
    u = new URL(url)
  } catch {
    throw new Falla(`Esa URL no es válida: ${url}`)
  }
  esperar(u.protocol === 'https:', 'Tu página tiene que ser https', 'Copia la URL de Amplify, que ya es https')
  if (!u.hostname.endsWith('.amplifyapp.com')) {
    console.log(gris(`  (ojo: ${u.hostname} no es *.amplifyapp.com; sigo de todos modos)`))
  }

  const res = await fetch(u.toString())
  esperar(
    res.status === 200,
    `Tu página respondió ${res.status}`,
    'Revisa en Amplify que el build de main haya terminado en verde'
  )
  const html = await res.text()
  esperar(
    /ofrenda/i.test(html) || /id="altar"/.test(html),
    'La página respondió, pero no parece ser el altar',
    'Confirma que amplify.yml publique la carpeta dist/'
  )

  if (bundleConApi) {
    // El módulo 4 ya habla con el backend: VITE_API_URL quedó horneada en
    // el bundle al construir. La buscamos en los <script> de la página.
    const scripts = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1])
    let encontrada = false
    for (const src of scripts) {
      const jsUrl = new URL(src, u).toString()
      const js = await fetch(jsUrl).then((r) => (r.ok ? r.text() : '')).catch(() => '')
      if (/execute-api\.[a-z0-9-]+\.amazonaws\.com/.test(js)) {
        encontrada = true
        break
      }
    }
    esperar(
      encontrada,
      'El bundle de tu página no apunta a ninguna API',
      'Pon VITE_API_URL en Amplify (App settings > Environment variables) y dale redeploy'
    )
  }
  return `${u.hostname} responde 200`
}

async function checkpointBackend(apiArg) {
  const API = resolverApi(apiArg)
  const altarId = `verify-${Date.now()}`
  const creados = []

  async function borrarPrueba(id) {
    return fetch(`${API}/elements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ altarId, borrar: true, id }),
    })
  }

  try {
    // 1. El preflight debe permitir que un navegador llame a la API.
    const options = await fetch(`${API}/elements`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://verify.example',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type',
      },
    })
    esperar(options.ok, `OPTIONS /elements respondió ${options.status}`)
    esperar(
      options.headers.get('access-control-allow-origin'),
      'El preflight no devolvió Access-Control-Allow-Origin'
    )

    // 2. Crear dos elementos. El segundo permite probar el bug de Limit + filtro.
    for (const texto of ['primero', 'segundo']) {
      const post = await fetch(`${API}/elements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ altarId, tipo: 'vela', nivel: 2, texto }),
      })
      esperar(
        post.status === 201,
        `POST /elements respondió ${post.status}`,
        post.status === 502 || post.status === 500
          ? '¿Falta lambda/package.json con {"type":"module"}? Revisa CloudWatch'
          : 'Revisa que desplegaste el stack con npm run deploy'
      )
      const creado = await post.json()
      esperar(creado.id, 'El POST no devolvió el id del elemento')
      creados.push(creado.id)
    }

    // 3. Listarlos y encontrarlos.
    const get = await fetch(`${API}/elements?altarId=${altarId}`)
    esperar(get.status === 200, `GET /elements respondió ${get.status}`)
    const lista = await get.json()
    esperar(Array.isArray(lista.elementos), 'El GET no trae la lista "elementos"')
    for (const id of creados) {
      esperar(
        lista.elementos.some((elemento) => elemento.id === id),
        `El elemento ${id} no aparece en el GET`,
        '¿El listar usa Query por altarId? Revisa lambda/listar.js'
      )
    }

    // 4. Firmar, subir bytes reales y volver a leerlos.
    const up = await fetch(`${API}/uploads`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ altarId, contentType: 'image/jpeg' }),
    })
    esperar(up.status === 200, `POST /uploads respondió ${up.status}`)
    const firma = await up.json()
    esperar(firma.url && firma.imageKey, 'POST /uploads no devolvió url + imageKey')
    esperar(/X-Amz-Signature=/.test(firma.url), 'La URL de subida no viene firmada')

    const imagen = Buffer.from([0xff, 0xd8, 0xff, 0xd9])
    const put = await fetch(firma.url, {
      method: 'PUT',
      headers: { 'Content-Type': 'image/jpeg' },
      body: imagen,
    })
    esperar(
      put.ok,
      `El PUT firmado a S3 respondió ${put.status}`,
      'Revisa requestChecksumCalculation en lambda/subir.js y el CORS del bucket'
    )

    const lectura = await fetch(`${API}/uploads/${firma.imageKey}`)
    esperar(lectura.status === 200, `GET /uploads/<imageKey> respondió ${lectura.status}`)
    const firmaLectura = await lectura.json()
    esperar(firmaLectura.url, 'La lectura no devolvió una URL firmada')
    const descarga = await fetch(firmaLectura.url)
    esperar(descarga.ok, `La descarga firmada respondió ${descarga.status}`)
    esperar((await descarga.arrayBuffer()).byteLength === imagen.length, 'La imagen cambió en S3')

    // 5. Validaciones del contrato.
    const sinAltar = await fetch(`${API}/elements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tipo: 'vela' }),
    })
    esperar(sinAltar.status === 400, `POST sin altarId respondió ${sinAltar.status}`)

    const sinTipo = await fetch(`${API}/elements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ altarId }),
    })
    esperar(sinTipo.status === 400, `POST sin tipo respondió ${sinTipo.status}`)

    // 6. Borrar el segundo elemento y confirmar que de verdad desapareció.
    const segundo = creados[1]
    const borrado = await borrarPrueba(segundo)
    esperar(
      borrado.status === 200,
      `Borrar el segundo elemento respondió ${borrado.status}`,
      'DynamoDB aplica Limit antes de FilterExpression; revisa lambda/agregar.js'
    )
    creados.splice(1, 1)

    const despues = await fetch(`${API}/elements?altarId=${altarId}`).then((r) => r.json())
    esperar(
      !despues.elementos.some((elemento) => elemento.id === segundo),
      'El elemento borrado todavía aparece en el GET'
    )

    return `CORS, crear, listar, subir, leer, validar y borrar — ${new URL(API).hostname}`
  } finally {
    // Limpieza best-effort, incluso cuando una comprobación anterior falla.
    for (const id of creados) {
      await borrarPrueba(id).catch(() => {})
    }
  }
}

// ---------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------
const CHECKS = {
  '2': { titulo: 'Tu altar, publicado', correr: (a) => checkpointSitio(a[0]) },
  '3': { titulo: 'Tu propio backend', correr: (a) => checkpointBackend(a[0]) },
  '4': { titulo: 'Tu altar, vestido y en producción', correr: (a) => checkpointSitio(a[0], { bundleConApi: true }) },
}

async function main() {
  const modulo = process.argv[2]
  const resto = process.argv.slice(3)

  if (!modulo || !CHECKS[modulo]) {
    console.log(`Uso: npm run verify <${Object.keys(CHECKS).join('|')}> [url]`)
    console.log(gris('  verify 2 <url-de-amplify>   verify 3 [url-de-tu-api]   verify 4 <url-de-amplify>'))
    process.exitCode = 1
    return
  }

  const { titulo, correr } = CHECKS[modulo]
  console.log(`\n  Checkpoint ${modulo}: ${titulo}\n`)

  try {
    const detalle = await correr(resto)
    console.log(`${verde('✓')} ${detalle || 'listo'}`)
    console.log(`\n${verde(`✅ Checkpoint ${modulo} completo.`)}\n`)
  } catch (err) {
    const e = err instanceof Falla ? err : new Falla(err.message || String(err))
    console.log(`${rojo('✗')} ${e.message}`)
    if (e.pista) console.log(gris(`    ${e.pista}`))
    console.log(`\n${rojo('Todavía no.')} Mira el "Si te atoras" del módulo ${modulo} en el sitio.\n`)
    process.exitCode = 1
  }
}

main()
