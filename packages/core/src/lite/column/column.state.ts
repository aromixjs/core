import type { BaseModifier } from './column'

export type Collate = 'binary' | 'nocase' | 'rtrim'

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
}

export type SqliteColType = 'TEXT' | 'REAL' | 'INT' | 'BLOB'
export interface ColumnState<ColName extends string = string> {
	colName: ColName
	colType: SqliteColType
	primaryKey: boolean
	autoIncrement: boolean
	unique: boolean
	uniqueConflict?: UniqueConflict
	index: boolean
	collate?: Collate
	references?: Reference
	referencesRules: ReferenceRule[]
}

export interface AnyColumn extends BaseModifier<string> {}

export type ColumnNamesOf<Fields extends readonly AnyColumn[]> = Fields[number]['$name']
