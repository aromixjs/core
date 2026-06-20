import { Reference, ReferenceRule, UniqueConflict } from "../column/column.state"

export interface ConstrainState {
   primaryKey?: {
      cols: string[]
   }

   unique?: {
      cols: string[]
      uniqueConflict: UniqueConflict
   }


   references?: {
      cols: string[]
      reference: Reference
      referencesRules: ReferenceRule[]

   }

}


