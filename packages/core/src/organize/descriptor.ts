import { AnySchema } from '@aromix/validator'
import { KvEntity } from '../entity/platforms/kv'
import { MongoEntity } from '../entity/platforms/mongo'

type Slot = 'insert' | 'update' | 'select'

export class Descriptor {
	private isExcluded(schema: AnySchema, slot: Slot): boolean {
		const accessors = schema.state.accessors ?? {}
		if (slot === 'select') return !!accessors.hidden
		if (slot === 'insert') return accessors.readonlyValue !== undefined || !!accessors.readonlyFn
		return accessors.readonlyValue !== undefined || !!accessors.readonlyFn || !!accessors.locked
	}
	private parseSchema(schema: AnySchema, slot: Slot): any {
		const state = schema.state

		if (state.type === 'object') {
			const shape = state.typeMeta.objectShape ?? {}
			const fields: Record<string, any> = {}
			for (const key in shape) {
				if (this.isExcluded(shape[key], slot)) continue
				fields[key] = this.parseSchema(shape[key], slot)
			}
			return { type: 'object', shape: fields }
		}
		if (state.type === 'array') {
			return { type: 'array', element: this.parseSchema(state.typeMeta.arrayElement!, slot) }
		}
		if (state.type === 'tuple') {
			return { type: 'tuple', items: (state.typeMeta.tupleItems ?? []).map((s) => this.parseSchema(s, slot)) }
		}
		if (state.type === 'union') {
			return { type: 'union', items: (state.typeMeta.unionItems ?? []).map((s) => this.parseSchema(s, slot)) }
		}
		if (state.type === 'record') {
			return { type: 'record', element: this.parseSchema(state.typeMeta.recordElement!, slot) }
		}
		if (state.type === 'literals') {
			return { type: 'literals', values: state.typeMeta.literalValues }
		}
		return { type: state.type }
	}

	kv(entity: KvEntity<AnySchema>) {
		const name = entity.state.name
		const model = entity.state.model

		return {
			name,
			platform: 'kv',
			methods: [
				{ name: 'get', route: `${name}.kv.get`, input: { type: 'string' }, output: this.parseSchema(model, 'select') },
				{ name: 'set', route: `${name}.kv.set`, input: { type: 'object', shape: { key: { type: 'string' }, value: this.parseSchema(model, 'insert') } }, output: { type: 'null' } },
				{ name: 'delete', route: `${name}.kv.delete`, input: { type: 'string' }, output: { type: 'null' } },
				{ name: 'has', route: `${name}.kv.has`, input: { type: 'string' }, output: { type: 'boolean' } },
			],
		}
	}

	private buildMongoMethod(model: AnySchema, methodName: string) {
		if (methodName === 'insertOne') {
			return { input: this.parseSchema(model, 'insert'), output: { type: 'object', shape: { acknowledged: { type: 'boolean' }, insertedId: { type: 'unknown' } } } }
		}
		if (methodName === 'insertMany') {
			return {
				input: { type: 'array', element: this.parseSchema(model, 'insert') },
				output: { type: 'object', shape: { acknowledged: { type: 'boolean' }, insertedCount: { type: 'number' }, insertedIds: { type: 'unknown' } } },
			}
		}
		if (methodName === 'findOne') {
			return { input: this.parseSchema(model, 'select'), output: { type: 'union', items: [this.parseSchema(model, 'select'), { type: 'null' }] } }
		}
		if (methodName === 'find') {
			return { input: this.parseSchema(model, 'select'), output: { type: 'array', element: this.parseSchema(model, 'select') } }
		}
		if (methodName === 'updateOne' || methodName === 'updateMany') {
			return {
				input: { type: 'object', shape: { filter: this.parseSchema(model, 'select'), update: this.parseSchema(model, 'update') } },
				output: {
					type: 'object',
					shape: {
						acknowledged: { type: 'boolean' },
						matchedCount: { type: 'number' },
						modifiedCount: { type: 'number' },
						upsertedCount: { type: 'number' },
						upsertedId: { type: 'unknown' },
					},
				},
			}
		}
		if (methodName === 'replaceOne' || methodName === 'findOneAndReplace') {
			const updateResultShape = {
				type: 'object',
				shape: { acknowledged: { type: 'boolean' }, matchedCount: { type: 'number' }, modifiedCount: { type: 'number' }, upsertedCount: { type: 'number' }, upsertedId: { type: 'unknown' } },
			}
			return {
				input: { type: 'object', shape: { filter: this.parseSchema(model, 'select'), replacement: this.parseSchema(model, 'select') } },
				output: methodName === 'replaceOne' ? updateResultShape : { type: 'union', items: [this.parseSchema(model, 'select'), { type: 'null' }] },
			}
		}
		if (methodName === 'deleteOne' || methodName === 'deleteMany') {
			return { input: this.parseSchema(model, 'select'), output: { type: 'object', shape: { acknowledged: { type: 'boolean' }, deletedCount: { type: 'number' } } } }
		}
		if (methodName === 'findOneAndUpdate') {
			return {
				input: { type: 'object', shape: { filter: this.parseSchema(model, 'select'), update: this.parseSchema(model, 'update') } },
				output: { type: 'union', items: [this.parseSchema(model, 'select'), { type: 'null' }] },
			}
		}
		if (methodName === 'findOneAndDelete') {
			return { input: this.parseSchema(model, 'select'), output: { type: 'union', items: [this.parseSchema(model, 'select'), { type: 'null' }] } }
		}
		if (methodName === 'countDocuments') {
			return { input: this.parseSchema(model, 'select'), output: { type: 'number' } }
		}
		if (methodName === 'estimatedDocumentCount') {
			return { input: { type: 'null' }, output: { type: 'number' } }
		}
		if (methodName === 'distinct') {
			return { input: { type: 'object', shape: { field: { type: 'string' }, filter: this.parseSchema(model, 'select') } }, output: { type: 'unknown' } }
		}
		if (methodName === 'createIndex') {
			return { input: { type: 'unknown' }, output: { type: 'string' } }
		}
		if (methodName === 'dropIndex') {
			return { input: { type: 'string' }, output: { type: 'null' } }
		}
		// aggregate, bulkWrite — untyped against the schema in the real class itself
		return { input: { type: 'unknown' }, output: { type: 'unknown' } }
	}

	mongo(entity: MongoEntity<AnySchema>) {
		const name = entity.states.name
		const model = entity.states.model
		const proto = Object.getPrototypeOf(entity)
		const methods = []

		for (const key of Object.getOwnPropertyNames(proto)) {
			if (key === 'constructor') continue
			const shape = this.buildMongoMethod(model, key)
			methods.push({ name: key, route: `${name}.mongo.${key}`, input: shape.input, output: shape.output })
		}

		return { name, platform: 'mongo', methods }
	}
}
