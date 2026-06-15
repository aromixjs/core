import { Column, ColumnDefinition, DefaultColumnTypes } from './column.builder.types'
import { Collation, ColumnReference, ColumnState, ColumnType, ReferenceAction, UniqueConflict } from './column.state.type'

export function createColumn<Type extends ColumnType>(colType: Type): Column<ColumnDefinition<Type, DefaultColumnTypes<Type>>> {
    const state: ColumnState = {
        colType,
        primaryKey: false,
        autoIncrement: false,
        notNull: false,
        unique: false,
        uniqueConflict: 'conflict:error',
        index: false,
        checks: [],
        in: [],
    }

    const column = {
        state,

        notNull() {
            state.notNull = true
            return column
        },

        primaryKey() {
            state.primaryKey = true
            state.notNull = true
            return column
        },

        autoIncrement() {
            state.autoIncrement = true
            return column
        },

        unique(conflict: UniqueConflict = 'conflict:error') {
            state.unique = true
            state.uniqueConflict = conflict
            return column
        },

        index() {
            state.index = true
            return column
        },

        collate(value: Collation) {
            state.collate = value
            return column
        },

        gt(value: number) {
            state.checks.push({ op: 'gt', val: value })
            return column
        },
        gte(value: number) {
            state.checks.push({ op: 'gte', val: value })
            return column
        },
        lt(value: number) {
            state.checks.push({ op: 'lt', val: value })
            return column
        },
        lte(value: number) {
            state.checks.push({ op: 'lte', val: value })
            return column
        },

        minLength(value: number) {
            state.checks.push({ op: 'minLength', val: value })
            return column
        },
        maxLength(value: number) {
            state.checks.push({ op: 'maxLength', val: value })
            return column
        },

        in(values: string[]) {
            state.in = values
            return column
        },

        references(col: ColumnReference, actions: ReferenceAction[] = []) {
            state.references = { col, actions }
            return column
        },

        default(value: unknown) {
            state.default = value
            return column
        },

        defaultFn(fn: () => unknown) {
            state.defaultFn = fn
            return column
        },

        onUpdate(fn: () => unknown) {
            state.onUpdate = fn
            return column
        },

        refine(fn: (value: unknown) => unknown) {
            state.refine = fn
            return column
        },
    }

    return column as any
}
