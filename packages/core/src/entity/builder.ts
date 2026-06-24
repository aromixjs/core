import type { AnySchema } from '@aromix/validator'
import type { Db } from 'mongodb'
import { KvEntity, type KvEntityUserInput } from './platforms/kv'
import { MongoEntity, MongoEntityUserInput } from './platforms/mongo'

export namespace EntityBuilder {
	/* ====  Kv Builder Start ====*/
	export interface KvAdapter {
		get(key: string): Promise<unknown>
		set(key: string, value: unknown): Promise<void>
		delete(key: string): Promise<void>
		has(key: string): Promise<boolean>
	}

	export interface KvInput {
		transport: 'http'
		adapter(): KvAdapter
	}

	export function kv(builderInput: KvInput) {
		const adapter = builderInput.adapter()

		const result = {
			entity<Schema extends AnySchema>(entityInput: KvEntityUserInput<Schema>) {
				return new KvEntity(entityInput, adapter)
			},
		}

		return result
	}
	/* ====  Mongo Builder Start ====*/
	export interface MongoInput {
		adapter(): Db
		transport: 'http'
	}

	export function mongo(builderInput: MongoInput) {
		const db = builderInput.adapter()
		const result = {
			entity<Schema extends AnySchema<object>>(entityInput: MongoEntityUserInput<Schema>) {
				return new MongoEntity(entityInput, db)
			},
		}

		return result
	}
}
