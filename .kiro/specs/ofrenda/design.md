# Design Document

## Overview

Cómo se construye lo que pide `requirements.md`. Lo que dice este archivo no se
negocia, aunque haya otra forma que parezca mejor: los checkpoints
(`npm run verify N`) y las ramas de rescate dependen de estos nombres y
contratos. Esta arquitectura ya se desplegó y se probó contra AWS real.

## Architecture

### Infraestructura

- Todo el backend vive en un stack de CDK en TypeScript, en `infra/ofrenda-stack.ts`,
  con el punto de entrada en `bin/ofrenda.ts` y la config en `cdk.json`.
- El stack se llama `ofrenda`, en la Región del proyecto. Una sola tabla, un solo
  bucket, tres Lambdas y una REST API.
- **CDK, no Amplify Gen 2.** Amplify Hosting publica `web/` desde GitHub y se
  configura con `amplify.yml`, no con recursos de este stack.
- Las dependencias de CDK y del SDK van en `devDependencies`, para que el build
  del frontend en Amplify (`npm ci --omit=dev`) no las descargue.

### Las Lambdas: JavaScript plano, sin build

- Los handlers viven en `lambda/`, en JavaScript plano (`.js`), y se montan con
  `lambda.Function` + `Code.fromAsset('lambda')`. **Nada de `NodejsFunction`:**
  sin `esbuild` en el entorno, bundlea en un contenedor de Docker, y en Windows
  eso es Docker Desktop y permisos de administrador. Con `Code.fromAsset` el
  código que escribes es el que corre, lo que hace honesto el momento de revisar
  el diff.
- `lambda/package.json` con `{ "type": "module" }` es **obligatorio**: sin él,
  Lambda carga los `.js` como CommonJS y revienta con "Cannot use import
  statement outside a module". El `package.json` de la raíz no sirve, porque
  `Code.fromAsset` solo empaqueta la carpeta `lambda/`.
- Runtime `nodejs22.x`, 128 MB, timeout 10 s. El SDK de AWS v3 ya viene en el
  runtime, así que los handlers lo importan sin que viaje en el paquete.

## Data Models

### La tabla de DynamoDB

La llave no se toca. Estas reglas existen porque un cambio aquí puede borrar los
elementos del altar:

- `tableName` fijo: `ofrenda-elementos`.
- `partitionKey`: `altarId` (String). Todos los elementos de un altar viven en la
  misma partición, así que listar un altar nunca toca los de otro.
- `sortKey`: `sk` (String), con la forma `<creadoEn>#<id>`. Como la fecha ISO
  ordena como texto, un `Query` por `altarId` devuelve los elementos en el orden
  en que se pusieron.
- `billingMode: PAY_PER_REQUEST`.
- `removalPolicy: DESTROY`, para que `npm run limpiar` (que corre el asistente)
  borre la tabla al cerrar el taller. En un proyecto real esto sería `RETAIN`.
- Sin índices secundarios (ni GSI ni LSI).

### El bucket de S3

- Nombre: `ofrenda-imagenes-<account-id>` (el account id lo mete CDK con
  `cdk.Aws.ACCOUNT_ID`).
- `blockPublicAccess: BLOCK_ALL`. El bucket es privado: una imagen solo se ve con
  una URL firmada. Es la forma que AWS recomienda para objetos privados.
- `removalPolicy: DESTROY` + `autoDeleteObjects: true`. Sin las dos,
  CloudFormation no puede borrar un bucket con objetos dentro y el cierre del
  taller se rompe para quien subió una imagen.
- CORS para el método `PUT` desde cualquier origen (la URL firmada lleva la
  autorización; el CORS solo deja pasar el método).

## Components and Interfaces

### Las tres Lambdas y sus permisos

Cada Lambda lleva solo los permisos que usa. Nada de `Resource: '*'` ni policies
administradas.

| Handler | Archivo | Permiso | Por qué |
| --- | --- | --- | --- |
| `listar` | `lambda/listar.js` | `tabla.grantReadData` | Solo lee |
| `agregar` | `lambda/agregar.js` | `tabla.grantReadWriteData` | Escribe, y lee para contar la posición dentro del nivel |
| `subir` | `lambda/subir.js` | `bucket.grantPut` + `bucket.grantRead` | Firma URLs de subida (PUT) y de lectura (GET) |

### La API: REST API con cuatro rutas

| Método | Ruta | Lambda |
| --- | --- | --- |
| `GET` | `/elements?altarId=...` | `listar` |
| `POST` | `/elements` | `agregar` (crear y borrar) |
| `POST` | `/uploads` | `subir` (firma de subida) |
| `GET` | `/uploads/{proxy+}` | `subir` (firma de lectura) |

- La ruta de lectura usa `{proxy+}` (proxy greedy) porque el `imageKey` lleva un
  `/` (`<altarId>/<uuid>.jpeg`) y un path parameter normal se cortaría en el `/`.
  El handler lee la llave de `event.pathParameters.proxy`.
- `defaultCorsPreflightOptions` con `allowOrigins: ALL_ORIGINS`,
  `allowMethods: ['GET','POST']`, `allowHeaders: ['Content-Type']`.
- Stage `v1`. Un `CfnOutput` llamado `ApiUrl` imprime la base de la API al final
  del deploy; esa URL va en Amplify como `VITE_API_URL`.

### Los handlers

Cada handler devuelve `{ statusCode, headers, body }` con los headers de CORS
(`Access-Control-Allow-Origin: *`). El cuerpo es JSON.

- **`listar`**: `QueryCommand` por `altarId`, `ScanIndexForward: true`,
  `Limit: 200`. Quita `sk` de cada item antes de devolver `{ elementos }`.
- **`agregar`**: si el cuerpo trae `borrar: true` + `id`, busca el item con un
  `Query` + filtro por `id` y lo borra (`DeleteCommand`), responde
  `{ borrado }`. Si no, filtra los campos permitidos, cuenta cuántos hay en el
  nivel para la `posicion`, arma `id`, `creadoEn` y `sk`, hace `PutCommand` y
  responde 201 con el elemento sin `sk`.
- **`subir`**: si es `GET`, firma un `GetObjectCommand` (1 hora) y responde
  `{ url }`. Si es `POST`, valida el `contentType`, arma la `imageKey`
  (`<altarId>/<uuid>.<ext>`), firma un `PutObjectCommand` (5 min) y responde
  `{ url, imageKey }`.

## El frontend en el módulo 3

El altar en `web/` no sabe dónde se guardan las cosas: se lo pregunta a
`web/almacen.js`. En el módulo 3, `almacen.js` se reescribe para hablarle a la
API en vez de a `localStorage`. Las cuatro funciones (`listar`, `agregar`,
`borrar`, `urlDeImagen`) mantienen su firma.

- La URL de la API sale de `import.meta.env.VITE_API_URL` (nunca escrita en el
  código).
- `MODO` pasa de `'navegador'` a `'nube'`, para que el banner de la página diga
  la verdad.
- `altar.js` cambia en una línea: en vez de reducir la imagen a data URL en
  `imagenLocal`, pasa el `File` crudo en `imagen`, y `almacen.js` se encarga de
  reducirlo y subirlo a S3.

Esta versión vive en la rama de rescate `modulo-3`.

## Pasos extra

- **Familia (Cognito):** un user pool, un autorizador en las rutas de escritura
  (`POST /elements`, `POST /uploads`) y una lista de miembros por altar. El
  handler comprueba que quien escribe sea dueño o invitado. Lee en ese momento la
  sección correspondiente; no está detallada aquí.
- **Voz (Polly):** una Lambda que convierte el `texto` de los elementos `recuerdo`
  en un MP3 con Amazon Polly y lo guarda en S3.
