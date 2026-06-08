// internal table state that will hold all the final data

import { TableModel } from "./chain"
import { DDLState, UniqueConflict } from "./column"

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

export type Col<Model extends TableModel> = { [Key in keyof Model]: Key }

export interface Ctx {
      unique(cols: string[], conflict?: UniqueConflict): void
      primaryKey(cols: string[]): void
      index(cols: string[]): void
      uniqueIndex(cols: string[]): void
      checks(exprs: CheckExpr[]): void
      gt(left: string, right: string): CheckExpr
      gte(left: string, right: string): CheckExpr
      lt(left: string, right: string): CheckExpr
      lte(left: string, right: string): CheckExpr
      withoutRowId(): void
}