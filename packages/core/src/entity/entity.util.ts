import { StandardSchemaV1 } from '@standard-schema/spec'
import { SchemaOutput } from './entity.type'



export async function validate<Schema extends StandardSchemaV1>(schema: Schema, value: unknown): Promise<SchemaOutput<Schema>> {
      const result = await schema['~standard'].validate(value)

      if ('issues' in result) {
            throw new Error(`Validation failed: ${JSON.stringify(result.issues)}`)
      }

      return result.value
}
