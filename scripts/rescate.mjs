// npm run rescate <3|4>
//
// Copia la solución del módulo elegido a la rama actual sin hacer switch.
// Primero exige un working tree limpio para no pisar trabajo sin commit.

import { execFileSync } from 'node:child_process'

const modulo = process.argv[2]
const rutas = {
  '3': ['infra', 'lambda', 'web/src/datos/almacen.js'],
  '4': [
    'infra',
    'lambda',
    'web/src/datos/almacen.js',
    'web/src/catalogo/elementos.js',
    'web/src/catalogo/arte.js',
  ],
}

function git(args, opciones = {}) {
  return execFileSync('git', args, {
    encoding: 'utf8',
    stdio: opciones.heredar ? 'inherit' : ['ignore', 'pipe', 'pipe'],
  })
}

if (!rutas[modulo]) {
  console.error('Uso: npm run rescate <3|4>')
  process.exit(1)
}

const cambios = git(['status', '--porcelain']).trim()
if (cambios) {
  console.error('Guarda tus cambios con git add + git commit antes del rescate.')
  process.exit(1)
}

const rama = `modulo-${modulo}`
try {
  git(['rev-parse', '--verify', rama])
} catch {
  console.error(`No encuentro la rama ${rama}. Confirma que tu fork copió todas las ramas.`)
  process.exit(1)
}

git(['restore', `--source=${rama}`, '--', ...rutas[modulo]], { heredar: true })

console.log(`\nSolución del módulo ${modulo} copiada a tu rama actual.`)
console.log('Revisa los archivos, luego ejecuta git add, git commit y git push.')
