import { Collation, ColumnReference, ColumnState, ReferenceAction, UniqueConflict } from "./column.types";

export class Column<Select, Insert, Update> {

    readonly state: ColumnState
    declare readonly $type: { select: Select; insert: Insert; update: Update }



    constructor(sqliteType: string) {
        this.state = {
            sqliteType,
            primaryKey: false,
            autoIncrement: false,
            notNull: false,
            unique: false,
            uniqueConflict: 'conflict:error',
            index: false,
        }
    }

    notNull(): Column<Exclude<Select, null>, Exclude<Insert, null | undefined>, Exclude<Update, null>> {
        this.state.notNull = true
        return this as any
    }
 
    primaryKey(): Column<Exclude<Select, null>, Exclude<Insert, null | undefined>, Exclude<Update, null>> {
        this.state.primaryKey = true
        this.state.notNull = true
        return this as any
    }
 
    autoIncrement(): Column<Select, never, never> {
        this.state.autoIncrement = true
        return this as any
    }
    validate<Out>(fn: (value: Select) => Out): Column<Out, Out, Out> {
        this.state.validateFn = fn as any
        return this as any
    }
 
    onUpdate(fn: () => Select): this {
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
 
    references(col: ColumnReference, actions: ReferenceAction[] = []): this {
        this.state.references = { col, actions }
        return this
    }


}