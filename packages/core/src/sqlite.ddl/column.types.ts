import type { Operator } from '@aromix/validator'
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

export type Chain<Type extends ColumnType, Used extends string = never> = Omit<
    {
        readonly state: ColumnState
        primaryKey(): Chain<Type, Used | 'primaryKey' | 'notNull'>
        autoIncrement(): Chain<Type, Used | 'autoIncrement'>
        notNull(): Chain<Type, Used | 'notNull'>
        unique(conflict: UniqueConflict): Chain<Type, Used | 'unique'>
        index(): Chain<Type, Used | 'index'>
        collate(value: Collation): Chain<Type, Used | 'collate'>
        gt(value: number): Chain<Type, Used>
        gte(value: number): Chain<Type, Used>
        lt(value: number): Chain<Type, Used>
        lte(value: number): Chain<Type, Used>
        minLength(value: number): Chain<Type, Used>
        maxLength(value: number): Chain<Type, Used>
        in(values: string[]): Chain<Type, Used | 'in'>
        references(col: unknown, actions?: ReferenceAction[]): Chain<Type, Used | 'references'>
        default(value: ColumnTypeMap[Type]): Chain<Type, Used | 'default'>
        defaultFn(fn: () => ColumnTypeMap[Type]): Chain<Type, Used | 'defaultFn'>
        onUpdate(fn: () => ColumnTypeMap[Type]): Chain<Type, Used | 'onUpdate'>
        pipe<Next>(operator: Operator<ColumnTypeMap[Type], Next>): Chain<Type, Used>
    },
    Used
>
