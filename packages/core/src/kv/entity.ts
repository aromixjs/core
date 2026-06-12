import type { AnySchema } from '@aromix/validator'
import { KvAdapter } from './adapter'


export interface KvEntityInput<Schema extends AnySchema> {
    name: string
    adapter: KvAdapter
    model: Schema
}

export interface KvEntityOutput<Schema extends AnySchema> {
    get(key: string): Promise<Schema['$infer']>
    set(key: string, value: Schema['$infer']): Promise<void>
    delete(key: string): Promise<void>
    has(key: string): Promise<boolean>
    state: {
        name: string
        adapter: KvAdapter
        model: Schema
    }
}

export function entity<Schema extends AnySchema>(input: KvEntityInput<Schema>): KvEntityOutput<Schema> {
    const adapter = input.adapter

    return {
        async get(key) {
            const formattedKey = `${input.name}:${key}`
            const raw = await adapter.get(formattedKey)
            return input.model.parse(raw)
        },
        async set(key, value) {
            const formattedKey = `${input.name}:${key}`
            const validated = input.model.parse(value)
            await adapter.set(formattedKey, validated)
        },
        async delete(key) {
            const formattedKey = `${input.name}:${key}`
            await adapter.delete(formattedKey)
        },
        async has(key) {
            const formattedKey = `${input.name}:${key}`
            return await adapter.has(formattedKey)
        },
        state: {
            adapter,
            model: input.model,
            name: input.name,
        },
    }
}
