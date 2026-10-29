// POST /elements
//
// Agrega un elemento al altar y lo devuelve como quedo guardado.
// Sirve tambien para quitar uno: el cuerpo { borrar: true, id } lo
// elimina. Asi la API se queda en tres rutas y no necesitamos
// DELETE /elements/:id (API Gateway cobra y configura por ruta).

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
const CAMPOS = ['tipo', 'nivel', 'posicion', 'texto', 'link', 'puestoPor', 'imageKey']

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
  if (!altarId || typeof altarId !== 'string') {
    return {
      statusCode: 400,
      headers: CORS,
      body: JSON.stringify({ error: 'Falta altarId en el cuerpo.' }),
    }
  }

  // -- Quitar un elemento ---------------------------------------------
  if (cuerpo.borrar === true && typeof cuerpo.id === 'string') {
    // La sort key es "<creadoEn>#<id>", asi que para borrar hay que
    // encontrarla primero. Un Query por altarId con un filtro sobre la
    // llave misma: sigue siendo Query, nunca Scan.
    const encontrado = await ddb.send(
      new QueryCommand({
        TableName: process.env.TABLA,
        KeyConditionExpression: 'altarId = :altar',
        FilterExpression: 'id = :id',
        ExpressionAttributeValues: { ':altar': altarId, ':id': cuerpo.id },
        Limit: 1,
      })
    )
    const item = encontrado.Items?.[0]
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
  if (typeof cuerpo.tipo !== 'string' || cuerpo.tipo.length === 0) {
    return {
      statusCode: 400,
      headers: CORS,
      body: JSON.stringify({ error: 'Falta el tipo del elemento.' }),
    }
  }

  // La posicion es el orden dentro de su nivel: cuantos hay ya en ese
  // nivel, ahi va el nuevo. Por eso esta Lambda tambien lee la tabla
  // (grantReadWriteData), no solo escribe.
  const nivel = Number(cuerpo.nivel) || 1
  const delNivel = await ddb.send(
    new QueryCommand({
      TableName: process.env.TABLA,
      KeyConditionExpression: 'altarId = :altar',
      FilterExpression: 'nivel = :nivel',
      ExpressionAttributeValues: { ':altar': altarId, ':nivel': nivel },
      Select: 'COUNT',
    })
  )

  const elemento = { altarId }
  for (const campo of CAMPOS) {
    if (cuerpo[campo] !== undefined) elemento[campo] = cuerpo[campo]
  }
  elemento.nivel = nivel
  elemento.posicion = delNivel.Count || 0
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
