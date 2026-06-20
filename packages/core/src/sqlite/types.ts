export type Collate = 'binary' | 'nocase' | 'rtrim'

export type SortDirection = 'asc' | 'desc'

export type ReferenceRule =
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

export type UniqueConflict = 'conflict:error' | 'conflict:replace' | 'conflict:ignore'

export interface Reference {
    entityName: string
    columnName: string
    tableState: any
    rules: ReferenceRule[]
}

export interface GeneratedColumn {
    expression: string
    storage: 'stored' | 'virtual'
}



export interface CompositePrimaryKey {
   kind: 'primaryKey'
   columns: string[]
   direction: SortDirection
}

export interface CompositeUnique {
   kind: 'unique'
   columns: string[]
   conflict: UniqueConflict
}



export interface CompositeForeignKey {
   kind: 'foreignKey'
   columns: string[]
   references: {
      entityName: string
      columnNames: string[]
      tableState: any
   }
   rules: ReferenceRule[]
}

export interface WithoutRowid {
   kind: 'withoutRowid'
}
export type TableConstraint = CompositePrimaryKey | CompositeUnique | CompositeForeignKey | WithoutRowid




