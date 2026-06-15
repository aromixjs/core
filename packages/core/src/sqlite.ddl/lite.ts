import { ax } from '@aromix/validator'
import { AxConverter } from '../sqlite.convert/ax'
import { createColumn } from './column'
import { ColumnState } from './column.state.type'
import { TableColumns, TableInput, TableState } from './table.types'

export const lite = {
    int() {
        return createColumn('int')
    },
    real() {
        return createColumn('real')
    },
    text() {
        return createColumn('text')
    },
    blob() {
        return createColumn('blob')
    },

    table<Cols extends TableColumns>(input: TableInput<Cols>): TableState<Cols> {
        const rawColumns: Record<string, ColumnState> = {}

        for (const key of Object.keys(input.columns)) {
            rawColumns[key] = input.columns[key].state
        }
        const state: TableState<Cols> = {
            columns: input.columns,
            rawColumns,
            unique: [],
            primaryKey: [],
            index: [],
            uniqueIndex: [],
            checks: [],
            withoutRowId: false,

            $inferSelect: undefined as any,
            $inferInsert: undefined as any,
            $inferUpdate: undefined as any,

            toSelectSchema() {
                return AxConverter.select(rawColumns)
            },
            toInsertSchema() {
                return AxConverter.insert(rawColumns)
            },
            toUpdateSchema() {
                return AxConverter.update(rawColumns)
            },
        }

        if (input.options !== undefined) {
            input.options({
                unique(options) {
                    state.unique.push({
                        name: options.name,
                        cols: options.cols,
                        conflict: options.conflict ?? 'conflict:error',
                    })
                },

                primaryKey(cols) {
                    state.primaryKey.push({ cols })
                },
                index(options) {
                    state.index.push(options)
                },
                uniqueIndex(options) {
                    state.uniqueIndex.push(options)
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
            })
        }

        return state
    },
}