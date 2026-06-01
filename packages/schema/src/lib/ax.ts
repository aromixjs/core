import { AxType, AxTypeMap, Meta } from "./types"

export class ax<Type extends AxType> {

   declare $infer: AxTypeMap[Type]
   private meta: Meta

   private constructor(type: Type) {

      this.meta = {
         type,
         message: undefined
      }

   }




   static string() {
      return new ax<'string'>('string')
   }
   
   static number() {
      return new ax<'number'>('number')
   }

   static boolean() {
      return new ax<'boolean'>('boolean')
   }

   static bigint() {
      return new ax<'bigint'>('bigint')
   }

   static symbol() {
      return new ax<'symbol'>('symbol')
   }

   static null() {
      return new ax<'null'>('null')
   }

   static undefined() {
      return new ax<'undefined'>('undefined')
   }

   static unknown() {
      return new ax<'unknown'>('unknown')
   }

   static never() {
      return new ax<'never'>('never')
   }
}