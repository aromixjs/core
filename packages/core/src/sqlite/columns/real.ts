import { Reference, ReferenceRule, UniqueConflict } from "../types"

export interface RealState {
   colName: string
   colType: 'REAL'
   primaryKey: boolean
   unique: boolean
   uniqueConflict?: UniqueConflict
   index: boolean
   references?: Reference
}

export class RealModifier<const Col extends string> {

   readonly state: RealState

   constructor(col: Col) {

      this.state = {
         colName: col,
         colType: 'REAL',
         unique: false,
         index: false,
         primaryKey: false,
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
}
