import { TextModifier } from "./modifiers/text";

export class Builder {
   text<const Col extends string>(col: Col) {
      return new TextModifier(col)
   }

   int<const Col extends string>(col: Col) {
   }

   real<const Col extends string>(col: Col) {
   }

   blob<const Col extends string>(col: Col) {
   }
}









