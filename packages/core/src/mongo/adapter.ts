export interface MongoCollectionAdapter {
   insertOne(doc: any): Promise<any>
   insertMany(docs: any): Promise<any>
   findOne(filter: any): Promise<any>
   find(filter: any): Promise<any>
   updateOne(filter: any, update: any): Promise<any>
   updateMany(filter: any, update: any): Promise<any>
   deleteOne(filter: any): Promise<any>
   deleteMany(filter: any): Promise<any>
   countDocuments(filter?: any): Promise<any>
}

export interface MongoAdapter {
   collection(name: string): MongoCollectionAdapter
}

export function MongoAdapter(adapter: MongoAdapter) {
   return adapter
}