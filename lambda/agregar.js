// POST /elements
//
// Agrega un elemento al altar y lo devuelve como quedo guardado.
// Sirve tambien para quitar uno: el cuerpo { borrar: true, id } lo
// elimina. La misma ruta mantiene corto el contrato que se revisa en el
// workshop.

import { randomUUID } from 'node:crypto'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  DeleteCommand,
} from '@aws-sdk/lib-dynamodb'

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST',
  'Access-Control-Allow-Headers': 'Content-Type',
}

// Solo estos campos viajan a la tabla. El cuerpo del POST lo escribe
// cualquiera que tenga la URL de la API, asi que se filtra: lo que no
// esta aqui, no entra.
const CAMPOS = ['tipo', 'nivel', 'texto', 'link', 'puestoPor', 'imageKey']
const LIMITE_POR_NIVEL = 6
const LIMITE_QUERY = 200

function altarValido(valor) {
  return (
    typeof valor === 'string' &&
    valor.length >= 1 &&
    valor.length <= 253 &&
    /^[a-zA-Z0-9.-]+$/.test(valor)
  )
}

function enlaceValido(valor) {
  if (valor === undefined || valor === '') return true
  if (typeof valor !== 'string' || valor.length > 500) return false
  try {
    return new URL(valor).protocol === 'https:'
  } catch {
    return false
  }
}

async function buscarPorId(altarId, id) {
  let inicio
  do {
    const pagina = await ddb.send(
      new QueryCommand({
        TableName: process.env.TABLA,
        KeyConditionExpression: 'altarId = :altar',
        FilterExpression: 'id = :id',
        ExpressionAttributeValues: { ':altar': altarId, ':id': id },
        ProjectionExpression: 'sk, id',
        Limit: LIMITE_QUERY,
        ExclusiveStartKey: inicio,
      })
    )
    if (pagina.Items?.[0]) return pagina.Items[0]
    inicio = pagina.LastEvaluatedKey
  } while (inicio)
  return null
}

async function contarNivel(altarId, nivel) {
  let total = 0
  let inicio
  do {
    const pagina = await ddb.send(
      new QueryCommand({
        TableName: process.env.TABLA,
        KeyConditionExpression: 'altarId = :altar',
        FilterExpression: 'nivel = :nivel',
        ExpressionAttributeValues: { ':altar': altarId, ':nivel': nivel },
        Select: 'COUNT',
        Limit: LIMITE_QUERY,
        ExclusiveStartKey: inicio,
      })
    )
    total += pagina.Count || 0
    inicio = pagina.LastEvaluatedKey
  } while (inicio)
  return total
}

export async function handler(event) {
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
  if (!altarValido(altarId)) {
    return {
      statusCode: 400,
      headers: CORS,
      body: JSON.stringify({ error: 'altarId no es valido.' }),
    }
  }

  // -- Quitar un elemento ---------------------------------------------
  if (cuerpo.borrar === true && typeof cuerpo.id === 'string') {
    const item = await buscarPorId(altarId, cuerpo.id)
    if (!item) {
      return {
        statusCode: 404,
        headers: CORS,
        body: JSON.stringify({ error: 'Ese elemento no esta en el altar.' }),
      }
    }
    await ddb.send(
      new DeleteCommand({
        TableName: process.env.TABLA,
        Key: { altarId, sk: item.sk },
      })
    )
    return { statusCode: 200, headers: CORS, body: JSON.stringify({ borrado: cuerpo.id }) }
  }

  // -- Poner un elemento ----------------------------------------------
  if (
    typeof cuerpo.tipo !== 'string' ||
    !/^[a-z0-9-]{1,40}$/.test(cuerpo.tipo)
  ) {
    return {
      statusCode: 400,
      headers: CORS,
      body: JSON.stringify({ error: 'El tipo debe usar 1 a 40 letras, numeros o guiones.' }),
    }
  }

  const nivel = cuerpo.nivel === undefined ? 1 : Number(cuerpo.nivel)
  if (!Number.isInteger(nivel) || nivel < 1 || nivel > 3) {
    return {
      statusCode: 400,
      headers: CORS,
      body: JSON.stringify({ error: 'El nivel debe ser 1, 2 o 3.' }),
    }
  }
  if (cuerpo.texto !== undefined && (typeof cuerpo.texto !== 'string' || cuerpo.texto.length > 280)) {
    return {
      statusCode: 400,
      headers: CORS,
      body: JSON.stringify({ error: 'El texto puede tener hasta 280 caracteres.' }),
    }
  }
  if (!enlaceValido(cuerpo.link)) {
    return {
      statusCode: 400,
      headers: CORS,
      body: JSON.stringify({ error: 'El link debe ser una URL https valida.' }),
    }
  }
  if (
    cuerpo.puestoPor !== undefined &&
    (typeof cuerpo.puestoPor !== 'string' || cuerpo.puestoPor.length > 40)
  ) {
    return {
      statusCode: 400,
      headers: CORS,
      body: JSON.stringify({ error: 'puestoPor puede tener hasta 40 caracteres.' }),
    }
  }
  if (
    cuerpo.imageKey !== undefined &&
    (typeof cuerpo.imageKey !== 'string' ||
      cuerpo.imageKey.length > 320 ||
      !cuerpo.imageKey.startsWith(`${altarId}/`))
  ) {
    return {
      statusCode: 400,
      headers: CORS,
      body: JSON.stringify({ error: 'imageKey no pertenece a este altar.' }),
    }
  }

  // La posicion la calcula el servidor. El limite tambien se aplica aqui,
  // porque la API es publica y no debemos confiar solo en el navegador.
  const posicion = await contarNivel(altarId, nivel)
  if (posicion >= LIMITE_POR_NIVEL) {
    return {
      statusCode: 409,
      headers: CORS,
      body: JSON.stringify({ error: 'Ese nivel ya tiene seis elementos.' }),
    }
  }

  const elemento = { altarId }
  for (const campo of CAMPOS) {
    if (cuerpo[campo] !== undefined) elemento[campo] = cuerpo[campo]
  }
  elemento.nivel = nivel
  elemento.posicion = posicion
  elemento.id = randomUUID()
  elemento.creadoEn = new Date().toISOString()

  // La llave de ordenamiento: fecha ISO primero, id despues. La fecha
  // ordena como texto y el id desempata dos elementos del mismo
  // milisegundo.
  elemento.sk = `${elemento.creadoEn}#${elemento.id}`

  await ddb.send(
    new PutCommand({
      TableName: process.env.TABLA,
      Item: elemento,
    })
  )

  // sk no le dice nada al altar; la respuesta va sin ella.
  const { sk, ...guardado } = elemento

  return {
    statusCode: 201,
    headers: CORS,
    body: JSON.stringify(guardado),
  }
}
