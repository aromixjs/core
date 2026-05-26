import type { StandardSchemaV1 } from '@standard-schema/spec'
import type { EntityConfig, SchemaInput, SchemaOutput } from './entity.type'
import { createOperation, validate } from './entity.util'

export namespace Entity {
      export const $meta = Symbol.for('entity:meta')

      export function kv<Schema extends StandardSchemaV1>(configuration: EntityConfig<Schema>) {
            const readOperation = createOperation<SchemaOutput<Schema>>()
            const writeOperation = createOperation<SchemaOutput<Schema>>()

            configuration.access({ read: readOperation, write: writeOperation })

            const adapter = configuration.storage

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
