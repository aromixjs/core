import { Types } from "./types";

export interface SchemaShape {
	base: any
	select: any
	insert: any
	update: any
}
export class Schema<Shape extends SchemaShape> {

	declare $base: Shape['base']
	declare $select: Shape['select']
	declare $insert: Shape['insert']
	declare $update: Shape['update']

	private state: Record<string, any> = {}


	constructor(type: Types) {

	}




	parse() {

	}


	convert() {
		this.state.convert = true
		return this
	}



	readonly(value: Shape['base']) {
		this.state.readonly = value
		return this
	}

	readonlyFn(cb: () => Shape['base']) {
		this.state.readonlyFn = cb
		return this
	}



	access(accessor: Partial<Accessor>) {
		this.state.access = accessor
		return this
	}

}
interface Accessor {
	insert: Schema<any>
	update: Schema<any>
}