import { MongoClient } from 'mongodb'
import { MaybePromise } from '../global'
import { MongoDatabaseDef } from './database'
import { GuardDef } from '../layer/guard'
import { EffectDef } from '../layer/effect'

export interface MongoClusterInput {
	name: string
	client(): MongoClient
	databases: MongoDatabaseDef[]
	onConnect(client: MongoClient): MaybePromise<void>
	onDisconnect(client: MongoClient): MaybePromise<void>
	onError(err: unknown): MaybePromise<void>
	guards: GuardDef[]
	effects: EffectDef[]
}

export function MongoCluster(input: MongoClusterInput) { }
