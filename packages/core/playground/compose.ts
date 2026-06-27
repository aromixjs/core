import { Builder, compose } from './../src'
import { ax } from '@aromix/validator'
import { MongoClient, ObjectId } from 'mongodb'
import { createClient, createClientPool, createCluster, createSentinel } from 'redis'
const primaryDb = Builder.mongo({
	adapter() {
		const connection = new MongoClient('mongodb://aromix:password123@localhost:27017/')
		return connection.db('root')
	},
})

const users = primaryDb.entity({
	name: 'users',
	model: ax.object({
		_id: ax.string().locked(),
		name: ax.string().pipe((v) => v.trim()),
	}),
})


const user = await users.findOne({
	_id: 'id'
})




const caching = Builder.redis({


	adapter() {

		const client = createCluster({
			rootNodes: []
		})

		return client
	}

})


const test= caching.entity({
	name: 'test',
	model: ax.object({

		name: ax.string()

	})

})


test.get('id')