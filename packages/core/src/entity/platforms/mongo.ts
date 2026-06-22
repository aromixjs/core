import { AnySchema } from "@aromix/validator"
import { Collection, Db, Document, ObjectId } from "mongodb"

export interface MongoEntityUserInput<Schema extends AnySchema> {
   name: string
   model: Schema
}


export class MongoEntity<Schema extends AnySchema<object>> {
   readonly states: MongoEntityUserInput<Schema>
   private readonly db: Db
   private readonly collection: Collection<Document>
   constructor(userInput: MongoEntityUserInput<Schema>, internal: Db) {
      this.states = userInput
      this.db = internal
      this.collection = this.db.collection(userInput.name)
   }

   async insertOne(doc: Schema['$infer']) {
      const id = new ObjectId()
      const validated = this.states.model.parse(doc)
      const result = await this.collection.insertOne({
         _id: id,
         ...validated
      }, {
         forceServerObjectId: true
      })
      console.log(result);

      return result
   }

   // async insertMany(docs) {
   //    const validated = docs.map((d) => input.model.parse(d))
   //    const result = await collection.insertMany(validated)
   //    return { insertedIds: Object.values(result.insertedIds) }
   // },

   // async findOne(filter) {
   //    const raw = await collection.findOne(filter)
   //    return raw === null ? null : input.model.parse(raw)
   // },

   // async find(filter) {
   //    const raw = await collection.find(filter)
   //    return raw.map((r: unknown) => input.model.parse(r))
   // },

   // async updateOne(filter, update) {
   //    const result = await collection.updateOne(filter, update)
   //    return { matchedCount: result.matchedCount, modifiedCount: result.modifiedCount }
   // },

   // async updateMany(filter, update) {
   //    const result = await collection.updateMany(filter, update)
   //    return { matchedCount: result.matchedCount, modifiedCount: result.modifiedCount }
   // },

   // async deleteOne(filter) {
   //    const result = await collection.deleteOne(filter)
   //    return { deletedCount: result.deletedCount }
   // },

   // async deleteMany(filter) {
   //    const result = await collection.deleteMany(filter)
   //    return { deletedCount: result.deletedCount }
   // },

   // countDocuments: (filter) => collection.countDocuments(filter),





}
