import { Convert } from './ddl/convert'
import {  SqliteEntityInput, SqliteEntityOutput, SqliteEntityState } from './entity.d'

export function SqliteEntity<State extends Record<string, any>>(input: SqliteEntityInput<State>): SqliteEntityOutput<State> {
    const columns: any = {}

    for (const key of Object.keys(input.columns)) {
        columns[key] = input.columns[key].state
    }

    const state: SqliteEntityState = {
        name: input.name,
        columns,
        unique: [],
        primaryKey: [],
        index: [],
        uniqueIndex: [],
        checks: [],
        withoutRowId: false,
    }

    input.options({
        unique(cols, conflict) {
            state.unique.push({ cols, conflict })
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
            state.checks = exprs
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

    return {
        state,
        col(columnName: keyof State) {
            return {
                entityName: input.name,
                columnName: columnName,
                tableState: columns,
            }
        },
        toSelectSchema() {
            return Convert.select(columns)
        },
        toInsertSchema() {
            return Convert.insert(columns)
        },
        toUpdateSchema() {
            return Convert.update(columns)
        },
    } as any
}
