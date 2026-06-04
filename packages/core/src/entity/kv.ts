import { Adapter } from '../adapter'
import { Kit } from '../global/kit'
import { Type } from '../global/type'

export interface KvEntityInput<Schema extends StandardSchemaV1> {
      name: string
      storage: Adapter.KV
      guards?: any[]
      effects?: any[]
      model: Schema
}

export interface KvEntityOutput<Schema extends StandardSchemaV1> {
      get(key: string): Promise<Type.SchemaOutput<Schema>>
      set(key: string, value: Type.SchemaInput<Schema>): Promise<void>
      delete(key: string): Promise<void>
      has(key: string): Promise<boolean>
      [Kit.$meta]: {
            name: string
            adapter: Adapter.KV
            model: Schema
      }
}

export function kv<Schema extends StandardSchemaV1>(configuration: KvEntityInput<Schema>): KvEntityOutput<Schema> {
      const adapter = configuration.storage

      return {
            async get(key: string): Promise<Type.SchemaOutput<Schema>> {
                  const formattedKey = `${configuration.name}:${key}`
                  const raw = await adapter.get(formattedKey)
                  const validated = await Kit.validate(configuration.model, raw)
                  return validated
            },

            async set(key: string, value: Type.SchemaInput<Schema>): Promise<void> {
                  const formattedKey = `${configuration.name}:${key}`
                  const validated = await Kit.validate(configuration.model, value)
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

            [Kit.$meta]: {
                  adapter,
                  model: configuration.model,
                  name: configuration.name,
            },
      }
}
