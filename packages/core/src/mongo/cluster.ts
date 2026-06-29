import { MongoClient } from 'mongodb'
import { Builder } from '../server/builder'
import { MongoDatabase } from './database'
import { ClusterResult, MongoClusterInput } from './types'

export function MongoCluster<const Databases extends readonly string[]>(options: MongoClusterInput<Databases>) {
	const client = new MongoClient(options.uri)
	const databases: Record<string, MongoDatabase> = {}

	for (const name of options.databases) {
		databases[name] = new MongoDatabase()
	}

	const builder = Builder({
		name: options.name,

		async onListen() {
			try {
				await client.connect()

				for (const name of options.databases) {
					const db = client.db(name)
					databases[name].attach(db)
				}

				await options.onConnect?.(client)
			} catch (err) {
				await options.onError?.(err)
				throw err
			}
		},

		async onShutdown() {
			await options.onDisconnect?.(client)
			await client.close()
		},
	})

	return {
		client,
		builder,
		...databases,
	} as ClusterResult<Databases>
}
