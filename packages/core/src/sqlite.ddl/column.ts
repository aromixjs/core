import { Collation, ColumnReference, ColumnState, ReferenceAction, SqliteType, UniqueConflict } from './column.types'
import { ColumnTransitionMap, ColumnType, ColumnTypeMap } from './type.maps'

export class Column<Type extends ColumnType> {
    readonly state: ColumnState
    declare $type: ColumnTypeMap[Type]

    constructor(colType: Type) {
        this.state = {
            sqliteType: colType.split('.')[0] as SqliteType,
            primaryKey: false,
            autoIncrement: false,
            notNull: false,
            unique: false,
            uniqueConflict: 'conflict:error',
            index: false,
            checks: [],
            in: [],
        }
    }

    notNull(): Column<ColumnTransitionMap['notNull'][Type]> {
        this.state.notNull = true
        return this as any
    }

    primaryKey(): Column<ColumnTransitionMap['notNull'][Type]> {
        this.state.primaryKey = true
        this.state.notNull = true
        return this as any
    }

    autoIncrement(this: Column<Extract<Type, `int.${string}`>>): Column<ColumnTransitionMap['autoIncrement'][Type]> {
        this.state.autoIncrement = true
        return this as any
    }

    default(value: ColumnTypeMap[Type]['select']): Column<ColumnTransitionMap['default'][Type]> {
        this.state.default = value
        return this as any
    }

    defaultFn(fn: () => ColumnTypeMap[Type]['select']): Column<ColumnTransitionMap['default'][Type]> {
        this.state.defaultFn = fn
        return this as any
    }

    onUpdate(fn: () => ColumnTypeMap[Type]['select']): this {
        this.state.onUpdate = fn
        return this
    }

    unique(conflict: UniqueConflict = 'conflict:error'): this {
        this.state.unique = true
        this.state.uniqueConflict = conflict
        return this
    }

    index(): this {
        this.state.index = true
        return this
    }

    collate(value: Collation): this {
        this.state.collate = value
        return this
    }

    gt(value: number): this {
        this.state.checks.push({ op: 'gt', val: value })
        return this
    }

    gte(value: number): this {
        this.state.checks.push({ op: 'gte', val: value })
        return this
    }

    lt(value: number): this {
        this.state.checks.push({ op: 'lt', val: value })
        return this
    }

    lte(value: number): this {
        this.state.checks.push({ op: 'lte', val: value })
        return this
    }

    minLength(value: number): this {
        this.state.checks.push({ op: 'minLength', val: value })
        return this
    }

    maxLength(value: number): this {
        this.state.checks.push({ op: 'maxLength', val: value })
        return this
    }

    in(values: string[]): this {
        this.state.in = values
        return this
    }

    references(col: ColumnReference, actions: ReferenceAction[] = []): this {
        this.state.references = { col, actions }
        return this
    }
}
