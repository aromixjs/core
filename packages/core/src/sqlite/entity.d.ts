import { Schema } from '@aromix/validator'
import { SqliteAdapter } from './adapter'
import { Chain, ColumnReference, ColumnState, ColumnTypeMap, UniqueConflict } from './ddl/column'

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
    options(ctx: SqliteEntityOptionsCtx<keyof State & string>): void
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


// Each column is Chain<ColumnKind, UsedFlags>, where ColumnKind is the
// SQL type ('int'|'real'|'text'|'blob') and UsedFlags is a union of
// method-call markers like 'notNull'|'default'|'autoIncrement'.

// SELECT → nullable unless notNull, default, or defaultFn was set.
type ResolveSelectType<Column> =
    Column extends Chain<infer ColumnKind, infer UsedFlags>
        ? ColumnTypeMap[ColumnKind] | (
            'notNull' extends UsedFlags ? never
            : 'default' extends UsedFlags ? never
            : 'defaultFn' extends UsedFlags ? never
            : null
        )
        : never

// INSERT → autoIncrement columns are excluded (key becomes never).
//           Required only when notNull AND no default/defaultFn.
type ResolveInsertType<Column> =
    Column extends Chain<infer ColumnKind, infer UsedFlags>
        ? 'autoIncrement' extends UsedFlags ? never
        : ColumnTypeMap[ColumnKind] | (
            'default' extends UsedFlags ? undefined
            : 'defaultFn' extends UsedFlags ? undefined
            : 'notNull' extends UsedFlags ? never
            : undefined
        )
        : never

// UPDATE → every column is optional (partial update).
type ResolveUpdateType<Column> =
    Column extends Chain<infer ColumnKind, any>
        ? ColumnTypeMap[ColumnKind] | undefined
        : never

type EntitySelect<State> = {
    [Key in keyof State]: ResolveSelectType<State[Key]>
}

type EntityInsert<State> = {
    [Key in keyof State as ResolveInsertType<State[Key]> extends never ? never : Key]:
        ResolveInsertType<State[Key]>
}

type EntityUpdate<State> = {
    [Key in keyof State]: ResolveUpdateType<State[Key]>
}



export interface SqliteEntityOutput<State> {
    state: SqliteEntityState
    col(columnName: keyof State): ColumnReference
    toSelectSchema(): Schema<EntitySelect<State>>
    toInsertSchema(): Schema<EntityInsert<State>>
    toUpdateSchema(): Schema<EntityUpdate<State>>
    readonly $inferSelect: EntitySelect<State>
    readonly $inferInsert: EntityInsert<State>
    readonly $inferUpdate: EntityUpdate<State>
}
