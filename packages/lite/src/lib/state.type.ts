import type { Operator } from '@aromix/validator'

export interface ColTypeMap {
      int: number
      real: number
      text: string
      blob: Uint8Array
}

export type ColType = keyof ColTypeMap

export type UniqueConflict = 'conflict:error' | 'conflict:replace' | 'conflict:ignore'
export type Collation = 'binary' | 'nocase' | 'rtrim'

export type ReferenceAction =
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

export interface CheckEntry {
      op: 'gt' | 'gte' | 'lt' | 'lte' | 'minLength' | 'maxLength'
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
      in: string[]
      collate?: Collation
      references?: { col: unknown; actions: ReferenceAction[] }
      default?: unknown | (() => unknown)
      onUpdate?: () => unknown
      pipes: Operator<any, any>[]
}
