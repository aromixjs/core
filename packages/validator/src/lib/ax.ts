import { ObjectSchema, PrimitiveSchema, Schema } from './schema'
import type { AnySchema, Ctor, OmitNeverKeys, Prettify, Primitives } from './types'

export const ax = {
	string() {
		return new PrimitiveSchema<{
			base: string
			select: string
			insert: string
			update: string
		}>({
			type: 'string',
			meta: {},
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
			meta: {},
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
			meta: {},
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
			meta: {},
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
			meta: {},
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
			meta: {},
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
			meta: {},
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
			meta: {},
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
			meta: {},
			modifiers: {},
			accessors: {},
		})
	},

	object<Shape extends Record<string, AnySchema>>(shape: Shape) {
		return new ObjectSchema<{
			base: Prettify<{ [Key in keyof Shape]: Shape[Key]['$base'] }>
			select: Prettify<OmitNeverKeys<Shape, '$select'>>
			insert: Prettify<OmitNeverKeys<Shape, '$insert'>>
			update: Prettify<OmitNeverKeys<Shape, '$update'>>
		}>({
			type: 'object',
			meta: {
				objectShape: shape,
			},
			modifiers: {},
			accessors: {},
		})
	},

	array<Element extends AnySchema>(element: Element) {
		return new Schema<{
			base: Prettify<Element['$base']>[]
			select: Prettify<Element['$select']>[]
			insert: Prettify<Element['$insert']>[]
			update: Prettify<Element['$update']>[]
		}>({
			type: 'array',
			meta: {
				arrayElement: element,
			},
			modifiers: {},
			accessors: {},
		})
	},

	tuple<Items extends readonly AnySchema[]>(items: Items) {
		return new Schema<{
			base: Prettify<{ [Key in keyof Items]: Items[Key]['$base'] }>
			select: Prettify<{ [Key in keyof Items]: Items[Key]['$select'] }>
			insert: Prettify<{ [Key in keyof Items]: Items[Key]['$insert'] }>
			update: Prettify<{ [Key in keyof Items]: Items[Key]['$update'] }>
		}>({
			type: 'tuple',

			meta: {
				tupleItems: items,
			},
			modifiers: {},
			accessors: {},
		})
	},

	union<Options extends readonly AnySchema[]>(options: Options) {
		return new Schema<{
			base: Prettify<Options[number]['$base']>
			select: Prettify<Options[number]['$select']>
			insert: Prettify<Options[number]['$insert']>
			update: Prettify<Options[number]['$update']>
		}>({
			type: 'union',
			meta: {
				unionItems: options,
			},
			modifiers: {},
			accessors: {},
		})
	},

	record<Value extends AnySchema>(value: Value) {
		return new Schema<{
			base: Prettify<Record<string, Value['$base']>>
			select: Prettify<Record<string, Value['$select']>>
			insert: Prettify<Record<string, Value['$insert']>>
			update: Prettify<Record<string, Value['$update']>>
		}>({
			type: 'record',
			meta: {
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
			meta: {
				literalValues: values,
			},
			modifiers: {},
			accessors: {},
		})
	},

	instance<Class extends Ctor>(classRef: Class) {
		return new Schema({
			type: 'instance',
			meta: {
				instanceClass: classRef,
			},
			modifiers: {},
			accessors: {},
		})
	},
}
