import { ColType, DDLState } from "./state.type"

// Chain :: a fluent interface with phantom Used to permanently remove methods within that context
export type Chain<Type extends ColType, Used extends string = never> = Omit<
  {
    readonly state: DDLState
    primaryKey(): Chain<Type, Used | 'primaryKey'>
    autoIncrement(): Chain<Type, Used | 'autoIncrement'>
    notNull(): Chain<Type, Used | 'notNull'>
  },
  Used
>

// AnyChain :: accepts a Chain at any Used depth.
export interface AnyChain {
  readonly state: DDLState
}

export type TableModel = Record<string, AnyChain>

// TableDefinition :: what lite.table() returns
export interface TableDefinition<Model extends TableModel> {
  readonly model: Model
  readonly states: { [Key in keyof Model]: DDLState }
}


