import { MongoClient } from 'mongodb'
import { Builder } from '../server/builder'
import { MongoDatabase } from './database'
import { MaybePromise } from '../global'
import { AnySchema } from '@aromix/validator'

export type ClusterResult<T extends readonly string[]> = {
	builder: Builder
	client: MongoClient
} & {
	[K in T[number]]: MongoDatabase
}

export interface MongoClusterInput<Databases extends readonly string[]> {
	name: string
	uri: string
	databases: Databases
	onConnect?(client: MongoClient): MaybePromise<void>
	onDisconnect?(client: MongoClient): MaybePromise<void>
	onError?(err: unknown): MaybePromise<void>
}

export interface MongoEntityInput<Schema extends AnySchema> {
	name: string
	model: Schema
}
