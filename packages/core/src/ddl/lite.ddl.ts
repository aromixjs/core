/**
 *  DDL IMPLEMENTATION FOR SQL LITE
 */

import { liteKit } from "./lite.kit"




export class lite {

   [liteKit.$meta]: liteKit.Meta

   private constructor(input: liteKit.Input) {
      this[liteKit.$meta] = {}
   }

   static table() { }

   static int() {
      return new lite({ type: 'int' })
   }

   static real() {
      return new lite({ type: 'real' })
   }

   static text() {
      return new lite({ type: 'text' })
   }

   static blob() {
      return new lite({ type: 'blob' })
   }

   static boolean() {
      return new lite({ type: 'boolean' })
   }

   static bigint() {
      return new lite({ type: 'bigint' })
   }

   static date(format: liteKit.DateFormat) {
      return new lite({ type: 'date', dateFormat: format })
   }
}