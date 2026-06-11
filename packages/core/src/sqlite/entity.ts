import { Column } from "./ddl/column"
import { ColumnState } from "./ddl/column.d"
import { SqliteEntityInput, SqliteEntityOutput, SqliteEntityState } from "./entity.d"


export function SqliteEntity<State extends Record<string, Column>>(input: SqliteEntityInput<State>): SqliteEntityOutput<State> {
    const columns: Record<string, ColumnState> = {}

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
        unique(cols:string[], conflict) {
            state.unique.push({ cols: cols, conflict })
        },
        primaryKey(cols) {
            state.primaryKey.push({ cols: cols as string[] })
        },
        index(cols) {
            state.index.push({ cols: cols as string[] })
        },
        uniqueIndex(cols) {
            state.uniqueIndex.push({ cols: cols as string[] })
        },
        checks(exprs) {
            state.checks = exprs
        },
        gt(left, right) {
            return { left: left as string, op: 'gt', right: right as string }
        },
        gte(left, right) {
            return { left: left as string, op: 'gte', right: right as string }
        },
        lt(left, right) {
            return { left: left as string, op: 'lt', right: right as string }
        },
        lte(left, right) {
            return { left: left as string, op: 'lte', right: right as string }
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
    }
}
