import type { LiteAdapter } from './adapter'
import { ColumnBuilder } from './column/column'
import type { AnyColumn, ColumnNamesOf } from './column/column.state'
import { ConstrainsBuilder } from './constrain/constrain'
import { ConstrainState } from './constrain/constrain.state'

export interface LiteEntityInput<Fields extends AnyColumn[]> {
	name: string
	adapter: LiteAdapter
	fields: (builder: ColumnBuilder) => Fields
	constrains?: (c: ConstrainsBuilder<ColumnNamesOf<Fields>>) => Array<ConstrainState>
}

export function LiteEntity<const Fields extends AnyColumn[]>(input: LiteEntityInput<Fields>) {
	const builder = new ColumnBuilder()
	const states = input.fields(builder).map((fields) => fields.state)

	const constrainBuilder = new ConstrainsBuilder()
	let constrains: ConstrainState[] = []
	if (input.constrains) {
		constrains = input.constrains(constrainBuilder)
	}



	return input
}

declare const db: LiteAdapter
const userEntity = LiteEntity({
	name: '',
	adapter: db,
	fields: (builder) => [
		builder.text('user').collate('rtrim').index(),
		builder.real('id').primaryKey(),
		builder.blob('image').index(),
		builder.text('userId').references(
			{
				entityName: 'users',
				columnName: 'id',
				tableState: '',
			},
			['delete:cascade', 'update:noAction'],
		),
	],

	constrains: (c) => [
		c.primaryKey(['id', 'user']),
		c.unique(['user', 'userId'], 'conflict:replace'),
		c.foreignKey(['user', 'image'], {
			entityName: 'users',
			columnName: 'test',
			tableState: ''
		}, ['update:noAction'])
	],
})
