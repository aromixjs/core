import { MongoClient, Db, MongoClientOptions } from 'mongodb'
import { track } from '../track/def'
export interface MongoClusterOptions<Databases extends Record<string, string>> {
	name: string
	uri: string
	databases: Databases
	clientOptions?: MongoClientOptions
}


export type MongoClusterInstance<Databases extends Record<string, string>> = {
	name: string
	start(): Promise<void>
	stop(): Promise<void>
} & {
	[K in keyof Databases]: Db
}

export function MongoCluster<Databases extends Record<string, string>>(
	options: MongoClusterOptions<Databases>
): MongoClusterInstance<Databases> {

	const client = new MongoClient(options.uri, options.clientOptions)

	// Create native Db handles synchronously
	const databases = {} as { [K in keyof Databases]: Db }
	for (const key in options.databases) {
		databases[key] = client.db(options.databases[key])
	}

	return {
		name: options.name,

		async start() {
			// 1. Wrap the network connection in track.time
			await track.time({
				name: 'mongo.client.connect',
				attributes: { cluster: options.name, uri: options.uri },
				run: () => client.connect()
			})

			track.log({
				name: 'mongo.cluster.ready',
				attributes: {
					cluster: options.name,
					databases: Object.keys(options.databases)
				}
			})

			// 2. Hook into MongoDB's native APM for automatic query telemetry
			// This tracks EVERY query without wrapping the Db/Collection objects!
			client.on('commandSucceeded', (event) => {
				track.metric({
					name: 'mongo.query.duration_ms',
					value: event.duration,
					attributes: {
						cluster: options.name,
						database: event.databaseName,
						command: event.commandName // 'find', 'insert', 'update', etc.
					}
				})
			})

			client.on('commandFailed', (event) => {
				track.log({
					name: 'mongo.query.failed',
					level: 'error',
					attributes: {
						cluster: options.name,
						database: event.databaseName,
						command: event.commandName,
						error: event.failure.message
					}
				})
			})
		},

		async stop() {
			track.log({
				name: 'mongo.cluster.stopping',
				attributes: { cluster: options.name }
			})

			// Wrap the disconnect in track.time
			await track.time({
				name: 'mongo.client.disconnect',
				attributes: { cluster: options.name },
				run: () => client.close()
			})
		},
		...databases
	}
}