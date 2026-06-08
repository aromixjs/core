import { TableModel } from './chain'
import { DDLState, UniqueConflict } from './column'

export interface CheckExpr {
      left: string
      op: 'gt' | 'gte' | 'lt' | 'lte'
      right: string
}

export interface TableState<Model extends TableModel> {
      columns: { [Key in keyof Model]: DDLState }
      unique: { cols: string[]; conflict?: UniqueConflict }[]
      primaryKey: { cols: string[] }[]
      index: { cols: string[] }[]
      uniqueIndex: { cols: string[] }[]
      checks: CheckExpr[]
      withoutRowId: boolean
}

export type ColKey<Model extends TableModel> = keyof Model & string
export interface Ctx<Model extends TableModel> {
      unique(cols: ColKey<Model>[], conflict?: UniqueConflict): void
      primaryKey(cols: ColKey<Model>[]): void
      index(cols: ColKey<Model>[]): void
      uniqueIndex(cols: ColKey<Model>[]): void
      checks(exprs: CheckExpr[]): void
      gt(left: ColKey<Model>, right: ColKey<Model>): CheckExpr
      gte(left: ColKey<Model>, right: ColKey<Model>): CheckExpr
      lt(left: ColKey<Model>, right: ColKey<Model>): CheckExpr
      lte(left: ColKey<Model>, right: ColKey<Model>): CheckExpr
      withoutRowId(): void
}
