import type { AnySchema } from '@aromix/validator'
import type { Db } from 'mongodb'
import type {
	RedisClientPoolType,
	RedisClientType,
	RedisClusterType,
	RedisSentinelType,
} from 'redis'
import { MongoEntity, type MongoEntityUserInput } from './platforms/mongo'
import { RedisEntity, type KvEntityUserInput } from './platforms/redis'

export namespace Builder {
	/* ====  Redis Builder Start ====*/
	export type RedisAdapter =
		| RedisClientType
		| RedisClusterType
		| RedisClientPoolType
		| RedisSentinelType

	export interface RedisInput {
		adapter(): RedisAdapter
	}

	export function redis(builderInput: RedisInput) {
		const adapter = builderInput.adapter()

		const result = {
			entity<Schema extends AnySchema>(entityInput: KvEntityUserInput<Schema>) {
				return new RedisEntity(entityInput, adapter)
			},
		}

		return result
	}


	/* ====  Mongo Builder Start ====*/
	export interface MongoInput {
		adapter(): Db
	}

	export function mongo(builderInput: MongoInput) {
		const db = builderInput.adapter()
		const result = {
			entity<Schema extends AnySchema>(entityInput: MongoEntityUserInput<Schema>) {
				return new MongoEntity(entityInput, db)
			},
		}

		return result
	}
}
