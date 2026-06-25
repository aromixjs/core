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

	async get(key: string): Promise<Schema['$select']> {
		const formattedKey = `${this.state.name}:${key}`
		const raw = await this.adapter.get(formattedKey)
		return raw
	}

	async set(key: string, value: Schema['$insert']): Promise<void> {
		const formattedKey = `${this.state.name}:${key}`
		await this.adapter.set(formattedKey, value)
	}

	async delete(key: string): Promise<void> {
		const formattedKey = `${this.state.name}:${key}`
		await this.adapter.delete(formattedKey)
	}

	async has(key: string): Promise<boolean> {
		const formattedKey = `${this.state.name}:${key}`
		return this.adapter.has(formattedKey)
	}
}
