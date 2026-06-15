import { Schema } from '@aromix/validator'
import { Column } from './column.builder.types'
import { ColumnState, ColumnType, UniqueConflict } from './column.state.type'

export interface CheckExpression {
    left: string
    op: 'gt' | 'gte' | 'lt' | 'lte'
    right: string
}

export type TableColumns = Record<string, Column<ColumnType, any>>

export type ColumnKey<Cols extends TableColumns> = keyof Cols & string

export interface TableOptionsCtx<Cols extends TableColumns> {
    unique(options: { name: string; cols: ColumnKey<Cols>[]; conflict?: UniqueConflict }): void
    primaryKey(cols: ColumnKey<Cols>[]): void
    index(options: { name: string; cols: ColumnKey<Cols>[] }): void
    uniqueIndex(options: { name: string; cols: ColumnKey<Cols>[] }): void
    checks(exprs: CheckExpression[]): void
    gt(left: ColumnKey<Cols>, right: ColumnKey<Cols>): CheckExpression
    gte(left: ColumnKey<Cols>, right: ColumnKey<Cols>): CheckExpression
    lt(left: ColumnKey<Cols>, right: ColumnKey<Cols>): CheckExpression
    lte(left: ColumnKey<Cols>, right: ColumnKey<Cols>): CheckExpression
    withoutRowId(): void
}

export interface TableInput<Cols extends TableColumns> {
    columns: Cols
    options?(ctx: TableOptionsCtx<Cols>): void
}

type Prettify<T> = { [K in keyof T]: T[K] } & {}

export type EntitySelect<Cols extends TableColumns> = Prettify<{
    [Key in keyof Cols]: Cols[Key]['$type']['select']
}>

export type EntityInsert<Cols extends TableColumns> = Prettify<{
    [Key in keyof Cols]: Cols[Key]['$type']['insert']
}>

export type EntityUpdate<Cols extends TableColumns> = Prettify<{
    [Key in keyof Cols]: Cols[Key]['$type']['update']
}>

export interface TableState<Cols extends TableColumns = TableColumns> {
    readonly columns: { [Key in keyof Cols]: Cols[Key] }
    readonly rawColumns: Record<string, ColumnState>

    unique: { name: string; cols: string[]; conflict: UniqueConflict }[]
    primaryKey: { cols: string[] }[]
    index: { name: string; cols: string[] }[]
    uniqueIndex: { name: string; cols: string[] }[]
    checks: CheckExpression[]
    withoutRowId: boolean

    readonly $inferSelect: EntitySelect<Cols>
    readonly $inferInsert: EntityInsert<Cols>
    readonly $inferUpdate: EntityUpdate<Cols>

    toSelectSchema(): Schema<EntitySelect<Cols>>
    toInsertSchema(): Schema<EntityInsert<Cols>>
    toUpdateSchema(): Schema<EntityUpdate<Cols>>
}
