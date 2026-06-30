export type Types = 'string' | 'number' | 'boolean' | 'bigInt' | 'symbol' | 'null' | 'undefined' | 'unknown' | 'never' | 'object' | 'array' | 'tuple' | 'union' | 'record' | 'literals' | 'instance'
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

export interface SchemaState {
	type: Types
	meta: Partial<{
		objectShape: Record<string, AnySchema>
		arrayElement: AnySchema
		tupleItems: readonly AnySchema[]
		unionItems: readonly AnySchema[]
		recordElement: AnySchema
		literalValues: readonly Primitives[]
		instanceClass: Ctor
	}>
	modifiers: Partial<{
		convert: boolean
		partial: boolean
		default: any
		defaultFn: Function
		nullable: boolean
		optional: boolean
		nullish: boolean
		pipes: Array<any>
		access: any
	}>
	accessors: Partial<{
		readonlyValue: any
		readonlyFn: Function
		locked: boolean
		hidden: boolean
	}>
}

export type Primitives = string | number | boolean | bigint | null | undefined

export type Ctor = new (...args: any) => any

// removes the keys that has value of type never
export type OmitNeverKeys<Shape extends Record<string, AnySchema>, Slot extends keyof AnySchema> = {
	[Key in keyof Shape as Shape[Key][Slot] extends never ? never : Key]: Shape[Key][Slot]
}

export type NarrowerInsert<Insert> = AnySchema & { $insert: Insert }
export type NarrowerUpdate<Update> = AnySchema & { $update: Update }
export type NarrowerSelect<Select> = AnySchema & { $select: Select }

export type Prettify<Obj extends object> = {
	[Key in keyof Obj]: Obj[Key]
} & {}
