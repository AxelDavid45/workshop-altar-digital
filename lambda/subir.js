// POST /uploads y GET /uploads/:imageKey
//
// POST /uploads devuelve una URL firmada para SUBIR una imagen directo a
// S3 desde el navegador. La imagen nunca pasa por la Lambda: el altar pide
// permiso, S3 le da una URL que vive 5 minutos, y el navegador sube ahi.
//
// GET /uploads/:imageKey devuelve una URL firmada para VER una imagen.
// El bucket es privado: nadie ve tu foto sin una URL firmada, y esa URL
// vive hasta una hora.
//
// El bucket es privado. La URL firmada es la unica puerta, y solo abre
// para la operacion que se firmo: PUT para subir, GET para ver.

import { randomUUID } from 'node:crypto'
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const s3 = new S3Client({ requestChecksumCalculation: 'WHEN_REQUIRED' })

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST',
  'Access-Control-Allow-Headers': 'Content-Type',
}

// Solo imagenes y solo de los tipos que el navegador sabe convertir.

function altarValido(valor) {
  return (
    typeof valor === 'string' &&
    valor.length >= 1 &&
    valor.length <= 253 &&
    /^[a-zA-Z0-9.-]+$/.test(valor)
  )
}

function imageKeyValida(valor) {
  return (
    typeof valor === 'string' &&
    valor.length <= 320 &&
    /^[a-zA-Z0-9.-]+\/[0-9a-f-]{36}\.(jpeg|png|webp|gif)$/.test(valor)
  )
}
const PERMITIDOS = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

export async function handler(event) {
  // GET /uploads/<imageKey> — la URL firmada de lectura.
  // La ruta es {proxy+}, asi que el imageKey (que lleva un '/') llega
  // entero en event.pathParameters.proxy.
  if (event.httpMethod === 'GET') {
    const imageKey = event.pathParameters?.proxy
    if (!imageKeyValida(imageKey)) {
      return {
        statusCode: 400,
        headers: CORS,
        body: JSON.stringify({ error: 'La llave de la imagen no es valida.' }),
      }
    }

    // La URL firmada de lectura vive hasta una hora. Las credenciales
    // temporales de la Lambda pueden hacer que expire antes.
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
  const contentType = cuerpo.contentType
  if (!altarValido(altarId)) {
    return {
      statusCode: 400,
      headers: CORS,
      body: JSON.stringify({ error: 'altarId no es valido.' }),
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
