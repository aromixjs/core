import { Db, MongoClient, MongoClientOptions } from 'mongodb'
import { Unit } from '../system/types'

export interface MongoClusterOptions<Databases extends Record<string, string>> {
	name: string
	uri: string
	databases: Databases
	clientOptions?: MongoClientOptions
}

export type MongoClusterInstance<Databases extends Record<string, string>> = Unit & { [Key in keyof Databases]: Db }


export function MongoCluster<Databases extends Record<string, string>>(options: MongoClusterOptions<Databases>): MongoClusterInstance<Databases> {


	const client = new MongoClient(options.uri)
	const databases = {} as { [Key in keyof Databases]: Db }

	for (const key in options.databases) {
		databases[key] = client.db(options.databases[key])
	}



	return {
		name: options.name,
		async start() {
			try {
				await client.connect()
				await client.db('admin').command({ ping: 1 })
			} catch (err) {
				await client.close().catch(() => { })
				const reason = err instanceof Error ? err.message : String(err)
				throw new Error(`[${options.name}] start failed: ${reason}`, { cause: err })
			}
		},
		async stop() {
			try {
				await client.close()
			} catch (err) {
				const reason = err instanceof Error ? err.message : String(err)
				throw new Error(`[${options.name}] stop failed: ${reason}`, { cause: err })
			}
		},
		...databases,
	}
}
