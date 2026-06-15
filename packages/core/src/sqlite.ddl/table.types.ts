import { Schema } from '@aromix/validator'
import { Column, ColumnDefinition } from './column.builder.types'
import { ColumnState, ColumnType, UniqueConflict } from './column.state.type'

export interface CheckExpression {
    left: string
    op: 'gt' | 'gte' | 'lt' | 'lte'
    right: string
}

export type TableColumns = Record<string, Column<ColumnDefinition>>

export type ColumnKey<Cols extends TableColumns> = keyof Cols & string

export interface TableOptionsCtx<Columns extends TableColumns> {
    unique(options: { name: string; cols: ColumnKey<Columns>[]; conflict?: UniqueConflict }): void

    primaryKey(cols: ColumnKey<Columns>[]): void

    index(options: { name: string; cols: ColumnKey<Columns>[] }): void

    uniqueIndex(options: { name: string; cols: ColumnKey<Columns>[] }): void

    checks(exprs: CheckExpression[]): void

    gt(left: ColumnKey<Columns>, right: ColumnKey<Columns>): CheckExpression

    gte(left: ColumnKey<Columns>, right: ColumnKey<Columns>): CheckExpression

    lt(left: ColumnKey<Columns>, right: ColumnKey<Columns>): CheckExpression

    lte(left: ColumnKey<Columns>, right: ColumnKey<Columns>): CheckExpression

    withoutRowId(): void
}

export interface TableInput<Columns extends TableColumns> {
    columns: Columns

    options?(ctx: TableOptionsCtx<Columns>): void
}

type Prettify<Type> = {
    [Key in keyof Type]: Type[Key]
} & {}

export type EntitySelect<Columns extends TableColumns> = Prettify<{
    [Key in keyof Columns]: Columns[Key]['$type']['select']
}>

export type EntityInsert<Columns extends TableColumns> = Prettify<{
    [Key in keyof Columns]: Columns[Key]['$type']['insert']
}>

export type EntityUpdate<Columns extends TableColumns> = Prettify<{
    [Key in keyof Columns]: Columns[Key]['$type']['update']
}>

export interface TableState<Columns extends TableColumns = TableColumns> {
    readonly columns: {
        [Key in keyof Columns]: Columns[Key]
    }

    readonly rawColumns: Record<string, ColumnState>

    unique: {
        name: string
        cols: string[]
        conflict: UniqueConflict
    }[]

    primaryKey: {
        cols: string[]
    }[]

    index: {
        name: string
        cols: string[]
    }[]

    uniqueIndex: {
        name: string
        cols: string[]
    }[]

    checks: CheckExpression[]

    withoutRowId: boolean

    readonly $inferSelect: EntitySelect<Columns>

    readonly $inferInsert: EntityInsert<Columns>

    readonly $inferUpdate: EntityUpdate<Columns>

    toSelectSchema(): Schema<EntitySelect<Columns>>

    toInsertSchema(): Schema<EntityInsert<Columns>>

    toUpdateSchema(): Schema<EntityUpdate<Columns>>
}
