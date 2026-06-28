import type { MongoClient } from 'mongodb'
import type { MaybePromise } from '../global'

export interface MongoInput {
	name: string
	db: string[]
	client(): MongoClient
	onConnect?(client: MongoClient): MaybePromise<void>
	onDisconnect?(client: MongoClient): MaybePromise<void>
	onError?(err: unknown): void
}

export class Mongo {
	constructor(input: MongoInput) { }
}



