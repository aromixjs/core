export interface MongoCollectionAdapter {
   insertOne(doc: unknown): Promise<{ insertedId: unknown }>
   insertMany(docs: unknown[]): Promise<{ insertedIds: unknown[] }>
   findOne(filter: unknown): Promise<unknown | null>
   find(filter: unknown): Promise<unknown[]>
   updateOne(filter: unknown, update: unknown): Promise<{ matchedCount: number; modifiedCount: number }>
   updateMany(filter: unknown, update: unknown): Promise<{ matchedCount: number; modifiedCount: number }>
   deleteOne(filter: unknown): Promise<{ deletedCount: number }>
   deleteMany(filter: unknown): Promise<{ deletedCount: number }>
   countDocuments(filter?: unknown): Promise<number>
}

export interface MongoAdapter {
   collection(name: string): MongoCollectionAdapter
}


export function MongoAdapter(adapter: MongoAdapter) {
   return adapter
}
