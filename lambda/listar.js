// GET /elements?altarId=...
//
// Devuelve los elementos de un altar, en el orden en que se pusieron.
//
// Lo importante aqui: esto es un Query, nunca un Scan. Un Scan recorre
// la tabla entera y luego tira lo que no es tuyo; un Query va directo a
// la particion de tu altar. Y va con Limit, para no traernos de mas.

import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb'

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({}))

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST',
  'Access-Control-Allow-Headers': 'Content-Type',
}

function altarValido(valor) {
  return (
    typeof valor === 'string' &&
    valor.length >= 1 &&
    valor.length <= 253 &&
    /^[a-zA-Z0-9.-]+$/.test(valor)
  )
}

export async function handler(event) {
  const altarId = event.queryStringParameters?.altarId
  if (!altarValido(altarId)) {
    return {
      statusCode: 400,
      headers: CORS,
      body: JSON.stringify({ error: 'altarId no es valido.' }),
    }
  }

  const resultado = await ddb.send(
    new QueryCommand({
      TableName: process.env.TABLA,
      KeyConditionExpression: 'altarId = :altar',
      ExpressionAttributeValues: { ':altar': altarId },
      // La sort key empieza con la fecha ISO, asi que orden ascendente
      // es "en el orden en que se pusieron".
      ScanIndexForward: true,
      Limit: 200,
    })
  )

  // sk es un detalle interno de la tabla ("<creadoEn>#<id>"); de la
  // respuesta sale cada elemento como lo conoce el altar, con su id.
  const elementos = (resultado.Items || []).map(({ sk, ...resto }) => resto)

  return {
    statusCode: 200,
    headers: CORS,
    body: JSON.stringify({ elementos }),
  }
}
