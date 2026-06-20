import { Builder } from './fields'
import { ReferencedCol } from './state'

export interface LiteAdapter {
   query: (sql: string) => Promise<unknown>
}

export interface LiteEntityInput {
   name: string
   adapter: LiteAdapter
   fields: (builder: Builder) => Array<any>
}

export interface LiteEntityInstance {
   col: (colName: string) => ReferencedCol
}

export function LiteEntity(input: LiteEntityInput): LiteEntityInstance {

   const builder = new Builder()

   input.fields(builder)

   return {
      col(colName) {
         return {
            colName,
            tableName: input.name,
            tableState: input.fields(builder).map((m) => m.state),
         }
      },
   }

}