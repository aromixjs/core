import { Builder } from "./column.builder"
import { split } from "./internals"
import { AnyOperatorRecord, PrettifyObj } from "./operators"
import { ColumnType } from "./states"
export interface EntityInput {
   name: string
   model: (builder: Builder) => Array<any>
}


export function EntityBuilder<const Operators extends AnyOperatorRecord>(input: {
   adapter: (sql: string) => Promise<unknown>
   operators: Operators
}) {


const {}=split(input.operators)

   // const builder = new Builder({
   //    Text, Int, Blob, Real
   // })






   // entity(options: EntityInput) {
   //    options.model(builder)
   // }

}
