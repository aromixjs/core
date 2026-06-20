import type { Reference, ReferenceRule, UniqueConflict } from '../column/column.state'
import type { ConstrainState } from './constrain.state'

// column name gonna be a union of string
export class ConstrainsBuilder<ColumnName extends string> {
   readonly state: ConstrainState = {}

   primaryKey(cols: ColumnName[]) {
      this.state.primaryKey = {
         cols,
      }


      return this.state
   }

   unique(cols: ColumnName[], uniqueConflict: UniqueConflict = 'conflict:error') {
      this.state.unique = {
         cols,
         uniqueConflict,
      }


      return this.state
   }

   foreignKey(cols: ColumnName[], ref: Reference, rules: ReferenceRule[] = []) {
      this.state.references = {
         cols,
         reference: ref,
         referencesRules: rules,
      }
      return this.state
   }
}


