// npm run doctor
//
// La revisión del prework: dice si tu laptop está lista para construir
// el altar, y cuando algo falta imprime el comando de arreglo para TU
// sistema operativo.
//
// Corre con Node puro y sin tocar la red. AWS CLI sí es un requisito del
// prework porque instala el Agent Toolkit, así que también comprobamos su
// versión antes de revisar la configuración local.

import { execFileSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { homedir, platform } from 'node:os'
import { join } from 'node:path'

// ---------------------------------------------------------------------
// Salida con un poco de color, solo si la terminal lo soporta.
// ---------------------------------------------------------------------
const tty = process.stdout.isTTY
const c = (code, s) => (tty ? `\x1b[${code}m${s}\x1b[0m` : s)
const verde = (s) => c('32', s)
const rojo = (s) => c('31', s)
const amarillo = (s) => c('33', s)
const gris = (s) => c('90', s)

let problemas = 0
const ok = (msg) => console.log(`${verde('✓')} ${msg}`)
const falla = (msg, arreglo) => {
  problemas++
  console.log(`${rojo('✗')} ${msg}`)
  if (arreglo) console.log(gris(`    ${arreglo}`))
}
const aviso = (msg, nota) => {
  console.log(`${amarillo('!')} ${msg}`)
  if (nota) console.log(gris(`    ${nota}`))
}

const PERFIL_AWS = 'ofrenda'

// Windows primero: el taller se da con mayoría de Windows en el salón.
const esWindows = platform() === 'win32'
const esMac = platform() === 'darwin'

// Imprime el comando de arreglo para el sistema de quien corre el doctor.
function arreglo(windows, unix) {
  return esWindows ? windows : unix
}

// ---------------------------------------------------------------------
// Node
// ---------------------------------------------------------------------
function revisarNode() {
  const [mayor, menor] = process.versions.node.split('.').map(Number)
  const compatible = mayor === 24 && menor >= 11
  if (compatible) {
    ok(`Node ${process.versions.node}`)
  } else {
    falla(
      `Node ${process.versions.node} (necesitas Node 24.11 o superior dentro de la línea 24)`,
      arreglo(
        'winget install OpenJS.NodeJS.LTS   (o bájalo de https://nodejs.org)',
        esMac
          ? 'brew install node   (o bájalo de https://nodejs.org)'
          : 'Usa nvm o bájalo de https://nodejs.org'
      )
    )
  }
}

// ---------------------------------------------------------------------
// Git y npm: binarios que sí se instalan a mano.
// ---------------------------------------------------------------------
function versionDe(cmd, args) {
  try {
    return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
      .trim()
      .split('\n')[0]
  } catch {
    return null
  }
}

function revisarGit() {
  const v = versionDe('git', ['--version'])
  if (v) {
    ok(v)
  } else {
    falla(
      'No encontré Git',
      arreglo(
        'winget install Git.Git   (o bájalo de https://git-scm.com)',
        esMac
          ? 'xcode-select --install   (o brew install git)'
          : 'sudo apt install git   (o el gestor de tu distro)'
      )
    )
  }
}

function revisarNpm() {
  // npm viene con Node. En Windows es npm.cmd, y los archivos .cmd se
  // ejecutan mediante cmd.exe en vez de lanzarlos como un .exe.
  const v = esWindows
    ? versionDe(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', 'npm --version'])
    : versionDe('npm', ['--version'])
  if (v) ok(`npm ${v}`)
  else falla('No encontré npm', 'Reinstala Node desde https://nodejs.org (npm viene incluido)')
}

function revisarAwsCli() {
  const v = versionDe(esWindows ? 'aws.exe' : 'aws', ['--version'])
  if (!v) {
    falla(
      'No encontré AWS CLI',
      'Instala AWS CLI 2.35.0 o superior desde https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html'
    )
    return
  }

  const version = v.match(/aws-cli\/(\d+)\.(\d+)\.(\d+)/)
  const compatible = version &&
    (Number(version[1]) > 2 || (Number(version[1]) === 2 && Number(version[2]) >= 35))

  if (compatible) ok(`AWS CLI ${version[1]}.${version[2]}.${version[3]}`)
  else {
    falla(
      `${v} (necesitas AWS CLI 2.35.0 o superior)`,
      'Actualiza AWS CLI antes de continuar'
    )
  }
}

// ---------------------------------------------------------------------
// AWS: leemos ~/.aws/config directo. Sin AWS CLI, sin red, sin llaves.
//
// La nueva experiencia de AWS deja el perfil en ~/.aws/config con un
// credential_process que refresca el token solo. Aqui solo miramos que
// exista un perfil y que tenga Región: NO leemos ~/.aws/credentials ni
// imprimimos ningún secreto.
// ---------------------------------------------------------------------
function revisarAws() {
  const ruta = join(homedir(), '.aws', 'config')
  if (!existsSync(ruta)) {
    falla(
      'No veo configuración de AWS (~/.aws/config)',
      'Ejecuta aws login --profile ofrenda y configura la Región de ese perfil'
    )
    return
  }

  let texto
  try {
    texto = readFileSync(ruta, 'utf8')
  } catch {
    falla('No pude leer ~/.aws/config', 'Revisa los permisos del archivo')
    return
  }

  // Solo [default] y [profile X] son perfiles. Otras secciones, como
  // [sso-session X], no necesitan una Región propia.
  const perfiles = []
  let actual = null
  for (const linea of texto.split('\n')) {
    const l = linea.trim()
    const porDefecto = l.match(/^\[default\]$/)
    const conNombre = l.match(/^\[profile\s+([^\]]+)\]$/)
    if (porDefecto || conNombre) {
      actual = { nombre: conNombre?.[1].trim() || 'default', region: null }
      perfiles.push(actual)
      continue
    }
    if (/^\[.*\]$/.test(l)) {
      actual = null
      continue
    }
    const reg = l.match(/^region\s*=\s*(.+)$/)
    if (reg && actual) actual.region = reg[1].trim()
  }

  const perfil = perfiles.find((item) => item.nombre === PERFIL_AWS)
  if (!perfil) {
    falla(
      `No encontré el perfil de AWS "${PERFIL_AWS}"`,
      `Ejecuta aws login --profile ${PERFIL_AWS} y configura su Región`
    )
    return
  }

  ok(`Perfil de AWS: ${perfil.nombre}`)

  if (!perfil.region) {
    falla(
      `El perfil ${PERFIL_AWS} no tiene Región`,
      `Ejecuta aws configure set region TU-REGION --profile ${PERFIL_AWS}`
    )
  } else {
    ok(`Región: ${perfil.region}`)
  }
}

// ---------------------------------------------------------------------
function main() {
  console.log(`\n  Revisión del prework — Ofrenda en la Nube\n`)
  revisarNode()
  revisarGit()
  revisarNpm()
  revisarAwsCli()
  revisarAws()

  console.log(
    problemas === 0
      ? `\n${verde('Todo listo.')} Tu laptop puede construir el altar.\n`
      : `\n${rojo(`${problemas} cosa(s) por arreglar`)} antes de empezar. Mira los comandos de arriba.\n`
  )
  if (problemas > 0) process.exitCode = 1
}

main()
