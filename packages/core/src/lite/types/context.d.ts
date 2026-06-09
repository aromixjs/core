import { ColumnState, UniqueConflict } from './column.d'

export type TableState = Record<string, { readonly state: ColumnState }>

export interface CheckExpression {
    left: string
    op: 'gt' | 'gte' | 'lt' | 'lte'
    right: string
}

export type ColumnKey<State extends TableState> = keyof State & string

export interface TableOptionsCtx<State extends TableState> {
    unique(cols: ColumnKey<State>[], conflict: UniqueConflict): void
    primaryKey(cols: ColumnKey<State>[]): void
    index(cols: ColumnKey<State>[]): void
    uniqueIndex(cols: ColumnKey<State>[]): void
    checks(exprs: CheckExpression[]): void
    gt(left: ColumnKey<State>, right: ColumnKey<State>): CheckExpression
    gte(left: ColumnKey<State>, right: ColumnKey<State>): CheckExpression
    lt(left: ColumnKey<State>, right: ColumnKey<State>): CheckExpression
    lte(left: ColumnKey<State>, right: ColumnKey<State>): CheckExpression
    withoutRowId(): void
}
