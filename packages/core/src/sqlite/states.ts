
export interface ColumnTypeMap {
   Text: string
   Int: number
   Real: number
   Blob: Uint8Array
}
export type ColumnType = keyof ColumnTypeMap


export interface ColumnState {
   colName: string,
   colType: ColumnType
   meta: Record<string, unknown>
}
