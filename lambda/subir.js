// POST /uploads y GET /uploads/:imageKey
//
// POST /uploads devuelve una URL firmada para SUBIR una imagen directo a
// S3 desde el navegador. La imagen nunca pasa por la Lambda: el altar pide
// permiso, S3 le da una URL que vive 5 minutos, y el navegador sube ahi.
//
// GET /uploads/:imageKey devuelve una URL firmada para VER una imagen.
// El bucket es privado: nadie ve tu foto sin una URL firmada, y esa URL
// vive una hora.
//
// El bucket es privado. La URL firmada es la unica puerta, y solo abre
// para la operacion que se firmo: PUT para subir, GET para ver.

import { randomUUID } from 'node:crypto'
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const s3 = new S3Client({})

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST',
  'Access-Control-Allow-Headers': 'Content-Type',
}

// Solo imagenes, y solo de los tipos que el navegador sabe mandar.
// La URL firmada queda atada a este Content-Type: si el navegador sube
// otra cosa, S3 la rechaza.
const PERMITIDOS = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

export async function handler(event) {
  // GET /uploads/<imageKey> — la URL firmada de lectura.
  // La ruta es {proxy+}, asi que el imageKey (que lleva un '/') llega
  // entero en event.pathParameters.proxy.
  if (event.httpMethod === 'GET') {
    const imageKey = event.pathParameters?.proxy
    if (!imageKey) {
      return {
        statusCode: 400,
        headers: CORS,
        body: JSON.stringify({ error: 'Falta la llave de la imagen.' }),
      }
    }

    // La URL firmada de lectura vive una hora. Es la unica forma de ver
    // una imagen en un bucket privado.
    const url = await getSignedUrl(
      s3,
      new GetObjectCommand({
        Bucket: process.env.BUCKET,
        Key: imageKey,
      }),
      { expiresIn: 3600 }
    )

    return {
      statusCode: 200,
      headers: CORS,
      body: JSON.stringify({ url }),
    }
  }

  // POST /uploads — la URL firmada de escritura.
  let cuerpo
  try {
    cuerpo = JSON.parse(event.body || '{}')
  } catch {
    return {
      statusCode: 400,
      headers: CORS,
      body: JSON.stringify({ error: 'El cuerpo no es JSON valido.' }),
    }
  }

  const altarId = cuerpo.altarId
  const contentType = cuerpo.contentType || 'image/jpeg'
  if (!altarId || typeof altarId !== 'string') {
    return {
      statusCode: 400,
      headers: CORS,
      body: JSON.stringify({ error: 'Falta altarId en el cuerpo.' }),
    }
  }
  if (!PERMITIDOS.has(contentType)) {
    return {
      statusCode: 400,
      headers: CORS,
      body: JSON.stringify({ error: `Solo se aceptan imagenes: ${[...PERMITIDOS].join(', ')}.` }),
    }
  }

  const extension = contentType.split('/')[1]
  const imageKey = `${altarId}/${randomUUID()}.${extension}`

  const url = await getSignedUrl(
    s3,
    new PutObjectCommand({
      Bucket: process.env.BUCKET,
      Key: imageKey,
      ContentType: contentType,
    }),
    { expiresIn: 300 }
  )

  return {
    statusCode: 200,
    headers: CORS,
    body: JSON.stringify({ url, imageKey }),
  }
}
