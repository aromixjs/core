import { Collation, ColumnReference, ColumnState, ColumnType, ColumnTypeMap, ReferenceAction, UniqueConflict } from './column.state.type'

export interface ColumnTypes {
    select: unknown
    insert: unknown
    update: unknown
}

export type DefaultColumnTypes<Type extends ColumnType> = {
    select: ColumnTypeMap[Type] | null
    insert: ColumnTypeMap[Type] | undefined
    update: ColumnTypeMap[Type] | undefined
}

export interface ColumnDefinition<Type extends ColumnType = ColumnType, Types extends ColumnTypes = ColumnTypes> {
    type: Type
    types: Types
}

export interface Column<Definition extends ColumnDefinition = ColumnDefinition> {
    readonly state: ColumnState
    readonly $type: Definition['types']

    notNull(): Column<{
        type: Definition['type']
        types: {
            select: NonNullable<Definition['types']['select']>
            insert: Definition['types']['insert']
            update: Definition['types']['update']
        }
    }>

    primaryKey(): Column<{
        type: Definition['type']
        types: {
            select: NonNullable<Definition['types']['select']>
            insert: NonNullable<Definition['types']['insert']>
            update: Definition['types']['update']
        }
    }>

    autoIncrement(): Column<{
        type: Definition['type']
        types: {
            select: Definition['types']['select']
            insert: never
            update: Definition['types']['update']
        }
    }>

    default(value: ColumnTypeMap[Definition['type']]): Column<{
        type: Definition['type']
        types: {
            select: NonNullable<Definition['types']['select']>
            insert: Definition['types']['insert']
            update: Definition['types']['update']
        }
    }>

    defaultFn(fn: () => ColumnTypeMap[Definition['type']]): Column<{
        type: Definition['type']
        types: {
            select: NonNullable<Definition['types']['select']>
            insert: Definition['types']['insert']
            update: Definition['types']['update']
        }
    }>

    onUpdate(fn: () => ColumnTypeMap[Definition['type']]): Column<Definition>

    refine<RefinedOutput extends ColumnTypeMap[Definition['type']]>(
        fn: (value: ColumnTypeMap[Definition['type']]) => RefinedOutput,
    ): Column<{
        type: Definition['type']
        types: {
            select: Definition['types']['select'] extends null ? RefinedOutput | null : Definition['types']['select'] extends undefined ? RefinedOutput | undefined : RefinedOutput

            insert: Definition['types']['insert'] extends null ? RefinedOutput | null : Definition['types']['insert'] extends undefined ? RefinedOutput | undefined : RefinedOutput

            update: Definition['types']['update'] extends null ? RefinedOutput | null : Definition['types']['update'] extends undefined ? RefinedOutput | undefined : RefinedOutput
        }
    }>

    unique(conflict?: UniqueConflict): Column<Definition>

    index(): Column<Definition>

    collate(value: Collation): Column<Definition>

    gt(value: number): Column<Definition>

    gte(value: number): Column<Definition>

    lt(value: number): Column<Definition>

    lte(value: number): Column<Definition>

    minLength(value: number): Column<Definition>

    maxLength(value: number): Column<Definition>

    in(values: string[]): Column<Definition>

    references(column: ColumnReference, actions?: ReferenceAction[]): Column<Definition>
}
