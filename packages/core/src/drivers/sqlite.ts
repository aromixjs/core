import { Chain, CheckExpression, ColumnReference, ColumnState, TableOptionsCtx, UniqueConflict } from '../lite'
import { ax, Schema, AnySchema } from '@aromix/validator'
import { liteToAx } from '../convert/def'
import type { LiteToAxOutput } from '../convert/types'

export namespace Sqlite {
    // Data Adapters
    export interface Adapter {
        query(sql: string): Promise<unknown>
    }

    export function adapter(adapter: Sqlite.Adapter) {
        return adapter
    }

    // Data Definition Entity
    export interface EntityInput<State extends Record<string, Chain<any, any, boolean, boolean, any>>> {
        name: string
        adapter: Sqlite.Adapter
        columns: State
        options(ctx: TableOptionsCtx<keyof State & string>): void
    }

    export interface EntityState {
        name: string
        columns: Record<string, ColumnState>
        unique: { cols: string[]; conflict?: UniqueConflict }[]
        primaryKey: { cols: string[] }[]
        index: { cols: string[] }[]
        uniqueIndex: { cols: string[] }[]
        checks: CheckExpression[]
        withoutRowId: boolean
    }

    // Local entity-level helpers
    type ChainNotNull<C extends Chain<any, any, boolean, boolean, any>> =
        C extends Chain<any, any, infer N, any, any> ? N : false

    type ChainAutoInc<C extends Chain<any, any, boolean, boolean, any>> =
        C extends Chain<any, any, any, infer A, any> ? A : false

    type InsertOutput<S extends Record<string, Chain<any, any, boolean, boolean, any>>> = {
        [K in keyof S as ChainAutoInc<S[K]> extends true ? never : K]:
            ChainNotNull<S[K]> extends true
                ? LiteToAxOutput<S[K]>
                : LiteToAxOutput<S[K]> | undefined
    }

    export interface EntityOutput<State extends Record<string, Chain<any, any, boolean, boolean, any>>> {
        state: Sqlite.EntityState
        col(columnName: keyof State & string): ColumnReference
        toSelectSchema(): Schema<{ [K in keyof State]: LiteToAxOutput<State[K]> }>
        toInsertSchema(): Schema<InsertOutput<State>>
        toUpdateSchema(): Schema<{ [K in keyof State]: LiteToAxOutput<State[K]> | undefined }>
    }

    // ── Schema builder helpers ──────────────────────────────────────────────────

    function buildSelectSchema(cols: Record<string, ColumnState>): any {
        const shape: Record<string, AnySchema> = {}
        for (const [key, col] of Object.entries(cols)) {
            shape[key] = liteToAx(col)
        }
        return ax.object(shape)
    }

    function buildInsertSchema(cols: Record<string, ColumnState>): any {
        const shape: Record<string, AnySchema> = {}
        for (const [key, col] of Object.entries(cols)) {
            if (col.autoIncrement) continue

            let schema: any = liteToAx(col)
            if (!col.notNull || col.default !== undefined || col.defaultFn) {
                schema = ax.union([schema, ax.undefined()])
            }
            shape[key] = schema
        }
        return ax.object(shape)
    }

    function buildUpdateSchema(cols: Record<string, ColumnState>): any {
        const shape: Record<string, AnySchema> = {}
        for (const [key, col] of Object.entries(cols)) {
            shape[key] = ax.union([liteToAx(col), ax.undefined()])
        }
        return ax.object(shape)
    }

    // ── Entity builder ─────────────────────────────────────────────────────────

    export function entity<State extends Record<string, Chain<any, any, boolean, boolean, any>>>(input: Sqlite.EntityInput<State>): Sqlite.EntityOutput<State> & {
        readonly $inferSelect: { [K in keyof State]: LiteToAxOutput<State[K]> }
        readonly $inferInsert: InsertOutput<State>
        readonly $inferUpdate: { [K in keyof State]: LiteToAxOutput<State[K]> | undefined }
    } {
        const columns: Record<string, ColumnState> = {}

        for (const key of Object.keys(input.columns)) {
            columns[key] = input.columns[key].state
        }

        const state: Sqlite.EntityState = {
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
}
