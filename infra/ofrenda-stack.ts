// El stack del altar.
//
// Ahora mismo está casi vacío a propósito: el backend lo escribes TÚ con el
// agente en el módulo 3. La tarea 1 de la spec (.kiro/specs/ofrenda/tasks.md)
// te dice qué construir aquí, y design.md cómo:
//
//   - una tabla de DynamoDB (partition key altarId, sort key sk)
//   - un bucket privado de S3 para las imágenes
//   - tres Lambdas en JavaScript plano (lambda/)
//   - una REST API con GET/POST /elements, POST /uploads y GET /uploads/{proxy+}
//
// Pídele al agente la tarea 1 y revisa el diff antes de desplegar.

import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'

export class OfrendaStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    // Aquí va el backend. Mira .kiro/specs/ofrenda/tasks.md, tarea 1.
  }
}
