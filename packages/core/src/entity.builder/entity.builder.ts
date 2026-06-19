import { Builder } from './col.builder'
import { OperatorDef } from './ddl.chain'

export type OperatorRecord = Record<string, OperatorDef>


// entity.builder.ts
export function SqliteEntityBuilder<
   TextOperator extends OperatorRecord,
   IntOperator extends OperatorRecord,
   RealOperator extends OperatorRecord,
   BlobOperator extends OperatorRecord
>(input: {
   adapter: (sql: string) => Promise<unknown>
   Text?: TextOperator
   Int?: IntOperator
   Real?: RealOperator
   Blob?: BlobOperator
}) {
   const builder = new Builder(
      input.Text ?? ({} as TextOperator),
      input.Int  ?? ({} as IntOperator),
      input.Real ?? ({} as RealOperator),
      input.Blob ?? ({} as BlobOperator),
   )

   return {
      entity(def: { name: string; model: (b: typeof builder) => any[] }) {
         return def.model(builder)
      },
   }
}