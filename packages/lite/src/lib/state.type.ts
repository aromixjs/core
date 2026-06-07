export interface ColTypeMap {
  int: number
  real: number
  text: string
  blob: Uint8Array
}

export type ColType = keyof ColTypeMap

export type UniqueConflict = 'conflict:error' | 'conflict:replace' | 'conflict:ignore'
export type Collation = 'binary' | 'nocase' | 'rtrim'


export interface CheckEntry {
  op: 'gt',
  val: number
}

export interface DDLState {
  colType: ColType
  primaryKey: boolean
  autoIncrement: boolean
  notNull: boolean
  unique: boolean
  uniqueConflict: UniqueConflict
  index: boolean
  checks: CheckEntry[]
  collate?: Collation
}