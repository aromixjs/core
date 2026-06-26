import type { AnySchema } from '@aromix/validator'
import {
	Db,
	Filter,
	UpdateFilter,
	FindOptions,
	UpdateOptions,
	DeleteOptions,
	CountDocumentsOptions,
	InsertOneOptions,
	BulkWriteOptions,
	ReplaceOptions,
	FindOneAndUpdateOptions,
	FindOneAndDeleteOptions,
	FindOneAndReplaceOptions,
	DistinctOptions,
	AggregateOptions,
	CreateIndexesOptions,
	DropIndexesOptions,
	InsertOneResult,
	InsertManyResult,
	UpdateResult,
	DeleteResult,
	BulkWriteResult,
	AggregationCursor,
} from 'mongodb'

export interface MongoEntityUserInput<Schema extends AnySchema> {
	name: string
	model: Schema
}

export class MongoEntity<Schema extends AnySchema> {
	readonly states: MongoEntityUserInput<Schema>
	private readonly collection: any

	constructor(userInput: MongoEntityUserInput<Schema>, db: Db) {
		this.states = userInput
		this.collection = db.collection(userInput.name)
	}

	async insertOne(doc: Schema['$insert'], options?: InsertOneOptions): Promise<InsertOneResult> {
		return this.collection.insertOne(doc, options)
	}

	async insertMany(docs: Schema['$insert'][], options?: BulkWriteOptions): Promise<InsertManyResult> {
		return this.collection.insertMany(docs, options)
	}

	async findOne(filter: Filter<Schema['$select']>, options?: FindOptions): Promise<Schema['$select'] | null> {
		return this.collection.findOne(filter, options)
	}

	async find(filter: Filter<Schema['$select']>, options?: FindOptions): Promise<Schema['$select'][]> {
		return this.collection.find(filter, options).toArray()
	}

	async updateOne(filter: Filter<Schema['$select']>, update: UpdateFilter<Schema['$update']>, options?: UpdateOptions): Promise<UpdateResult> {
		return this.collection.updateOne(filter, update, options)
	}

	async updateMany(filter: Filter<Schema['$select']>, update: UpdateFilter<Schema['$update']>, options?: UpdateOptions): Promise<UpdateResult> {
		return this.collection.updateMany(filter, update, options)
	}

	async replaceOne(filter: Filter<Schema['$select']>, replacement: Schema['$select'], options?: ReplaceOptions): Promise<UpdateResult> {
		return this.collection.replaceOne(filter, replacement, options)
	}

	async deleteOne(filter: Filter<Schema['$select']>, options?: DeleteOptions): Promise<DeleteResult> {
		return this.collection.deleteOne(filter, options)
	}

	async deleteMany(filter: Filter<Schema['$select']>, options?: DeleteOptions): Promise<DeleteResult> {
		return this.collection.deleteMany(filter, options)
	}

	async findOneAndUpdate(filter: Filter<Schema['$select']>, update: UpdateFilter<Schema['$update']>, options?: FindOneAndUpdateOptions): Promise<Schema['$select'] | null> {
		return this.collection.findOneAndUpdate(filter, update, options)
	}

	async findOneAndDelete(filter: Filter<Schema['$select']>, options?: FindOneAndDeleteOptions): Promise<Schema['$select'] | null> {
		return this.collection.findOneAndDelete(filter, options)
	}

	async findOneAndReplace(filter: Filter<Schema['$select']>, replacement: Schema['$select'], options?: FindOneAndReplaceOptions): Promise<Schema['$select'] | null> {
		return this.collection.findOneAndReplace(filter, replacement, options)
	}

	async countDocuments(filter: Filter<Schema['$select']>, options?: CountDocumentsOptions): Promise<number> {
		return this.collection.countDocuments(filter, options)
	}

	async estimatedDocumentCount(): Promise<number> {
		return this.collection.estimatedDocumentCount()
	}

	async distinct<Field extends keyof Schema['$select'] & string>(field: Field, filter: Filter<Schema['$select']>, options?: DistinctOptions): Promise<Array<Schema['$select'][Field]>> {
		return this.collection.distinct(field, filter, options)
	}

	aggregate(pipeline: any[], options?: AggregateOptions): AggregationCursor {
		return this.collection.aggregate(pipeline, options)
	}

	async bulkWrite(operations: any[], options?: BulkWriteOptions): Promise<BulkWriteResult> {
		return this.collection.bulkWrite(operations, options)
	}

	async createIndex(indexSpec: any, options?: CreateIndexesOptions): Promise<string> {
		return this.collection.createIndex(indexSpec, options)
	}

	async dropIndex(indexName: string, options?: DropIndexesOptions): Promise<void> {
		return this.collection.dropIndex(indexName, options)
	}
}
