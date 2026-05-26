import type { StandardSchemaV1 } from '@standard-schema/spec'
import type { EntityConfig, Operation, SchemaInput, SchemaOutput } from './entity.types'
import type { CrushKeys } from '../utils'

export namespace Entity {
  export const $meta = Symbol.for('entity:meta')

  export function kv<Schema extends StandardSchemaV1>(configuration: EntityConfig<Schema>) {
    const readOperation = createOperation<SchemaOutput<Schema>>()
    const writeOperation = createOperation<SchemaOutput<Schema>>()

    configuration.access({ read: readOperation, write: writeOperation })

    const adapter = configuration.storage.adapter

    return {
      async get(key: string): Promise<SchemaOutput<Schema>> {
        const raw = await adapter.get(key)
        const validated = await validate(configuration.model, raw)

        return validated
      },

      async set(key: string, value: SchemaInput<Schema>): Promise<void> {
        const validated = await validate(configuration.model, value)

        await adapter.set(key, validated)
      },

      async delete(key: string): Promise<void> {
        await adapter.delete(key)
      },

      [$meta]: {
        adapter,
        model: configuration.model,
        readAccess: readOperation.state,
        writeAccess: writeOperation.state,
      },
    }
  }
}

function createOperation<Model>(): Operation<Model> & { state: Record<string, boolean> } {
  const state: Record<string, boolean> = {}

  const handler = (fields: CrushKeys<Model>[]) => {
    for (const field of fields) {
      state[field] = true
    }
  }

  handler.omit = (fields: CrushKeys<Model>[]) => {
    for (const field of fields) {
      state[field] = false
    }
  }

  return Object.assign(handler, { omit: handler.omit, state })
}

async function validate<Schema extends StandardSchemaV1>(
  schema: Schema,
  value: unknown,
): Promise<SchemaOutput<Schema>> {
  const result = await schema['~standard'].validate(value)

  if ('issues' in result) {
    throw new Error(`Validation failed: ${JSON.stringify(result.issues)}`)
  }

  return result.value
}
