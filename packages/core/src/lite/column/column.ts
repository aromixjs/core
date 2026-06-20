import type { Collate, ColumnState, Reference, ReferenceRule, UniqueConflict } from './column.state'

export class BaseModifier<Col extends string> {
	readonly state!: ColumnState<Col>
	declare $name: Col

	primaryKey() {
		this.state.primaryKey = true
		return this
	}

	unique(conflict: UniqueConflict = 'conflict:error') {
		this.state.unique = true
		this.state.uniqueConflict = conflict
		return this
	}

	collate(option: Collate) {
		this.state.collate = option
		return this
	}
	index() {
		this.state.index = true
		return this
	}

	references(ref: Reference, rules: ReferenceRule[] = []) {
		this.state.references = {
			entityName: ref.entityName,
			columnName: ref.columnName,
			tableState: ref.tableState,
		}
		this.state.referencesRules = rules
		return this
	}
}

export class IntModifier<Col extends string> extends BaseModifier<Col> {
	readonly state: ColumnState<Col>

	constructor(col: Col) {
		super()
		this.state = {
			colName: col,
			colType: 'INT',
			unique: false,
			index: false,
			primaryKey: false,
			autoIncrement: false,
			referencesRules: [],
		}
	}

	autoIncrement() {
		this.state.autoIncrement = true
		return this
	}
}

export class BlobModifier<Col extends string> extends BaseModifier<Col> {
	readonly state: ColumnState<Col>

	constructor(col: Col) {
		super()
		this.state = {
			colName: col,
			colType: 'BLOB',
			unique: false,
			index: false,
			primaryKey: false,
			autoIncrement: false,
			referencesRules: [],
		}
	}
}

export class RealModifier<Col extends string> extends BaseModifier<Col> {
	readonly state: ColumnState<Col>

	constructor(col: Col) {
		super()
		this.state = {
			colName: col,
			colType: 'REAL',
			unique: false,
			index: false,
			primaryKey: false,
			autoIncrement: false,
			referencesRules: [],
		}
	}
}

export class TextModifier<Col extends string> extends BaseModifier<Col> {
	readonly state: ColumnState<Col>

	constructor(col: Col) {
		super()
		this.state = {
			colName: col,
			colType: 'TEXT',
			unique: false,
			index: false,
			primaryKey: false,
			autoIncrement: false,
			referencesRules: [],
		}
	}
}

export class ColumnBuilder {
	text<Col extends string>(col: Col) {
		return new TextModifier(col)
	}

	int<Col extends string>(col: Col) {
		return new IntModifier(col)
	}
	real<Col extends string>(col: Col) {
		return new RealModifier(col)
	}
	blob<Col extends string>(col: Col) {
		return new BlobModifier(col)
	}
}
