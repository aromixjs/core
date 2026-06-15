import { Collation, ColumnReference, ColumnState, ColumnType, ColumnTypeMap, ReferenceAction, UniqueConflict } from "./column.state.type"

export interface InferTypes<Select = unknown, Insert = unknown, Update = unknown> {
    select: Select
    insert: Insert
    update: Update
}

export type DefaultTypes<Type extends ColumnType> = InferTypes<ColumnTypeMap[Type] | null, ColumnTypeMap[Type] | undefined, ColumnTypeMap[Type] | undefined>

export interface Column<Type extends ColumnType, Types extends InferTypes = DefaultTypes<Type>> {
    readonly state: ColumnState
    readonly $type: Types

    // narrows select: T|null -> T  (still optional on insert unless combined with default-removal below)
    notNull(): Column<Type, InferTypes<NonNullable<Types['select']>, Types['insert'], Types['update']>>

    // primaryKey implies notNull + (if not autoIncrement) required on insert
    primaryKey(): Column<Type, InferTypes<NonNullable<Types['select']>, NonNullable<Types['insert']>, Types['update']>>

    // autoIncrement -> excluded from insert entirely
    autoIncrement(): Column<Type, InferTypes<Types['select'], never, Types['update']>>

    // autoIncrement -> excluded from insert entirely
    autoIncrement(): Column<Type, InferTypes<Types['select'], never, Types['update']>>

    // default/defaultFn -> select becomes non-null, insert stays optional (already is)
    default(value: ColumnTypeMap[Type]): Column<Type, InferTypes<NonNullable<Types['select']>, Types['insert'], Types['update']>>
    defaultFn(fn: () => ColumnTypeMap[Type]): Column<Type, InferTypes<NonNullable<Types['select']>, Types['insert'], Types['update']>>

    onUpdate(fn: () => ColumnTypeMap[Type]): Column<Type, Types>

    // refine — replaces the base type everywhere it appears, preserving null/undefined wrappers
    refine<RefinedOutput extends ColumnTypeMap[Type]>(
        fn: (value: ColumnTypeMap[Type]) => RefinedOutput,
    ): Column<
        Type,
        InferTypes<
            Types['select'] extends null ? RefinedOutput | null : RefinedOutput,
            Types['insert'] extends undefined ? RefinedOutput | undefined : RefinedOutput,
            Types['update'] extends undefined ? RefinedOutput | undefined : RefinedOutput
        >
    >

    unique(conflict?: UniqueConflict): Column<Type, Types>
    index(): Column<Type, Types>
    collate(value: Collation): Column<Type, Types>

    gt(value: number): Column<Type, Types>
    gte(value: number): Column<Type, Types>
    lt(value: number): Column<Type, Types>
    lte(value: number): Column<Type, Types>
    minLength(value: number): Column<Type, Types>
    maxLength(value: number): Column<Type, Types>

    in(values: string[]): Column<Type, Types>

    references(col: ColumnReference, actions?: ReferenceAction[]): Column<Type, Types>
}
