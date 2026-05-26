import { StandardSchemaV1 } from '@standard-schema/spec'
import { Operation, SchemaOutput } from './entity.type'
import { Type } from '../global/type'

export function createOperation<Model>(): Operation<Model> & { state: Record<string, boolean> } {
      const state: Record<string, boolean> = {}

      const handler = (fields: Type.CrushKeys<Model>[]) => {
            for (const field of fields) {
                  state[field] = true
            }
      }

      handler.omit = (fields: Type.CrushKeys<Model>[]) => {
            for (const field of fields) {
                  state[field] = false
            }
      }

      return Object.assign(handler, { omit: handler.omit, state })
}

export async function validate<Schema extends StandardSchemaV1>(schema: Schema, value: unknown): Promise<SchemaOutput<Schema>> {
      const result = await schema['~standard'].validate(value)

      if ('issues' in result) {
            throw new Error(`Validation failed: ${JSON.stringify(result.issues)}`)
      }

      return result.value
}
