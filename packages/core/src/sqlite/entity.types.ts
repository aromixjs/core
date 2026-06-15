import { Schema } from '@aromix/validator'
import { Chain, ColumnReference, ColumnState, ColumnType, ColumnTypeMap, UniqueConflict } from '../sqlite.ddl/column'
import { SqliteAdapter } from './adapter'

export interface CheckExpression {
    left: string
    op: 'gt' | 'gte' | 'lt' | 'lte'
    right: string
}
export interface SqliteEntityOptionsCtx<ColName extends string = string> {
    unique(options: { name: string; cols: ColName[]; conflict: UniqueConflict }): void
    primaryKey(cols: ColName[]): void
    index(options: { cols: ColName[]; name: string }): void
    uniqueIndex(options: { cols: ColName[]; name: string }): void
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
    options?(ctx: SqliteEntityOptionsCtx<keyof State & string>): void
}

export interface SqliteEntityState {
    name: string
    columns: Record<string, ColumnState>
    unique: Array<{
        cols: string[]
        conflict: UniqueConflict
        name: string
    }>
    primaryKey: Array<{
        cols: string[]
    }>
    index: Array<{
        name: string
        cols: string[]
    }>
    uniqueIndex: Array<{
        cols: string[]
        name: string
    }>
    checks: CheckExpression[]
    withoutRowId: boolean
}

type Prettify<T> = { [K in keyof T]: T[K] } & {}

type ColKind<C> = C extends { gt(value: number): Chain<infer T, any> }
    ? T extends ColumnType ? T : never
    : never

type ColTypeOf<C> = ColKind<C> extends ColumnType ? ColumnTypeMap[ColKind<C>] : never

type MethodCalled<C, K extends string> = K extends keyof C ? false : true

type ColIsAutoIncrement<C> = MethodCalled<C, 'autoIncrement'>
type ColIsNotNull<C> = MethodCalled<C, 'notNull'>
type ColHasDefault<C> = MethodCalled<C, 'default'>
type ColHasDefaultFn<C> = MethodCalled<C, 'defaultFn'>

type ColSelectType<C> =
    ColIsNotNull<C> extends true ? ColTypeOf<C>
        : ColHasDefault<C> extends true ? ColTypeOf<C>
            : ColHasDefaultFn<C> extends true ? ColTypeOf<C>
                : ColTypeOf<C> | null

type ColInsertType<C> =
    ColIsAutoIncrement<C> extends true ? never
        : ColIsNotNull<C> extends true
            ? ColHasDefault<C> extends true ? ColTypeOf<C>
                : ColHasDefaultFn<C> extends true ? ColTypeOf<C>
                    : ColTypeOf<C>
            : ColTypeOf<C>

type ColInsertIsOptional<C> =
    ColIsAutoIncrement<C> extends true ? false
        : ColIsNotNull<C> extends true
            ? ColHasDefault<C> extends true ? true
                : ColHasDefaultFn<C> extends true ? true
                    : false
            : true

type ColUpdateType<C> = ColTypeOf<C>

export type EntitySelect<State> = {
    [Key in keyof State]: ColSelectType<State[Key]>
}

export type EntityInsert<State> = Prettify<{
    [Key in keyof State as
        ColInsertType<State[Key]> extends never ? never :
        ColInsertIsOptional<State[Key]> extends true ? never : Key
    ]: ColInsertType<State[Key]>
} & {
    [Key in keyof State as
        ColInsertType<State[Key]> extends never ? never :
        ColInsertIsOptional<State[Key]> extends true ? Key : never
    ]?: ColInsertType<State[Key]>
}>

export type EntityUpdate<State> = {
    [Key in keyof State]?: ColUpdateType<State[Key]>
}

export type Where<State> = {
    [Key in keyof Prettify<EntitySelect<State>>]?: Prettify<EntitySelect<State>>[Key] | WhereOperators<Prettify<EntitySelect<State>>[Key]>
}

export interface WhereOperators<T> {
    eq?: T
    ne?: T
    gt?: T
    gte?: T
    lt?: T
    lte?: T
    in?: T[]
    like?: string
}

export interface PaginateOptions {
    page: number
    pageSize: number
}

export interface PaginateResult<State> {
    data: Prettify<EntitySelect<State>>[]
    total: number
    page: number
    pageSize: number
    totalPages: number
}

export interface SqliteEntityOutput<State> {
    state: SqliteEntityState
    col(columnName: keyof State): ColumnReference
    toSelectSchema(): Schema<Prettify<EntitySelect<State>>>
    toInsertSchema(): Schema<Prettify<EntityInsert<State>>>
    toUpdateSchema(): Schema<Prettify<EntityUpdate<State>>>
    toSql(): string
    readonly $inferSelect: Prettify<EntitySelect<State>>
    readonly $inferInsert: Prettify<EntityInsert<State>>
    readonly $inferUpdate: Prettify<EntityUpdate<State>>

    findById(id: string | number): Promise<Prettify<EntitySelect<State>> | null>
    findOne(filter?: Where<State>): Promise<Prettify<EntitySelect<State>> | null>
    findMany(filter?: Where<State>): Promise<Prettify<EntitySelect<State>>[]>
    count(filter?: Where<State>): Promise<number>
    exist(filter?: Where<State>): Promise<boolean>
    insert(data: Prettify<EntityInsert<State>>): Promise<Prettify<EntitySelect<State>>>
    update(filter: Where<State>, data: Prettify<EntityUpdate<State>>): Promise<Prettify<EntitySelect<State>>[]>
    upsert(data: Prettify<EntityInsert<State>>, conflictColumns?: (keyof State)[]): Promise<Prettify<EntitySelect<State>>>
    delete(filter: Where<State>): Promise<Prettify<EntitySelect<State>>[]>
    deleteById(id: string | number): Promise<Prettify<EntitySelect<State>> | null>
    paginate(filter: Where<State> | undefined, options: PaginateOptions): Promise<Prettify<PaginateResult<State>>>
}
