export interface TypeMap {
	string: string,
	number: number,
	boolean: boolean,
	bigint: bigint,
	symbol: symbol,
	null: null,
	undefined: undefined,
	unknown: unknown,
	never: never
}
export type Types = keyof TypeMap
export type AxTypes = ['string', 'number', 'boolean', 'bigint', 'symbol', 'null', 'undefined', 'unknown', 'never', 'instance', 'object', 'array', 'tuple', 'literal', 'record', 'union']

export type LiteralValue = string | number | boolean | bigint | null
export interface Operator<Input, Output> {
	run: (value: Input) => Output
}

export interface AnySchema<Output = unknown> {
	readonly $infer: Output
	parse(value: unknown): Output

}

export interface SchemaState {
	type: AxTypes[number]
	object?: { shape: Record<string, AnySchema> }
	array?: { element: AnySchema }
	tuple?: { elements: AnySchema[] }
	literal?: { value: LiteralValue }
	record?: { value: AnySchema }
	union?: { schemas: AnySchema[] }
	instance?: { class: new (...args: any[]) => any }
	operators?: Operator<any, any>[]
	// modifiers
	default?: { value: any }
	defaultFn?: { fn: () => unknown }
}
