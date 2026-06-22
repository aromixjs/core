import type { AnySchema } from '@aromix/validator'
import type { EntityBuilder } from '../builder'
export interface KvEntityUserInput<Schema extends AnySchema> {
   name: string
   model: Schema
}

export class KvEntity<Schema extends AnySchema> {
   readonly state: KvEntityUserInput<Schema>
   private adapter: EntityBuilder.KvAdapter
   constructor(userProvided: KvEntityUserInput<Schema>, internal: EntityBuilder.KvAdapter) {
      this.state = userProvided
      this.adapter = internal
   }

   async get(key: string): Promise<Schema['$infer']> {
      const formattedKey = `${this.state.name}:${key}`
      const raw = await this.adapter.get(formattedKey)
      return this.state.model.parse(raw)
   }

   async set(key: string, value: Schema['$infer']) {
      const formattedKey = `${this.state.name}:${key}`
      const validated = this.state.model.parse(value)
      await this.adapter.set(formattedKey, validated)
   }

   async delete(key: string) {
      const formattedKey = `${this.state.name}:${key}`
      await this.adapter.delete(formattedKey)
   }

   async has(key: string) {
      const formattedKey = `${this.state.name}:${key}`
      return await this.adapter.has(formattedKey)
   }
}
