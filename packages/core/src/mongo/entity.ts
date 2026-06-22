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



export function MongoEntity<Schema extends AnySchema>(input: MongoEntityInput<Schema>): MongoEntityOutput<Schema> {

   const collection = input.adapter.collection(input.name)

   return {
      async insertOne(doc) {
         const validated = input.model.parse(doc)
         const result = await collection.insertOne(validated)
         return { insertedId: result.insertedId }
      },

      async insertMany(docs) {
         const validated = docs.map((d) => input.model.parse(d))
         const result = await collection.insertMany(validated)
         return { insertedIds: Object.values(result.insertedIds) }
      },

      async findOne(filter) {
         const raw = await collection.findOne(filter)
         return raw === null ? null : input.model.parse(raw)
      },

      async find(filter) {
         const raw = await collection.find(filter)
         return raw.map((r: unknown) => input.model.parse(r))
      },

      async updateOne(filter, update) {
         const result = await collection.updateOne(filter, update)
         return { matchedCount: result.matchedCount, modifiedCount: result.modifiedCount }
      },

      async updateMany(filter, update) {
         const result = await collection.updateMany(filter, update)
         return { matchedCount: result.matchedCount, modifiedCount: result.modifiedCount }
      },

      async deleteOne(filter) {
         const result = await collection.deleteOne(filter)
         return { deletedCount: result.deletedCount }
      },

      async deleteMany(filter) {
         const result = await collection.deleteMany(filter)
         return { deletedCount: result.deletedCount }
      },

      countDocuments: (filter) => collection.countDocuments(filter),

      state: { name: input.name, adapter: input.adapter, model: input.model },
   }

}