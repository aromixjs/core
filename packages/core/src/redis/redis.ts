import type { RedisClientPoolType, RedisClientType, RedisClusterType, RedisSentinelType } from 'redis'
import type { MaybePromise } from '../global'

export type RedisAdapter = RedisClientType | RedisClusterType | RedisClientPoolType | RedisSentinelType

export interface RedisInput {
	name: string
	client(): RedisAdapter
	onConnect?(client: RedisAdapter): MaybePromise<void>
	onDisconnect?(client: RedisAdapter): MaybePromise<void>
	onError?(err: unknown): void
}

export class Redis {
	constructor(input: RedisInput) {}
}
