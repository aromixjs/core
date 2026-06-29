import { MongoClient } from "mongodb"
import { Builder } from "../server/builder"
import { MaybePromise } from "../global"
import { MongoDatabase } from "./database"


export type ClusterResult<T extends readonly string[]> = {
	builder: Builder
	client: MongoClient
} & {
	[K in T[number]]: MongoDatabase
}


export interface MongoClusterInput<Databases extends readonly string[]> {

	name: string
	uri: string
	databases: Databases
	onConnect?(client: MongoClient): MaybePromise<void>
	onDisconnect?(client: MongoClient): MaybePromise<void>
	onError?(err: unknown): MaybePromise<void>
}

export function MongoCluster<const Databases extends readonly string[]>(options: MongoClusterInput<Databases>) {

	const client = new MongoClient(options.uri)
	const databases: Record<string, MongoDatabase> = {}


	for (const name of options.databases) {
		databases[name] = new MongoDatabase()
	}


	const builder = Builder({
		name: options.name,

		start: async () => {
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

		stop: async () => {
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
