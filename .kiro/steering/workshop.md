---
inclusion: always
---

# Reglas del workshop Ofrenda en la Nube

Este repo es el starter de un workshop. Quien te pide algo aquí está aprendiendo
y va a revisar tu diff antes de aceptarlo, así que haz cambios chicos y fáciles
de leer.

## Antes de escribir código

- El trabajo de este repo está en la spec `.kiro/specs/ofrenda/`. Cada tarea de
  `tasks.md` dice qué archivos tocar y qué sección de `design.md` seguir. Lo que
  dicen `requirements.md` y `design.md` no se negocia, aunque te parezca que hay
  una forma mejor: los checkpoints (`npm run verify N`) y las ramas de rescate
  dependen de esos nombres y contratos.
- Si te piden algo que no está en una tarea, sigue igual `design.md` y estas
  reglas.
- Sigue el estilo del código que ya existe. El frontend es React y vive en
  `web/src/`, repartido así: los componentes en `componentes/` agrupados por
  parte de la pantalla, el estado en `hooks/`, la capa de datos en `datos/`, el
  catálogo de elementos y su arte en `catalogo/`, y los ayudantes sin JSX en
  `lib/`. Un componente por archivo. Para los handlers, el estilo de los que ya
  estén en `lambda/`.

## Lo que nunca haces

- **Nunca despliegas.** Nada de `cdk deploy`, `cdk bootstrap`, `cdk destroy`,
  `npm run deploy`, `npm run synth` corrido para aplicar, ni los scripts de
  limpieza. El asistente despliega desde su terminal cuando revisó tu diff.
- **No tocas la llave de la tabla.** Ni el logical id del constructo de la tabla,
  ni su `partitionKey` (`altarId`), ni su `sortKey` (`sk`), ni su
  `removalPolicy`. Un cambio ahí puede borrar los elementos del altar.
- **No tocas el bucket de imágenes** más allá de lo que pida la tarea: se queda
  con `blockPublicAccess: BLOCK_ALL`, `removalPolicy: DESTROY` y
  `autoDeleteObjects: true`. Sin esas tres, el cierre del taller se rompe para
  quien subió una imagen.
- **No agregas permisos amplios sobre los datos.** Nada de
  `AmazonDynamoDBFullAccess`, `AmazonS3FullAccess` ni permisos de DynamoDB o S3
  con `Resource: '*'`. Usa los grants sobre la tabla o el bucket concretos. La
  policy básica que CDK adjunta para escribir logs en CloudWatch es esperada.
- **No cambias el contrato de la API** (rutas, status codes, nombres de campos)
  que define `requirements.md`. Si cambia, `npm run verify` deja de pasar.
- **No agregas dependencias nuevas** a `package.json`. El SDK de AWS v3 ya viene
  en el runtime de Lambda.
- **No creas recursos en otra Región** que no sea la del proyecto, ni fuera del
  stack de `infra/`.
- **No borras `lambda/package.json`.** Ese archivo (`{"type": "module"}`) es lo
  que hace que Lambda cargue los handlers como ES modules. Sin él, las Lambdas
  revientan con "Cannot use import statement outside a module".

## Cuando termines

- Corre `npm run synth` solo para comprobar que el stack sintetiza (eso no
  despliega nada). Di si pasó.
- Resume en una lista corta qué archivos cambiaste y por qué, para que el
  asistente sepa dónde mirar en el diff.
