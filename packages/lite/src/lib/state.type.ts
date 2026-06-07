export interface ColTypeMap {
  int: number
  real: number
  text: string
  blob: Uint8Array
}

export type ColType = keyof ColTypeMap


export interface DDLState {
  colType: ColType
  primaryKey: boolean
  autoIncrement: boolean
  notNull: boolean
}