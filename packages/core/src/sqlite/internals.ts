import { AnyOperatorRecord } from "./operators"
import { ColumnType } from "./states"

export type PickOperator<OperatorRecord extends AnyOperatorRecord, Type extends ColumnType> = {
   [Key in keyof OperatorRecord]: OperatorRecord[Key] extends Record<Type, infer Fn> ? Fn : never
}

export interface Split<Operator extends AnyOperatorRecord> {
   Text: PickOperator<Operator, 'Text'>
   Int: PickOperator<Operator, 'Int'>
   Real: PickOperator<Operator, 'Real'>
   Blob: PickOperator<Operator, 'Blob'>
}

/**
 *  The goal of this fn is to separate the operators based on there column type while keeping the type intact 
 *  that untouched type is needed for later steps
 */
export function split<Operators extends AnyOperatorRecord>(operators: Operators): Split<Operators> {
   const Text: any = {}
   const Blob: any = {}
   const Int: any = {}
   const Real: any = {}

   for (const [key, value] of Object.entries(operators)) {
      if (value.Int) {
         Int[key] = value.Int
      }

      if (value.Blob) {
         Blob[key] = value.Blob
      }


      if (value.Real) {
         Real[key] = value.Real
      }

      if (value.Text) {
         Text[key] = value.Text
      }
   }

   return {
      Text, Blob, Int, Real
   }
}
