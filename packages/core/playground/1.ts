import { ax } from '@aromix/validator'
import { bootstrap, MongoCluster, MongoEntity } from './../src'

export const users = MongoEntity({
	name: 'users',
	model: ax.object({}),
	guards: [],
	effects: [],
})

const db = MongoCluster({
  name: "mongo",
  uri: "mongodb://localhost:27017",
  databases: ["root", "auth"],
})



db.root.entity()
db.auth.entity()

const server = bootstrap()

server.register({
	name: '',
	preprocess(ctx) {},
})
