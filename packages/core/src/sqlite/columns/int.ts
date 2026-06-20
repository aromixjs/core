import { Reference, ReferenceRule, UniqueConflict } from "../types"

export interface IntState {
   colName: string
   colType: 'INTEGER'
   primaryKey: boolean
   autoIncrement: boolean
   unique: boolean
   uniqueConflict?: UniqueConflict
   index: boolean
   references?: Reference
}

export class IntModifier<const Col extends string> {

   readonly state: IntState

   constructor(col: Col) {

      this.state = {
         colName: col,
         colType: 'INTEGER',
         unique: false,
         index: false,
         primaryKey: false,
         autoIncrement: false
      }
   }

   primaryKey() {
      this.state.primaryKey = true
      return this
   }

   unique(conflict: UniqueConflict = 'conflict:error') {
      this.state.unique = true
      this.state.uniqueConflict = conflict
      return this
   }

   index() {
      this.state.index = true
      return this
   }

   references(ref: Reference, rules: ReferenceRule[] = []) {
      this.state.references = {
         entityName: ref.entityName,
         columnName: ref.columnName,
         tableState: ref.tableState,
         rules: rules
      }
   }


   autoIncrement() {
      this.state.autoIncrement = true
      return this
   }
}
