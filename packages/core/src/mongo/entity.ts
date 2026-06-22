import { AnySchema } from "@aromix/validator"
import { MongoAdapter } from "./adapter"

export interface MongoEntityInput<Schema extends AnySchema> {
   name: string
   adapter: MongoAdapter
   model: Schema
}



export interface MongoEntityOutput<Schema extends AnySchema> {
   insertOne(doc: Schema['$infer']): Promise<{ insertedId: unknown }>
   insertMany(docs: Schema['$infer'][]): Promise<{ insertedIds: unknown[] }>
   findOne(filter: Record<string, unknown>): Promise<Schema['$infer'] | null>
   find(filter: Record<string, unknown>): Promise<Schema['$infer'][]>
   updateOne(filter: Record<string, unknown>, update: Record<string, unknown>): Promise<{ matchedCount: number; modifiedCount: number }>
   updateMany(filter: Record<string, unknown>, update: Record<string, unknown>): Promise<{ matchedCount: number; modifiedCount: number }>
   deleteOne(filter: Record<string, unknown>): Promise<{ deletedCount: number }>
   deleteMany(filter: Record<string, unknown>): Promise<{ deletedCount: number }>
   countDocuments(filter?: Record<string, unknown>): Promise<number>
   state: {
      name: string
      adapter: MongoAdapter
      model: Schema
   }
}


// todo update it
export function MongoEntity<Schema extends AnySchema>(input: MongoEntityInput<Schema>): MongoEntityOutput<Schema> {
   const collection = input.adapter.collection(input.name)

   return {
      async insertOne(doc) {
         const validated = input.model.parse(doc)
         return collection.insertOne(validated)
      },
      async insertMany(docs) {
         const validated = docs.map((d) => input.model.parse(d))
         return collection.insertMany(validated)
      },
      async findOne(filter) {
         const raw = await collection.findOne(filter)
         return raw === null ? null : input.model.parse(raw)
      },
      async find(filter) {
         const raw = await collection.find(filter)
         return raw.map((r) => input.model.parse(r))
      },
      updateOne: (filter, update) => collection.updateOne(filter, update),
      updateMany: (filter, update) => collection.updateMany(filter, update),
      deleteOne: (filter) => collection.deleteOne(filter),
      deleteMany: (filter) => collection.deleteMany(filter),
      countDocuments: (filter) => collection.countDocuments(filter),
      state: { name: input.name, adapter: input.adapter, model: input.model },
   }
}
