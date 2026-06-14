import { AxConverter } from './converter/ax'
import { SqlConverter } from './converter/sql'
import { SqliteEntityDml } from './dml/impl'
import { PaginateOptions, Where } from './dml/types'
import { EntityInsert, EntityUpdate, SqliteEntityInput, SqliteEntityOutput, SqliteEntityState } from './entity.types'

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

    if (input.options) {
        input.options({
            unique(uniqueOptions) {
                state.unique.push(uniqueOptions)
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
    }

    const dml = new SqliteEntityDml<State>(state, input.adapter)

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
            return AxConverter.select(columns)
        },
        toInsertSchema() {
            return AxConverter.insert(columns)
        },
        toUpdateSchema() {
            return AxConverter.update(columns)
        },
        toSql() {
            return new SqlConverter(state).toSql()
        },
        findById: (id: string | number) => dml.findById(id),
        findOne: (filter?: Where<State>) => dml.findOne(filter as any),
        findMany: (filter?: Where<State>) => dml.findMany(filter as any),
        count: (filter?: Where<State>) => dml.count(filter as any),
        exist: (filter?: Where<State>) => dml.exist(filter as any),
        insert: (data: EntityInsert<State>) => dml.insert(data),
        update: (filter: Where<State>, data: EntityUpdate<State>) => dml.update(filter as any, data),
        upsert: (data: EntityInsert<State>, conflictColumns?: (keyof State)[]) => dml.upsert(data, conflictColumns),
        delete: (filter: Where<State>) => dml.delete(filter as any),
        deleteById: (id: string | number) => dml.deleteById(id),
        paginate: (filter: Where<State> | undefined, options: PaginateOptions) => dml.paginate(filter as any, options),
    } as any
}
