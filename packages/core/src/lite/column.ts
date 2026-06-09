import type { Operator } from '@aromix/validator'
import type { Chain } from './types/chain'
import type { Collation, ColumnReference, ColumnState, ColumnType, ColumnTypeMap, ReferenceAction, UniqueConflict } from './types/column'

export class Column<Type extends ColumnType> {
    private constructor(readonly state: ColumnState) {}

    static create<Type extends ColumnType>(colType: Type): Chain<Type> {
        return new Column<Type>({
            colType,
            primaryKey: false,
            autoIncrement: false,
            notNull: false,
            unique: false,
            uniqueConflict: 'conflict:error',
            index: false,
            checks: [],
            in: [],
            pipes: [],
        })
    }

    primaryKey() {
        this.state.primaryKey = true
        return this
    }
    autoIncrement() {
        this.state.autoIncrement = true
        return this
    }
    notNull() {
        this.state.notNull = true
        return this
    }

    unique(conflict: UniqueConflict) {
        this.state.unique = true
        this.state.uniqueConflict = conflict
        return this
    }

    index() {
        this.state.index = true
        return this
    }
    collate(value: Collation) {
        this.state.collate = value
        return this
    }

    gt(value: number) {
        this.state.checks.push({ op: 'gt', val: value })
        return this
    }
    gte(value: number) {
        this.state.checks.push({ op: 'gte', val: value })
        return this
    }
    lt(value: number) {
        this.state.checks.push({ op: 'lt', val: value })
        return this
    }
    lte(value: number) {
        this.state.checks.push({ op: 'lte', val: value })
        return this
    }
    minLength(value: number) {
        this.state.checks.push({ op: 'minLength', val: value })
        return this
    }
    maxLength(value: number) {
        this.state.checks.push({ op: 'maxLength', val: value })
        return this
    }

    in(values: string[]) {
        this.state.in = values
        return this
    }

    references(col: ColumnReference, actions: ReferenceAction[] = []) {
        this.state.references = { col, actions }
        return this
    }

    default(value: ColumnTypeMap[Type]) {
        this.state.default = value
        return this
    }

    defaultFn(fn: () => ColumnTypeMap[Type]) {
        this.state.defaultFn = fn
        return this
    }

    onUpdate(fn: () => ColumnTypeMap[Type]) {
        this.state.onUpdate = fn
        return this
    }

    pipe<Next>(operator: Operator<ColumnTypeMap[Type], Next>) {
        this.state.pipes.push(operator)
        return this
    }
}
