# Requirements Document

## Introduction

El altar guarda cada cosa que se pone (una flor, una vela, una foto, un recuerdo)
como un elemento, con la misma forma en `localStorage` y en DynamoDB. Este
documento es el contrato de la API: `npm run verify 3` lo revisa contra la API
desplegada, así que si algo de aquí cambia, el verify deja de pasar.

Un altar es de una persona y se identifica con `altarId`, un id que el navegador
genera y guarda. Todos los elementos de un altar comparten ese `altarId`.

Forma de un elemento (la misma en el navegador y en la base de datos):

```json
{
  "altarId":   "string",
  "tipo":      "cempasuchil | vela | papel | sal | agua | pan | copal | foto | recuerdo | cancion | comida | bebida | objeto | calaverita",
  "nivel":     1,
  "posicion":  0,
  "texto":     "opcional, hasta 280 chars",
  "link":      "opcional, URL https",
  "imageKey":  "opcional, llave de S3",
  "puestoPor": "opcional, hasta 40 chars",
  "id":        "uuid, lo pone la API",
  "creadoEn":  "ISO en UTC, lo pone la API"
}
```

## Requirements

### Requisito 1: Agregar un elemento

**Historia:** Como persona que arma su altar, quiero poner un elemento, para que
quede guardado en mi propia base de datos y no solo en este navegador.

Ruta: `POST /elements`. Cuerpo con `altarId` y los campos del elemento.

#### Criterios de aceptación

1. CUANDO llega un elemento con `altarId` y `tipo`, LA API DEBE guardarlo y
   responder 201 con el elemento guardado, incluyendo `id` y `creadoEn`.
2. LA API DEBE poner ella misma `id` (uuid), `creadoEn` (ISO en UTC) y la
   `posicion` (cuántos elementos hay ya en ese nivel), sin confiar en que el
   cliente los mande.
3. LA API DEBE guardar como sort key `sk` el texto `<creadoEn>#<id>`, y NO DEBE
   devolver `sk` en la respuesta.
4. SI falta `altarId`, ENTONCES LA API DEBE responder 400 con `{ "error": "..." }`
   y no guardar nada.
5. SI falta `tipo`, ENTONCES LA API DEBE responder 400.
6. LA API DEBE aceptar solo estos campos del cliente: `tipo`, `nivel`,
   `posicion`, `texto`, `link`, `puestoPor`, `imageKey`. Cualquier otro se
   ignora.

### Requisito 2: Quitar un elemento

**Historia:** Como persona que arma su altar, quiero quitar algo que puse, para
corregir el altar.

Ruta: `POST /elements` con `{ "altarId": "...", "borrar": true, "id": "..." }`.
Se usa la misma ruta para no sumar una ruta de `DELETE` (API Gateway configura y
cobra por ruta).

#### Criterios de aceptación

1. CUANDO llega `borrar: true` con un `id` que existe en ese altar, LA API DEBE
   borrarlo y responder 200 con `{ "borrado": "<id>" }`.
2. SI el `id` no está en ese altar, ENTONCES LA API DEBE responder 404.

### Requisito 3: Listar el altar

**Historia:** Como persona que armó su altar, quiero verlo desde cualquier
dispositivo, para que viva fuera de un solo navegador.

Ruta: `GET /elements?altarId=...`, abierta (sin credenciales).

#### Criterios de aceptación

1. CUANDO llega un `altarId`, LA API DEBE responder 200 con `{ "elementos": [...] }`.
2. LA API DEBE traer los elementos de ESE altar con un `Query` por `altarId`,
   nunca con un `Scan`, acotado con `Limit`.
3. LA API DEBE devolver los elementos en el orden en que se pusieron (la `sk`
   empieza con la fecha, así que un Query ascendente ya los ordena).
4. Cada elemento de la lista NO DEBE traer `sk`.
5. SI falta `altarId`, ENTONCES LA API DEBE responder 400.

### Requisito 4: Subir una imagen propia

**Historia:** Como persona que arma su altar, quiero poner mi propia foto, para
que el altar sea mío y no solo el arte por default.

El bucket es privado. La imagen no pasa por la Lambda: el navegador pide una URL
firmada, sube directo a S3, y guarda solo la `imageKey` en el elemento.

Rutas: `POST /uploads` (firma para subir) y `GET /uploads/<imageKey>` (firma para
ver).

#### Criterios de aceptación

1. CUANDO llega `POST /uploads` con `altarId` y un `contentType` de imagen, LA
   API DEBE responder 200 con `{ "url": "<url firmada>", "imageKey": "<llave>" }`.
2. LA URL firmada de subida DEBE servir para un `PUT` y caducar en 5 minutos.
3. SI el `contentType` no es una imagen (`image/jpeg`, `image/png`, `image/webp`,
   `image/gif`), ENTONCES LA API DEBE responder 400.
4. CUANDO llega `GET /uploads/<imageKey>`, LA API DEBE responder 200 con
   `{ "url": "<url firmada de lectura>" }` que caduca en 1 hora.
5. EL BUCKET DEBE ser privado (`blockPublicAccess: BLOCK_ALL`): una imagen solo
   se ve con una URL firmada, nunca con una URL pública directa.

### Requisito 5: CORS

**Historia:** Como el altar que corre en el navegador del asistente, quiero poder
llamar a la API desde mi página de Amplify.

#### Criterios de aceptación

1. LA API DEBE responder al preflight `OPTIONS` de las rutas con los headers de
   CORS, para que el navegador deje pasar el `fetch` desde el origen de la página.
2. EL BUCKET DEBE aceptar el `PUT` de la URL firmada desde el origen de la página
   (CORS de S3 para el método PUT).

### Requisito 6: Un tipo de elemento nuevo (paso del módulo 4)

**Historia:** Como persona que arma su altar, quiero agregar un tipo de elemento
que no venía, para ver que eso no toca el backend.

#### Criterios de aceptación

1. CUANDO se agrega un tipo nuevo, SOLO DEBE tocar el frontend (`web/src/catalogo/elementos.js`
   y `web/src/catalogo/arte.js`): un valor nuevo de `tipo`, su etiqueta y su dibujo.
2. EL BACKEND NO DEBE cambiar: `tipo` es un texto libre para la tabla, así que un
   tipo nuevo no necesita tocar las Lambdas ni el stack.
