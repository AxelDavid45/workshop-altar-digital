#!/usr/bin/env node
// El punto de entrada de CDK. `npx cdk synth` y `npx cdk deploy` empiezan aqui.
//
// No hay casi nada que revisar en este archivo a proposito: todo lo
// interesante (la tabla, el bucket, las Lambdas, la API) vive en
// infra/ofrenda-stack.ts. Aqui solo se crea la app y se monta el stack.

import * as cdk from 'aws-cdk-lib'
import { OfrendaStack } from '../infra/ofrenda-stack'

const app = new cdk.App()

// Un solo stack, con nombre fijo, para que `cdk deploy` y `cdk destroy`
// siempre sepan de cual hablamos sin pasarle el nombre.
new OfrendaStack(app, 'ofrenda')
