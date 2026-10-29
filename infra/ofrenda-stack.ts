// El stack del altar: la tabla, el bucket, las tres Lambdas y la API.
//
// Este es el archivo que revisas antes de desplegar. Esta escrito para
// leerse de arriba a abajo: primero donde viven los datos, luego quien
// los atiende, al final como se llega desde internet.
//
// Preguntas del diff (modulo 3):
//   1. El bucket, quedo privado? (busca blockPublicAccess)
//   2. Los permisos de datos apuntan a la tabla y al bucket concretos?
//   3. Listar usa Query con Limit o se fue a Scan? (eso se revisa en
//      lambda/listar.js, no aqui)

import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as cdk from 'aws-cdk-lib'
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as lambda from 'aws-cdk-lib/aws-lambda'
import * as apigw from 'aws-cdk-lib/aws-apigateway'
import { Construct } from 'constructs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export class OfrendaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    // -----------------------------------------------------------------
    // La tabla: un item por elemento del altar.
    //
    // partitionKey = altarId: todos los elementos de un altar viven
    // juntos, asi que listar un altar NUNCA toca los de otro.
    //
    // sortKey = sk, con la forma "<creadoEn>#<id>": como la fecha ISO
    // ordena como texto, un Query por altarId devuelve los elementos en
    // el orden en que se pusieron, y con Limit basta para no traerse
    // de mas. Listar es un Query, nunca un Scan.
    // -----------------------------------------------------------------
    const tabla = new dynamodb.Table(this, 'elementos', {
      tableName: 'ofrenda-elementos',
      partitionKey: { name: 'altarId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'sk', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      // El taller termina con `npm run limpiar`, que borra el stack, y la
      // tabla se tiene que ir con el. En un proyecto real esto seria RETAIN.
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    })

    // -----------------------------------------------------------------
    // El bucket: las imagenes que sube la gente.
    //
    // Privado de nacimiento: nadie ve tu foto sin una URL firmada.
    // blockAllPublicAccess es la red de seguridad por si alguien le
    // pone una policy publica despues.
    //
    // DESTROY + autoDeleteObjects: el cierre del taller borra el stack,
    // y CloudFormation no puede borrar un bucket con objetos dentro.
    // Sin estas dos lineas, quien subio una imagen no puede terminar
    // el taller limpio.
    // -----------------------------------------------------------------
    const bucket = new s3.Bucket(this, 'imagenes', {
      bucketName: `ofrenda-imagenes-${cdk.Aws.ACCOUNT_ID}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      cors: [
        {
          // El navegador sube la imagen directo a S3 con la URL firmada,
          // asi que S3 tiene que aceptar el PUT desde el origen de tu
          // pagina (Amplify o tu localhost). La URL firmada lleva la
          // autorizacion; este CORS solo deja pasar el metodo.
          allowedMethods: [s3.HttpMethods.PUT],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
          maxAge: 300,
        },
      ],
    })

    // -----------------------------------------------------------------
    // Las Lambdas: JavaScript plano, sin build.
    //
    // lambda.Function + Code.fromAsset: el archivo que lees es el
    // archivo que corre. Nada de NodejsFunction, que sin esbuild en el
    // entorno se va a un contenedor de Docker, y en Windows eso es
    // Docker Desktop y permisos de administrador.
    // -----------------------------------------------------------------
    const comun = {
      runtime: lambda.Runtime.NODEJS_22_X,
      memorySize: 128,
      timeout: cdk.Duration.seconds(10),
    }

    const listar = new lambda.Function(this, 'listar', {
      ...comun,
      functionName: 'ofrenda-listar',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda')),
      handler: 'listar.handler',
      environment: { TABLA: tabla.tableName },
    })

    const agregar = new lambda.Function(this, 'agregar', {
      ...comun,
      functionName: 'ofrenda-agregar',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda')),
      handler: 'agregar.handler',
      environment: { TABLA: tabla.tableName },
    })

    const subir = new lambda.Function(this, 'subir', {
      ...comun,
      functionName: 'ofrenda-subir',
      code: lambda.Code.fromAsset(path.join(__dirname, '../lambda')),
      handler: 'subir.handler',
      environment: { BUCKET: bucket.bucketName },
    })

    // -----------------------------------------------------------------
    // Los permisos: cada Lambda toca solo lo que usa.
    //
    // Los grants de datos apuntan a ESTA tabla o ESTE bucket. Nada de
    // policies FullAccess ni permisos de DynamoDB/S3 con Resource: '*'.
    // CDK agrega aparte la policy basica para escribir logs en CloudWatch.
    //
    // grantReadWrite a `agregar` es a proposito: para ordenar el
    // elemento dentro de su nivel, el handler cuenta cuantos hay antes
    // de escribir, y eso es un Query.
    // -----------------------------------------------------------------
    tabla.grantReadData(listar)
    tabla.grantReadWriteData(agregar)
    // grantPut para la URL firmada de escritura, grantRead para la de
    // lectura. La misma Lambda atiende POST /uploads y GET /uploads/:imageKey.
    bucket.grantPut(subir)
    bucket.grantRead(subir)

    // -----------------------------------------------------------------
    // La API: cuatro rutas y nada mas.
    //
    //   GET  /elements?altarId=...   lista los elementos de un altar
    //   POST /elements               agrega o quita un elemento
    //   POST /uploads                devuelve una URL firmada de subida
    //   GET  /uploads/{proxy+}       devuelve una URL firmada de lectura
    //
    // defaultCorsPreflightOptions deja que el navegador hable con la
    // API desde tu pagina. Sin esto, el primer fetch muere antes de
    // llegar a la Lambda.
    // -----------------------------------------------------------------
    const api = new apigw.RestApi(this, 'api', {
      restApiName: 'ofrenda',
      deployOptions: {
        stageName: 'v1',
        throttlingRateLimit: 20,
        throttlingBurstLimit: 40,
      },
      defaultCorsPreflightOptions: {
        // Cada asistente obtiene un dominio de Amplify distinto y tambien
        // usa localhost. La API es publica por diseño del workshop, asi
        // que CORS permite esos navegadores; CORS no sustituye auth.
        allowOrigins: apigw.Cors.ALL_ORIGINS,
        allowMethods: ['GET', 'POST'],
        allowHeaders: ['Content-Type'],
      },
    })

    const headersDeError = {
      'Access-Control-Allow-Origin': "'*'",
      'Access-Control-Allow-Headers': "'Content-Type'",
    }
    api.addGatewayResponse('errores4xx', {
      type: apigw.ResponseType.DEFAULT_4XX,
      responseHeaders: headersDeError,
    })
    api.addGatewayResponse('errores5xx', {
      type: apigw.ResponseType.DEFAULT_5XX,
      responseHeaders: headersDeError,
    })

    const elementos = api.root.addResource('elements')
    elementos.addMethod('GET', new apigw.LambdaIntegration(listar))
    elementos.addMethod('POST', new apigw.LambdaIntegration(agregar))

    const uploads = api.root.addResource('uploads')
    uploads.addMethod('POST', new apigw.LambdaIntegration(subir))

    // GET /uploads/<imageKey> — la URL firmada de lectura. El imageKey
    // tiene la forma "<altarId>/<uuid>.jpeg", o sea lleva un '/', asi
    // que se usa un proxy greedy ({proxy+}) y el handler lo reconstruye.
    const upload = uploads.addResource('{proxy+}')
    upload.addMethod('GET', new apigw.LambdaIntegration(subir))

    // -----------------------------------------------------------------
    // Lo que necesitas apuntar tu pagina a tu API. Sale impreso al
    // final de `cdk deploy` y en la consola de CloudFormation.
    // -----------------------------------------------------------------
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'La base de tu API. En Amplify va como VITE_API_URL.',
    })
  }
}
