export interface SchemaShape {
	base: any
	select: any
	insert: any
	update: any
}

export interface AnySchema {
	state: SchemaState
	$base: any
	$select: any
	$insert: any
	$update: any
}

export type Types = 'string' | 'number' | 'boolean' | 'bigInt' | 'symbol' | 'null' | 'undefined' | 'unknown' | 'never' | 'object' | 'array' | 'tuple' | 'union' | 'record' | 'literals' | 'instance'

export interface SchemaState {
	type: Types
	objectShape?: Record<string, AnySchema>
	arrayElement?: AnySchema
	tupleItems?: readonly AnySchema[]
	unionItems?: readonly AnySchema[]
	recordElement?: AnySchema
	literalValues?: readonly Primitives[]
	instanceClass?: Ctor
	modifiers: {
		convert: boolean
		partial: boolean
	}
}

export type Primitives = string | number | boolean | bigint | null | undefined

export type Ctor = new (...args: any) => any
