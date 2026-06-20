export type Collate = 'binary' | 'nocase' | 'rtrim'
export type ReferenceRule =
   | 'delete:noAction' | 'update:noAction'
   | 'delete:restrict' | 'update:restrict'
   | 'delete:cascade' | 'update:cascade'
   | 'delete:setNull' | 'update:setNull'
   | 'delete:setDefault' | 'update:setDefault'

export type UniqueConflict = 'conflict:error' | 'conflict:replace' | 'conflict:ignore'

export interface Reference {
   entityName: string
   columnName: string
   tableState: any
   rules: ReferenceRule[]
}
