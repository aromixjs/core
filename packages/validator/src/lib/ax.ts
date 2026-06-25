import { ObjectSchema, PrimitiveSchema, Schema } from './schema'
import type { AnySchema, Ctor, OmitNeverKeys, Primitives } from './types'

export const ax = {
	string() {
		return new PrimitiveSchema<{
			base: string
			select: string
			insert: string
			update: string
		}>({
			type: 'string',
			typeMeta: {},
			modifiers: {},
			accessors: {},
		})
	},

	number() {
		return new PrimitiveSchema<{
			base: number
			select: number
			insert: number
			update: number
		}>({
			type: 'number',
			typeMeta: {},
			modifiers: {},
			accessors: {},
		})
	},

	boolean() {
		return new PrimitiveSchema<{
			base: boolean
			select: boolean
			insert: boolean
			update: boolean
		}>({
			type: 'boolean',
			typeMeta: {},
			modifiers: {},
			accessors: {},
		})
	},

	bigint() {
		return new PrimitiveSchema<{
			base: bigint
			select: bigint
			insert: bigint
			update: bigint
		}>({
			type: 'bigInt',
			typeMeta: {},
			modifiers: {},
			accessors: {},
		})
	},

	symbol() {
		return new Schema<{
			base: symbol
			insert: symbol
			select: symbol
			update: symbol
		}>({
			type: 'symbol',
			typeMeta: {},
			modifiers: {},
			accessors: {},
		})
	},

	null() {
		return new Schema<{
			base: null
			insert: null
			select: null
			update: null
		}>({
			type: 'null',
			typeMeta: {},
			modifiers: {},
			accessors: {},
		})
	},

	undefined() {
		return new Schema<{
			base: undefined
			insert: undefined
			select: undefined
			update: undefined
		}>({
			type: 'undefined',
			typeMeta: {},
			modifiers: {},
			accessors: {},
		})
	},

	unknown() {
		return new Schema<{
			base: unknown
			insert: unknown
			select: unknown
			update: unknown
		}>({
			type: 'unknown',
			typeMeta: {},
			modifiers: {},
			accessors: {},
		})
	},
	never() {
		return new Schema<{
			base: never
			insert: never
			select: never
			update: never
		}>({
			type: 'never',
			typeMeta: {},
			modifiers: {},
			accessors: {},
		})
	},

	object<Shape extends Record<string, AnySchema>>(shape: Shape) {
		return new ObjectSchema<{
			base: { [Key in keyof Shape]: Shape[Key]['$base'] }
			select: OmitNeverKeys<Shape, '$select'>
			insert: OmitNeverKeys<Shape, '$insert'>
			update: OmitNeverKeys<Shape, '$update'>
		}>({
			type: 'object',
			typeMeta: {
				objectShape: shape,
			},
			modifiers: {},
			accessors: {},
		})
	},

	array<Element extends AnySchema>(element: Element) {
		return new Schema<{
			base: Element['$base'][]
			select: Element['$select'][]
			insert: Element['$insert'][]
			update: Element['$update'][]
		}>({
			type: 'array',
			typeMeta: {
				arrayElement: element,
			},
			modifiers: {},
			accessors: {},
		})
	},

	tuple<Items extends readonly AnySchema[]>(items: Items) {
		return new Schema<{
			base: { [Key in keyof Items]: Items[Key]['$base'] }
			select: { [Key in keyof Items]: Items[Key]['$select'] }
			insert: { [Key in keyof Items]: Items[Key]['$insert'] }
			update: { [Key in keyof Items]: Items[Key]['$update'] }
		}>({
			type: 'tuple',

			typeMeta: {
				tupleItems: items,
			},
			modifiers: {},
			accessors: {},
		})
	},

	union<Options extends readonly AnySchema[]>(options: Options) {
		return new Schema<{
			base: Options[number]['$base']
			select: Options[number]['$select']
			insert: Options[number]['$insert']
			update: Options[number]['$update']
		}>({
			type: 'union',
			typeMeta: {
				unionItems: options,
			},
			modifiers: {},
			accessors: {},
		})
	},

	record<Value extends AnySchema>(value: Value) {
		return new Schema<{
			base: Record<string, Value['$base']>
			select: Record<string, Value['$select']>
			insert: Record<string, Value['$insert']>
			update: Record<string, Value['$update']>
		}>({
			type: 'record',
			typeMeta: {
				recordElement: value,
			},
			modifiers: {},
			accessors: {},
		})
	},

	literals<Values extends readonly Primitives[]>(...values: Values) {
		return new Schema<{
			base: Values[number]
			select: Values[number]
			insert: Values[number]
			update: Values[number]
		}>({
			type: 'literals',
			typeMeta: {
				literalValues: values,
			},
			modifiers: {},
			accessors: {},
		})
	},

	instance<Class extends Ctor>(classRef: Class) {
		return new Schema({
			type: 'instance',
			typeMeta: {
				instanceClass: classRef,
			},
			modifiers: {},
			accessors: {},
		})
	},
}
