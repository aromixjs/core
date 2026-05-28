import type { StandardSchemaV1 } from '@standard-schema/spec'
import type { EntityKV, EntityKvConfig, EntitySQLite, EntitySQLiteConfig, SchemaInput, SchemaOutput } from './entity.type'
import { validate } from './entity.util'
import { config } from 'process'

export namespace Entity {
      export const $meta = Symbol.for('entity:meta')

      export function kv<Schema extends StandardSchemaV1>(configuration: EntityKvConfig<Schema>): EntityKV<Schema> {


            const adapter = configuration.storage

            return {
                  async get(key: string): Promise<SchemaOutput<Schema>> {
                        const formattedKey = `${configuration.name}:${key}`
                        const raw = await adapter.get(formattedKey)
                        const validated = await validate(configuration.model, raw)
                        return validated
                  },

                  async set(key: string, value: SchemaInput<Schema>): Promise<void> {
                        const formattedKey = `${configuration.name}:${key}`
                        const validated = await validate(configuration.model, value)
                        await adapter.set(formattedKey, validated)
                  },

                  async delete(key: string): Promise<void> {
                        const formattedKey = `${configuration.name}:${key}`
                        await adapter.delete(formattedKey)
                  },
                  async has(key: string) {
                        const formattedKey = `${configuration.name}:${key}`
                        return await adapter.has(formattedKey)
                  },

                  [$meta]: {
                        adapter,
                        model: configuration.model,
                        name: configuration.name
                  },
            }
      }



      export function sqlite(configuration: EntitySQLiteConfig): EntitySQLite {

            return {
                  [Entity.$meta]: {
                        name: configuration.name,
                        model: configuration.model,
                        adapter: configuration.storage
                  }
            }
      }

}
