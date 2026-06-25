import { AnySchema, SchemaShape, SchemaState } from './types'

export class Schema<Shape extends SchemaShape> implements AnySchema {
	declare readonly $base: Shape['base']
	declare readonly $select: Shape['select']
	declare readonly $insert: Shape['insert']
	declare readonly $update: Shape['update']
	constructor(readonly state: SchemaState) { }

	default(value: Shape['base']): Schema<{
		base: Shape['base'] | undefined
		insert: Shape['insert'] | undefined
		select: Shape['select'] | undefined
		update: Shape['update'] | undefined
	}> {
		this.state.modifiers.default = value
		return this
	}

	defaultFn(cb: () => Shape['base']): Schema<{
		base: Shape['base'] | undefined
		insert: Shape['insert'] | undefined
		select: Shape['select'] | undefined
		update: Shape['update'] | undefined
	}> {
		this.state.modifiers.defaultFn = cb
		return this
	}

	readonly(value: Shape['base']): Schema<{
		base: Shape['base']
		select: Shape['select']
		insert: never
		update: never
	}> {
		this.state.accessors.readonlyValue = value
		return this as any
	}

	readonlyFn(cb: () => Shape['base']): Schema<{
		base: Shape['base']
		select: Shape['select']
		insert: never
		update: never
	}> {
		this.state.accessors.readonlyFn = cb
		return this as any
	}

	locked(): Schema<{
		base: Shape['base']
		select: Shape['select']
		insert: Shape['insert']
		update: never
	}> {
		this.state.accessors.locked = true
		return this as any
	}

	hidden(): Schema<{
		base: Shape['base']
		select: never
		insert: Shape['insert']
		update: Shape['update']
	}> {
		this.state.accessors.hidden = true
		return this as any
	}

	nullable(): Schema<{
		base: Shape['base'] | null
		insert: Shape['insert'] | null
		select: Shape['select'] | null
		update: Shape['update'] | null
	}> {
		this.state.modifiers.nullable = true
		return this
	}

	optional(): Schema<{
		base: Shape['base'] | undefined
		insert: Shape['insert'] | undefined
		select: Shape['select'] | undefined
		update: Shape['update'] | undefined
	}> {
		this.state.modifiers.optional = true
		return this
	}

	nullish(): Schema<{
		base: Shape['base'] | undefined | null
		insert: Shape['insert'] | undefined | null
		select: Shape['select'] | undefined | null
		update: Shape['update'] | undefined | null
	}> {
		this.state.modifiers.nullish = true
		return this
	}

	pipe<Next>(fn: (value: Shape['base']) => Next): Schema<{
		base: Next
		select: Next
		insert: Next
		update: Next
	}> {
		this.state.modifiers.pipes ??= []
		this.state.modifiers.pipes.push(fn)
		return this
	}
}

export class PrimitiveSchema<Shape extends SchemaShape> extends Schema<Shape> {
	convert() {
		this.state.modifiers.convert = true
		return this
	}
}

export class ObjectSchema<Shape extends SchemaShape> extends Schema<Shape> {
	partial(): ObjectSchema<{
		base: Partial<Shape>
		select: Partial<Shape>
		insert: Partial<Shape>
		update: Partial<Shape>
	}> {
		this.state.modifiers.partial = true
		return this
	}
}
