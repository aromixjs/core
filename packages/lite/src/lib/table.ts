import { TableModel } from '../types/chain'
import { DDLState, UniqueConflict } from '../types/column'
import { Ctx, TableState } from '../types/table'

export class Table<Model extends TableModel> {
      readonly state: TableState<Model>

      constructor(model: Model) {
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

      with(fn: (ctx: Ctx<Model>) => void) {
            fn(this.buildCtx())
            return this
      }

      private buildCtx(): Ctx<Model> {
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
                        return { left, op: 'gt', right }
                  },

                  gte(left, right) {
                        return { left, op: 'gte', right }
                  },

                  lt(left, right) {
                        return { left, op: 'lt', right }
                  },

                  lte(left, right) {
                        return { left, op: 'lte', right }
                  },
                  withoutRowId() {
                        state.withoutRowId = true
                  },
            }
      }
}
