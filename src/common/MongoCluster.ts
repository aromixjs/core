import { Db, MongoClient, MongoClientOptions } from 'mongodb'
import { Unit } from '../system/types'

export interface MongoClusterOptions<Databases extends Record<string, string>> {
	name?: string
	uri: string
	databases: Databases
	clientOptions?: MongoClientOptions
}

export type MongoClusterInstance<Databases extends Record<string, string>> = Unit & { [Key in keyof Databases]: Db }

export function MongoCluster<Databases extends Record<string, string>>(options: MongoClusterOptions<Databases>): MongoClusterInstance<Databases> {
	const label = options.name ?? 'Mongo Cluster'
	const client = new MongoClient(options.uri)

	let connected = false
	const databases = {} as { [Key in keyof Databases]: Db }

	for (const key in options.databases) {
		databases[key] = client.db(options.databases[key])
	}

	return {
		name: label,
		async start() {
			const dbNames = Object.entries(options.databases)
				.map(([alias, dbName]) => `${alias}=${dbName}`)
				.join(', ')

			console.log(`[${label}] connecting… (${dbNames})`)

			try {
				await client.connect()
				await client.db('admin').command({ ping: 1 })
				connected = true
				console.log(`[${label}] connected`)
			} catch (err) {
				const reason = err instanceof Error ? err.message : String(err)
				console.error(`[${label}] failed to connect: ${reason}`)
				await client.close().catch(() => {})
				throw new Error(`[${label}] start failed: ${reason}`, { cause: err })
			}
			await client.connect()
		},
		async stop() {
			if (!connected) {
				console.log(`[${label}] stop called but never connected, skipping`)
				return
			}
			console.log(`[${label}] closing…`)

			try {
				await client.close()
				connected = false
				console.log(`[${label}] closed`)
			} catch (err) {
				const reason = err instanceof Error ? err.message : String(err)
				console.error(`[${label}] error while closing: ${reason}`)
				throw new Error(`[${label}] stop failed: ${reason}`, { cause: err })
			}
		},
		...databases,
	}
}
