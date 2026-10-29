// npm run doctor
//
// La revisión del prework: dice si tu laptop está lista para construir
// el altar, y cuando algo falta imprime el comando de arreglo para TU
// sistema operativo.
//
// Corre con Node puro, sin instalar nada y sin tocar la red. Por eso no
// usa el AWS CLI (que en este taller no se instala) ni ninguna
// dependencia: tiene que funcionar aunque sea lo primero que corres.

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
  const mayor = Number(process.versions.node.split('.')[0])
  if (mayor >= 22) {
    ok(`Node ${process.versions.node}`)
  } else {
    falla(
      `Node ${process.versions.node} (necesitas 22 o superior)`,
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
  // npm viene con Node, asi que si falta es raro, pero lo confirmamos.
  const v = versionDe(esWindows ? 'npm.cmd' : 'npm', ['--version'])
  if (v) ok(`npm ${v}`)
  else falla('No encontré npm', 'Reinstala Node desde https://nodejs.org (npm viene incluido)')
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
      'Corre el prompt del Agent Toolkit para AWS; ahí se configura tu proyecto'
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

  // Parseo mínimo de INI: secciones [profile X] o [default] y su region.
  const perfiles = []
  let actual = null
  for (const linea of texto.split('\n')) {
    const l = linea.trim()
    const sec = l.match(/^\[(?:profile\s+)?([^\]]+)\]$/)
    if (sec) {
      actual = { nombre: sec[1].trim(), region: null }
      perfiles.push(actual)
      continue
    }
    const reg = l.match(/^region\s*=\s*(.+)$/)
    if (reg && actual) actual.region = reg[1].trim()
  }

  if (perfiles.length === 0) {
    falla(
      'Tu ~/.aws/config no tiene perfiles',
      'Corre el prompt del Agent Toolkit para AWS'
    )
    return
  }

  ok(`Perfiles de AWS: ${perfiles.map((p) => p.nombre).join(', ')}`)

  const sinRegion = perfiles.filter((p) => !p.region)
  if (sinRegion.length) {
    aviso(
      `Sin Región: ${sinRegion.map((p) => p.nombre).join(', ')}`,
      'Confirma tu Región en AWS Settings > tu proyecto > Overview. Los recursos solo se crean ahí.'
    )
  } else {
    const regiones = [...new Set(perfiles.map((p) => p.region))]
    ok(`Región: ${regiones.join(', ')}`)
  }
}

// ---------------------------------------------------------------------
function main() {
  console.log(`\n  Revisión del prework — Ofrenda en la Nube\n`)
  revisarNode()
  revisarGit()
  revisarNpm()
  revisarAws()

  console.log(
    problemas === 0
      ? `\n${verde('Todo listo.')} Tu laptop puede construir el altar.\n`
      : `\n${rojo(`${problemas} cosa(s) por arreglar`)} antes de empezar. Mira los comandos de arriba.\n`
  )
  if (problemas > 0) process.exitCode = 1
}

main()
