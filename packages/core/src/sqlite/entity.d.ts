import { SqliteAdapter } from './adapter'
import { ColumnReference, ColumnState, UniqueConflict } from './ddl/column'

export interface CheckExpression {
    left: string
    op: 'gt' | 'gte' | 'lt' | 'lte'
    right: string
}
export interface SqliteEntityOptionsCtx<ColName extends string = string> {
    unique(cols: ColName[], conflict: UniqueConflict): void
    primaryKey(cols: ColName[]): void
    index(cols: ColName[]): void
    uniqueIndex(cols: ColName[]): void
    checks(exprs: CheckExpression[]): void
    gt(left: ColName, right: ColName): CheckExpression
    gte(left: ColName, right: ColName): CheckExpression
    lt(left: ColName, right: ColName): CheckExpression
    lte(left: ColName, right: ColName): CheckExpression
    withoutRowId(): void
}

export interface SqliteEntityInput<State> {
    name: string
    adapter: SqliteAdapter
    columns: State
    options(ctx: SqliteEntityOptionsCtx<keyof State>): void
}

export interface SqliteEntityState {
    name: string
    columns: Record<string, ColumnState>
    unique: Array<{
        cols: string[]
        conflict: UniqueConflict
    }>
    primaryKey: Array<{
        cols: string[]
    }>
    index: Array<{
        cols: string[]
    }>
    uniqueIndex: Array<{
        cols: string[]
    }>
    checks: CheckExpression[]
    withoutRowId: boolean
}

export interface SqliteEntityOutput<State> {
    state: SqliteEntityState
    col(columnName: keyof State): ColumnReference
    toSelectSchema(): any
    toInsertSchema(): any
    toUpdateSchema(): any
}
