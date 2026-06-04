import type { AnySchema } from '@aromix/validator'
import { Adapter } from '../adapter'
import { Kit } from '../global/kit'

export interface KvEntityInput<Schema extends AnySchema> {
      name: string
      storage: Adapter.KV
      guards?: any[]
      effects?: any[]
      model: Schema
}

export interface KvEntityOutput<Schema extends AnySchema> {
      get(key: string): Promise<Schema['$infer']>
      set(key: string, value: Schema['$infer']): Promise<void>
      delete(key: string): Promise<void>
      has(key: string): Promise<boolean>
      [Kit.$meta]: {
            name: string
            adapter: Adapter.KV
            model: Schema
      }
}

export function kv<Schema extends AnySchema>(configuration: KvEntityInput<Schema>): KvEntityOutput<Schema> {
      const adapter = configuration.storage

      return {
            async get(key: string): Promise<Schema['$infer']> {
                  const formattedKey = `${configuration.name}:${key}`
                  const raw = await adapter.get(formattedKey)
                  return configuration.model.parse(raw)
            },

            async set(key: string, value: Schema['$infer']): Promise<void> {
                  const formattedKey = `${configuration.name}:${key}`
                  const validated = configuration.model.parse(value)
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
