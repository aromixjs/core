import { TableModel } from './chain.type'
import { DDLState, UniqueConflict } from './state.type'

// internal table state that will hold all the final data

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

type Col<Model extends TableModel> = { [Key in keyof Model]: Key }

interface Ctx {
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

export class Table<Model extends TableModel> {
      readonly model: Model
      readonly state: TableState<Model>

      constructor(model: Model) {
            this.model = model

            const columns = {} as { [Key in keyof Model]: DDLState }
            for (const key of Object.keys(model)) {
                  columns[key as keyof Model] = model[key].state
            }

            this.state = {
                  columns,
                  unique: [],
                  primaryKey: [],
                  index: [],
                  uniqueIndex: [],
                  checks: [],
                  withoutRowId: false,
            }
      }

      with(fn: (ctx: Ctx,col: Col<Model>,) => void): this {
            fn(this.buildCtx(),this.buildCol())
            return this
      }

      private buildCol(): Col<Model> {
            const col: any = {}
            for (const key of Object.keys(this.state.columns)) {
                  col[key] = key
            }
            return col
      }

      private buildCtx(): Ctx {
            const state = this.state

            return {
                  unique(cols, conflict) {
                        const entry: { cols: string[]; conflict?: UniqueConflict } = { cols }
                        if (conflict !== undefined) {
                              entry.conflict = conflict
                        }
                        state.unique.push(entry)
                  },

                  primaryKey(cols) {
                        state.primaryKey.push({ cols })
                  },

                  index(cols) {
                        state.index.push({ cols })
                  },

                  uniqueIndex(cols) {
                        state.uniqueIndex.push({ cols })
                  },

                  checks(exprs) {
                        state.checks.push(...exprs)
                  },

                  gt(left, right) {
                        return { left, op: 'gt' as const, right }
                  },

                  gte(left, right) {
                        return { left, op: 'gte' as const, right }
                  },

                  lt(left, right) {
                        return { left, op: 'lt' as const, right }
                  },

                  lte(left, right) {
                        return { left, op: 'lte' as const, right }
                  },
                  withoutRowId() {
                        state.withoutRowId = true
                  },
            }
      }
}
