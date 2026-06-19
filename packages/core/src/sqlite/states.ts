export interface ColumnTypeMap {
   Text: string
   Int: number
   Real: number
   Blob: Uint8Array
}
export type ColumnType = keyof ColumnTypeMap
export interface ColumnState<Type extends ColumnType> {
   colName: string,
   colType: Type
   meta: Record<string, unknown>
}
