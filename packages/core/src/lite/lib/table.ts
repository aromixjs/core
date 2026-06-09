import type { TableModel } from '../types/chain'
import type { ColumnKey, Context, TableState } from '../types/table'

export class Table<Model extends TableModel> {
    readonly state: TableState<Model>

    constructor(model: Model) {
        const columns: any = {}
        for (const key of Object.keys(model)) {
            columns[key] = model[key].state
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

    with(fn: (ctx: Context<Model>) => void) {
        fn(this.buildCtx())
        return this
    }

    col(colName: ColumnKey<Model>) {}

    private buildCtx(): Context<Model> {
        const state = this.state
        return {
            unique(cols, conflict) {
                if (conflict !== undefined) {
                    state.unique.push({ cols, conflict })
                } else {
                    state.unique.push({ cols })
                }
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
