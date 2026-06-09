import type { TableModel } from './chain'
import type { ColumnState, UniqueConflict } from './column'

export interface CheckExpression {
    left: string
    op: 'gt' | 'gte' | 'lt' | 'lte'
    right: string
}

export interface TableState<Model extends TableModel> {
    columns: { [Key in keyof Model]: ColumnState }
    unique: { cols: string[]; conflict?: UniqueConflict }[]
    primaryKey: { cols: string[] }[]
    index: { cols: string[] }[]
    uniqueIndex: { cols: string[] }[]
    checks: CheckExpression[]
    withoutRowId: boolean
}

export type ColumnKey<Model extends TableModel> = keyof Model & string

export interface Context<Model extends TableModel> {
    unique(cols: ColumnKey<Model>[], conflict?: UniqueConflict): void
    primaryKey(cols: ColumnKey<Model>[]): void
    index(cols: ColumnKey<Model>[]): void
    uniqueIndex(cols: ColumnKey<Model>[]): void
    checks(exprs: CheckExpression[]): void
    gt(left: ColumnKey<Model>, right: ColumnKey<Model>): CheckExpression
    gte(left: ColumnKey<Model>, right: ColumnKey<Model>): CheckExpression
    lt(left: ColumnKey<Model>, right: ColumnKey<Model>): CheckExpression
    lte(left: ColumnKey<Model>, right: ColumnKey<Model>): CheckExpression
    withoutRowId(): void
}
