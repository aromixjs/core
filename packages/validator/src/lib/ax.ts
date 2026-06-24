import { PrimitiveSchema, Schema } from './schema'
import type { AnySchema, Ctor, Primitives } from './types'

export const ax = {
	string() {
		return new PrimitiveSchema<{
			base: string
			select: string
			insert: string
			update: string
		}>({
			type: 'string',
			modifiers: {
				convert: false,
				partial: false,
			},
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
			modifiers: {
				convert: false,
				partial: false,
			},
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
			modifiers: {
				convert: false,
				partial: false,
			},
		})
	},

	bigInt() {
		return new PrimitiveSchema<{
			base: bigint
			select: bigint
			insert: bigint
			update: bigint
		}>({
			type: 'bigInt',
			modifiers: {
				convert: false,
				partial: false,
			},
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
			modifiers: {
				convert: false,
				partial: false,
			},
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
			modifiers: {
				convert: false,
				partial: false,
			},
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
			modifiers: {
				convert: false,
				partial: false,
			},
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
			modifiers: {
				convert: false,
				partial: false,
			},
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
			modifiers: {
				convert: false,
				partial: false,
			},
		})
	},

	object<Shape extends Record<string, AnySchema>>(shape: Shape) {
		return new Schema<{
			base: { [Key in keyof Shape]: Shape[Key]['$base'] }
			select: { [Key in keyof Shape]: Shape[Key]['$select'] }
			insert: { [Key in keyof Shape]: Shape[Key]['$insert'] }
			update: { [Key in keyof Shape]: Shape[Key]['$update'] }
		}>({
			type: 'object',
			objectShape: shape,
			modifiers: {
				convert: false,
				partial: false,
			},
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
			arrayElement: element,
			modifiers: {
				convert: false,
				partial: false,
			},
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
			tupleItems: items,
			modifiers: {
				convert: false,
				partial: false,
			},
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
			unionItems: options,
			modifiers: {
				convert: false,
				partial: false,
			},
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
			recordElement: value,
			modifiers: {
				convert: false,
				partial: false,
			},
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
			literalValues: values,
			modifiers: {
				convert: false,
				partial: false,
			},
		})
	},

	instance<Class extends Ctor>(classRef: Class) {
		return new Schema({
			type: 'instance',
			instanceClass: classRef,
			modifiers: {
				convert: false,
				partial: false,
			},
		})
	},
}
