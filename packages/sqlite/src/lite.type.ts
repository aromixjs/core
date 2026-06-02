export const $meta = Symbol.for('aromix:sqlite:meta')

export type ColType = 'int' | 'real' | 'text' | 'blob' | 'boolean' | 'bigint' | 'date'

export type DateFormat = 'iso' | 'unix-ms'
export interface ColTypeMap {
      int: number
      real: number
      text: string
      blob: Uint8Array
      boolean: boolean
      bigint: bigint
      date: Date
}

export interface Input {
      type: ColType
      dateFormat?: DateFormat
}

export type UniqueConflict = 'conflict:error' | 'conflict:replace' | 'conflict:ignore'

export type Collation = 'binary' | 'nocase' | 'rtrim'

export type ReferenceAction =
      | 'delete:no-action'
      | 'delete:restrict'
      | 'delete:cascade'
      | 'delete:set-null'
      | 'delete:set-default'
      | 'update:no-action'
      | 'update:restrict'
      | 'update:cascade'
      | 'update:set-null'
      | 'update:set-default'

export interface Meta {
      type: ColType
      dateFormat?: DateFormat
      primaryKey: boolean
      autoIncrement: boolean
      notNull: boolean
      unique: boolean
      uniqueConflict?: UniqueConflict
      default?: ColTypeMap[ColType]
      defaultFn?: () => ColTypeMap[ColType]
      onUpdate?: () => ColTypeMap[ColType]
      collate?: Collation
      min?: number
      max?: number
      minLength?: number
      maxLength?: number
      in?: string[]
      references?: {
            col: any
            actions: ReferenceAction[]
      }
      lt?: string
      gt?: string
      lte?: string
      gte?: string

      uniqueWith?: string[]
      uniqueWithConflict?: UniqueConflict
      indexWith?: string[]
      uniqueIndexWith?: string[]
      primaryKeyWith?: string[]
}

export type LiteModel = Record<string, { [$meta]: Meta }>
