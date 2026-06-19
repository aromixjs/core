import { BlobOperatorRecord, IntOperatorRecord, OperatorFn, RealOperatorRecord, TextOperatorRecord } from "./operators";
import { ColumnState } from "./states";

export interface BuilderInput {
   Text: TextOperatorRecord
   Int: IntOperatorRecord
   Real: RealOperatorRecord
   Blob: BlobOperatorRecord
}


export class Builder {
   constructor(private operators: BuilderInput) { }
   text(colName: string) {
      return new TextModifiers({
         colName,
         colType: 'Text',
         meta: {}
      }, this.operators.Text)

   }
   int(colName: string) { }
   real(colName: string) { }
   blob(colName: string) { }
}



export class TextModifiers<Operators extends TextOperatorRecord> {
   constructor(
      private state: ColumnState,
      protected operators: Operators) {

   }
}


export class IntModifiers {
   constructor(operators: IntOperatorRecord) {

   }
}

export class RealModifiers {


   constructor(operators: RealOperatorRecord) {

   }


}



export class BlobModifiers {
   constructor(operators: BlobOperatorRecord) {

   }
}