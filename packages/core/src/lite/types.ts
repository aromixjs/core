import type { Operator } from '@aromix/validator'

// ── Column type system ─────────────────────────────────────────────────────────

export interface ColumnTypeMap {
    int: number
    real: number
    text: string
    blob: Uint8Array
}

export type ColumnType = keyof ColumnTypeMap

export type UniqueConflict = 'conflict:error' | 'conflict:replace' | 'conflict:ignore'
export type Collation = 'binary' | 'nocase' | 'rtrim'

export type ReferenceAction =
    | 'delete:noAction'
    | 'update:noAction'
    | 'delete:restrict'
    | 'update:restrict'
    | 'delete:cascade'
    | 'update:cascade'
    | 'delete:setNull'
    | 'update:setNull'
    | 'delete:setDefault'
    | 'update:setDefault'

export interface CheckEntry {
    op: 'gt' | 'gte' | 'lt' | 'lte' | 'minLength' | 'maxLength'
    val: number
}

export interface ColumnReference {
    entityName: string
    columnName: string
    tableState: Record<string, ColumnState>
}

export interface ColumnState {
    colType: ColumnType
    primaryKey: boolean
    autoIncrement: boolean
    notNull: boolean
    unique: boolean
    uniqueConflict: UniqueConflict
    index: boolean
    checks: CheckEntry[]
    in: string[]
    collate?: Collation
    references?: { col: ColumnReference; actions: ReferenceAction[] }
    default?: unknown
    defaultFn?: () => unknown
    onUpdate?: () => unknown
    pipes: Operator<any, any>[]
}

// ── Chain (user-facing column builder type) ────────────────────────────────────

export type Chain<Type extends ColumnType, Used extends string = never, NotNull extends boolean = false, AutoInc extends boolean = false, Output = ColumnTypeMap[Type]> = 
    { readonly state: ColumnState } & Omit<
        {
            primaryKey(): Chain<Type, Used | 'primaryKey', true, AutoInc, Output>
            autoIncrement(): Chain<Type, Used | 'autoIncrement', NotNull, true, Output>
            notNull(): Chain<Type, Used | 'notNull', true, AutoInc, Output>
            unique(conflict?: UniqueConflict): Chain<Type, Used | 'unique', NotNull, AutoInc, Output>
            index(): Chain<Type, Used | 'index', NotNull, AutoInc, Output>
            collate(value: Collation): Chain<Type, Used | 'collate', NotNull, AutoInc, Output>
            gt(value: number): Chain<Type, Used, NotNull, AutoInc, Output>
            gte(value: number): Chain<Type, Used, NotNull, AutoInc, Output>
            lt(value: number): Chain<Type, Used, NotNull, AutoInc, Output>
            lte(value: number): Chain<Type, Used, NotNull, AutoInc, Output>
            minLength(value: number): Chain<Type, Used, NotNull, AutoInc, Output>
            maxLength(value: number): Chain<Type, Used, NotNull, AutoInc, Output>
            in(values: string[]): Chain<Type, Used | 'in', NotNull, AutoInc, Output>
            references(col: unknown, actions?: ReferenceAction[]): Chain<Type, Used | 'references', NotNull, AutoInc, Output>
            default(value: Output): Chain<Type, Used | 'default', NotNull, AutoInc, Output>
            defaultFn(fn: () => Output): Chain<Type, Used | 'defaultFn', NotNull, AutoInc, Output>
            onUpdate(fn: () => Output): Chain<Type, Used | 'onUpdate', NotNull, AutoInc, Output>
            pipe<Next>(operator: Operator<Output, Next>): Chain<Type, Used, NotNull, AutoInc, Next>
        },
        Used
    >

// ── Context (table-level constraint DSL) ───────────────────────────────────────

export interface CheckExpression {
    left: string
    op: 'gt' | 'gte' | 'lt' | 'lte'
    right: string
}

export interface TableOptionsCtx<ColName extends string = string> {
    unique(cols: ColName[], conflict?: UniqueConflict): void
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
