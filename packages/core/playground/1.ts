import { ax } from '@aromix/validator'
import { bootstrap, MongoCluster } from './../src'

const { builder, root, auth } = MongoCluster({
	name: 'mongo',
	uri: 'mongodb://localhost:27017',
	databases: ['root', 'auth'],
})

root.entity({
	name: '',
	model: ax.object({}),
})
auth.entity({
	name: '',
	model: ax.object({}),
})

auth.entity({
	name: '',
	model: ax.object({}),
})

const server = bootstrap()

server.register(builder)
