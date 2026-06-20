import { Collate, TextModifierState } from "../state"

export class TextModifier<const Col extends string> {

   readonly state: TextModifierState
   constructor(col: Col) {
      this.state = {
         colName: col,
         colType: 'TEXT',
         unique: false,
         index: false
      }
   }

   unique() {
      this.state.unique = true
      return this
   }

   collate(option: Collate) {
      this.state.collate = option
      return this
   }

   index() {
      this.state.index = true
      return this
   }





}
