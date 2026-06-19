import { OperatorRecord } from "./operators";
import { ColumnType } from "./states";

export class BaseColumnBuilder<Name extends string, Type extends ColumnType, Operators extends OperatorRecord> {

    constructor(
        public name: Name,
        public type: Type,
        public state: Record<string, unknown> = {}
    ) {}

}


export class TextBuilder<Name extends string, Operators extends OperatorRecord> extends BaseColumnBuilder<Name, "Text", Operators> {



   constructor(
      name: Name,
      private ops: Operators
   ) {
      super(name, "Text")
   }
 }







