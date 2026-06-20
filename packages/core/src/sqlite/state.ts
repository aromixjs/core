export interface ColumnTypeMap {
   text: string
   int: number
   real: number
   blob: Uint8Array
}

export type ColumnType = keyof ColumnTypeMap





export type Collate = "nocase" | "rtrim" | "binary"
export interface TextModifierState {
   colName: string,
   colType: 'TEXT'
   unique: boolean
   collate?: Collate
   index: boolean
}


export type ReferenceRule = `${'update' | 'delete'}:${'cascade' | 'restrict' | 'noAction' | 'setNull' | 'setDefault'}`



export interface ReferencedCol {
   colName: string
   tableName: string
   tableState: BaseState[]
}

export interface References {
   colName: string
   tableName: string
   tableState: BaseState[]
   rules: ReferenceRule[]
}
export interface BaseState {
   colName: string
   colType: 'TEXT' | 'INTEGER' | 'REAL' | 'BLOB'
   unique: boolean
   index: boolean
   references?: References
}


