 
export type UniqueConflict = 'conflict:error' | 'conflict:replace' | 'conflict:ignore'
export type Collation = 'binary' | 'nocase' | 'rtrim'



export type ReferenceAction =
    | 'delete:noAction' | 'update:noAction'
    | 'delete:restrict' | 'update:restrict'
    | 'delete:cascade'  | 'update:cascade'
    | 'delete:setNull'  | 'update:setNull'
    | 'delete:setDefault' | 'update:setDefault'

export interface ColumnReference {
    entityName: string
    columnName: string
    tableState: Record<string, ColumnState>
}


export interface ColumnState {
    sqliteType: string
    primaryKey: boolean
    autoIncrement: boolean
    notNull: boolean
    unique: boolean
    uniqueConflict: UniqueConflict
    index: boolean
    collate?: Collation
    references?: { col: ColumnReference; actions: ReferenceAction[] }
    onUpdate?: () => unknown
    validateFn?: (value: unknown) => unknown
}
