import { ColumnState } from "./ddl/column.d";
import { SqliteEntityInput, SqliteEntityOutput, SqliteEntityState } from "./entity.d";

export function SqliteEntity<State>(input: SqliteEntityInput<State>): SqliteEntityOutput<State> {
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

    const selectSchema = buildSelectSchema(columns)
    const insertSchema = buildInsertSchema(columns)
    const updateSchema = buildUpdateSchema(columns)

    const result: Sqlite.EntityOutput<State> = {
        state,
        col(columnName) {
            return {
                entityName: input.name,
                columnName,
                tableState: columns,
            }
        },
        toSelectSchema() {
            return selectSchema
        },
        toInsertSchema() {
            return insertSchema
        },
        toUpdateSchema() {
            return updateSchema
        },
    }
    return result as any
}
