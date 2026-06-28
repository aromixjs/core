import { MongoClient } from "mongodb"
import { MaybePromise } from "../global"
import { Database } from "./database"

export interface MongoConfig<Type extends readonly string[]> {
   name: string
   db: Type
   client(): MongoClient
   onConnect?(client: MongoClient): MaybePromise<void>
   onDisconnect?(client: MongoClient): MaybePromise<void>
   onError?(err: unknown): void
}



export type MongoContext<Type extends readonly string[]> = {
   [Key in Type[number]]: Database 
   } & {
   client(): MongoClient
   connect(): void


}