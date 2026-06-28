import { ax } from '@aromix/validator'
import { MongoCluster, MongoDatabase, MongoEntity } from './../src'
import { MongoClient } from 'mongodb'

export const users = MongoEntity({
	name: 'users',
	model: ax.object({}),
	guards: [],
	effects: [],
})

export const rootDb = MongoDatabase({
	name: 'root',
	entities: [users],
	guards: [],
	effects: [],
})

export const cluster1 = MongoCluster({
	name: 'cluster1',
	client() {
		return new MongoClient('')
	},
	databases: [rootDb],

	onConnect(client) {},

	onDisconnect(client) {},
	onError() {},
	guards: [],
	effects: [],
})
