import { Db } from 'mongodb'
import { MongoEntityInput } from './types'
import { AnySchema } from '@aromix/validator'

export class MongoDatabase {
	public db!: Db

	constructor() {}

	/** internal attach */
	attach(db: Db) {
		this.db = db
	}

	entity<Schema extends AnySchema>(input: MongoEntityInput<Schema>) {}
}
