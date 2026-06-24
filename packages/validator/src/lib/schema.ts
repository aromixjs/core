import { AnySchema, SchemaShape, SchemaState } from './types'

export class Schema<Shape extends SchemaShape> implements AnySchema {
	declare readonly $base: Shape['base']
	declare readonly $select: Shape['select']
	declare readonly $insert: Shape['insert']
	declare readonly $update: Shape['update']

	constructor(readonly state: SchemaState) {}
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
