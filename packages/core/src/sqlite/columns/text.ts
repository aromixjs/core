import { Collate, GeneratedColumn, Reference, ReferenceRule, SortDirection, UniqueConflict } from '../types'

export interface TextState {
    colName: string
    colType: 'TEXT'
    primaryKey: boolean
    primaryKeyDirection: SortDirection
    unique: boolean
    uniqueConflict?: UniqueConflict
    index: boolean
    collate?: Collate
    references?: Reference
    generated?: GeneratedColumn
}

export class TextModifier<const Col extends string> {
    readonly state: TextState

    constructor(col: Col) {
        this.state = {
            colName: col,
            colType: 'TEXT',
            unique: false,
            index: false,
            primaryKey: false,
            primaryKeyDirection: 'asc',
        }
    }

    primaryKey(direction: SortDirection = 'asc') {
        this.state.primaryKey = true
        this.state.primaryKeyDirection = direction
        return this
    }

    unique(conflict: UniqueConflict = 'conflict:error') {
        this.state.unique = true
        this.state.uniqueConflict = conflict
        return this
    }

    collate(option: Collate) {
        this.state.collate = option
        return this
    }
    index() {
        this.state.index = true
        return this
    }

    references(ref: Reference, rules: ReferenceRule[] = []) {
        this.state.references = {
            entityName: ref.entityName,
            columnName: ref.columnName,
            tableState: ref.tableState,
            rules: rules,
        }
        return this
    }

    generated(expression: string, storage: GeneratedColumn['storage'] = 'virtual') {
        this.state.generated = { expression, storage }
        return this
    }
}
