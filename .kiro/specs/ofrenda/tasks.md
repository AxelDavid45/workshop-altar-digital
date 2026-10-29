# Implementation Plan

## Overview

Cada tarea es un módulo del workshop. Quien la ejecuta está aprendiendo y va a
leer el diff antes de aceptarlo, así que haz cambios chicos y fáciles de revisar.
No corras comandos de deploy en ninguna tarea.

## Task Dependency Graph

La tarea 1 (backend) y la tarea 2 (un tipo nuevo) son independientes: la 2 solo
toca el frontend. Se pueden hacer en cualquier orden, aunque el taller pide la 1
en el módulo 3 y la 2 en el módulo 4.

```json
{
  "waves": [
    { "wave": 1, "tasks": [1, 2], "dependsOn": [] }
  ]
}
```

```text
1 (backend, modulo 3)
2 (frontend, modulo 4)   independientes entre si
```

## Tasks

- [ ] 1. Escribir el stack y los tres handlers (módulo 3)
  - Escribe `infra/ofrenda-stack.ts` siguiendo **Architecture**, **Data Models** y
    **Components and Interfaces** de `design.md`: la tabla, el bucket privado, las
    tres Lambdas con sus permisos mínimos y la REST API con sus cuatro rutas.
  - Escribe los tres handlers en `lambda/` (`listar.js`, `agregar.js`,
    `subir.js`) siguiendo la sección **Los handlers** de `design.md`, en
    JavaScript plano con `import` (ESM).
  - Crea `lambda/package.json` con `{ "type": "module" }`. Sin él las Lambdas no
    cargan.
  - No uses `NodejsFunction`. No uses `Resource: '*'` ni policies administradas:
    cada Lambda lleva solo su `grant...` sobre la tabla o el bucket.
  - No agregues dependencias: el SDK de AWS v3 ya viene en el runtime.
  - Al terminar, corre `npm run synth` (solo sintetiza, no despliega) y confirma
    que pasa. El asistente revisa el diff y despliega con `npm run deploy`.
  - _Requisitos: 1, 2, 3, 4, 5_

- [ ] 2. Agregar un tipo de elemento nuevo (módulo 4)
  - Agrega un valor nuevo de `tipo` en `web/src/catalogo/elementos.js` (su etiqueta, grupo,
    nivel sugerido) y su dibujo en `web/src/catalogo/arte.js`, siguiendo el estilo de los que
    ya existen.
  - Solo toca el frontend. NO toques `infra/`, `lambda/` ni el contrato de la
    API: un tipo nuevo es texto libre para la tabla.
  - Al terminar, corre `npm run dev` y confirma que el tipo nuevo aparece en el
    formulario y se dibuja en el altar.
  - _Requisitos: 6_
