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


type EntityType<C> = C extends Chain<infer T, any> ? T : never
type EntityUsed<C> = C extends Chain<any, infer U> ? U : never
type EntityOutput<C> = ColumnTypeMap[EntityType<C>]
type EntityNotNull<C> = 'notNull' extends EntityUsed<C> ? true : false
type EntityAutoInc<C> = 'autoIncrement' extends EntityUsed<C> ? true : false
type EntityHasDefault<C> = 'default' extends EntityUsed<C> ? true : 'defaultFn' extends EntityUsed<C> ? true : false

type EntitySelectNotNull<C> = EntityNotNull<C> extends true ? true : EntityHasDefault<C> extends true ? true : false

type EntityRequiredForInsert<C> = EntityNotNull<C> extends true ? (EntityHasDefault<C> extends true ? false : true) : false

type EntitySelect<State> = {
    [K in keyof State]: EntitySelectNotNull<State[K]> extends true ? EntityOutput<State[K]> : EntityOutput<State[K]> | null
}

type EntityInsert<State> = {
    [K in keyof State as EntityAutoInc<State[K]> extends true ? never : K]: EntityRequiredForInsert<State[K]> extends true ? EntityOutput<State[K]> : EntityOutput<State[K]> | undefined
}

type EntityUpdate<State> = {
    [K in keyof State]: EntityOutput<State[K]> | undefined
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
