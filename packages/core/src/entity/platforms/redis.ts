import type { AnySchema } from '@aromix/validator'
import type { Builder } from '../builder'

export interface KvEntityUserInput<Schema extends AnySchema> {
	name: string
	model: Schema
}

export class RedisEntity<Schema extends AnySchema> {
	readonly state: KvEntityUserInput<Schema>
	private adapter: Builder.RedisAdapter

	constructor(userProvided: KvEntityUserInput<Schema>, internal: Builder.RedisAdapter) {
		this.state = userProvided
		this.adapter = internal
	}

	async get(key: string): Promise<Schema['$select']> {
		const formattedKey = `${this.state.name}:${key}`
		const raw = await this.adapter.get(formattedKey)
		return raw as Schema['$select']
	}

	async set(key: string, value: Schema['$insert']): Promise<void> {
		const formattedKey = `${this.state.name}:${key}`
		await this.adapter.set(formattedKey, value as any)
	}

	async delete(key: string): Promise<void> {
		const formattedKey = `${this.state.name}:${key}`
		await this.adapter.del(formattedKey)
	}

	async has(key: string): Promise<boolean> {
		const formattedKey = `${this.state.name}:${key}`
		const result = await this.adapter.exists(formattedKey)
		return result > 0
	}
}
