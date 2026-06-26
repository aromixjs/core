import { EntityBuilder, compose } from './../src'
import { ax } from '@aromix/validator'
import { MongoClient, ObjectId } from 'mongodb'
const primaryDb = EntityBuilder.mongo({
	adapter() {
		const connection = new MongoClient('mongodb://aromix:password123@localhost:27017/')
		return connection.db('root')
	},
	transport: 'http',
})

const users = primaryDb.entity({
	name: 'users',
	model: ax.object({
		_id: ax.string().locked(),
		name: ax.string().pipe((v) => v.trim()),
	}),
})

const des =compose({
	entities: [users],
})
console.log(des.descriptor);
console.log(des.descriptor.entities[0].methods);


console.log('compose')
