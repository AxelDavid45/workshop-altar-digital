# Implementation Plan

## Overview

Cada tarea es un módulo del workshop. Quien la ejecuta está aprendiendo y va a
leer el diff antes de aceptarlo, así que haz cambios chicos y fáciles de revisar.
No corras comandos de deploy en ninguna tarea.

## Task Dependency Graph

La tarea 1 (backend) y la tarea 2 (un tipo nuevo) son independientes. La tarea 3
(Familia) necesita el backend de la tarea 1. La tarea 4 (Voz) también.

```json
{
  "waves": [
    { "wave": 1, "tasks": [1, 2], "dependsOn": [] },
    { "wave": 2, "tasks": [3, 4], "dependsOn": [1] }
  ]
}
```

```text
1 ─┬──> 3
   └──> 4
2 (independiente)
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
  - Agrega un valor nuevo de `tipo` en `web/elementos.js` (su etiqueta, grupo,
    nivel sugerido) y su dibujo en `web/arte.js`, siguiendo el estilo de los que
    ya existen.
  - Solo toca el frontend. NO toques `infra/`, `lambda/` ni el contrato de la
    API: un tipo nuevo es texto libre para la tabla.
  - Al terminar, corre `npm run dev` y confirma que el tipo nuevo aparece en el
    formulario y se dibuja en el altar.
  - _Requisitos: 6_

- [ ]* 3. Familia: login con Cognito (paso extra)
  - Sigue **Pasos extra > Familia (Cognito)** de `design.md`: agrega un user pool
    sin registro abierto, un app client sin secreto con `USER_PASSWORD_AUTH`, un
    autorizador de Cognito en las rutas de escritura (`POST /elements`,
    `POST /uploads`), y una lista de miembros por altar que el handler consulta
    antes de escribir.
  - El `GET /elements` sigue abierto (el altar es público de leer).
  - No separes esto como solución multiusuario completa: es quién puede ESCRIBIR
    en un altar, no aislamiento de datos.
  - _Requisitos: los de la sección Familia_

- [ ]* 4. Voz: el recuerdo se escucha (paso extra)
  - Sigue **Pasos extra > Voz (Polly)** de `design.md`: una Lambda que, cuando se
    agrega un elemento `recuerdo` con texto, llama a Amazon Polly, guarda el MP3
    en el bucket y deja su llave en el elemento. El frontend lo reproduce.
  - Dale a esa Lambda solo el permiso de Polly que usa (`polly:SynthesizeSpeech`)
    y `grantPut` sobre el bucket. Nada de `Resource: '*'`.
  - _Requisitos: los de la sección Voz_
