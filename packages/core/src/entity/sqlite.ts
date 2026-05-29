
import { Adapter } from "../adapter";
import { Meta } from "../ddl/lite.type";
import { Kit } from "../global/kit";


export type LiteModel = Record<string, { [Kit.$meta]: Meta }>

export interface SQLiteEntityInput {
   name: string
   storage: Adapter.SQLite
   model: LiteModel
}



export interface SQLiteEntityOutput {
   [Kit.$meta]: {
      name: string
      adapter: Adapter.SQLite
      model: LiteModel
   }
}

export function sqlite(configuration: SQLiteEntityInput): SQLiteEntityOutput {

   return {
      [Kit.$meta]: {
         name: configuration.name,
         model: configuration.model,
         adapter: configuration.storage
      }
   }
}