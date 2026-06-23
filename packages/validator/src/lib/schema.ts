import { Operator, SchemaState } from './types'

export class Schema<Output> {
	declare readonly $infer: Output
	readonly state: SchemaState
	constructor(input: SchemaState) {
		this.state = input
	}

	default(value: Output) {
		this.state.default = { value }
		return this
	}

	defaultFn(fn: () => Output) {
		this.state.defaultFn = { fn }
		return this
	}

	pipe<Next>(op: Operator<Output, Next>): Schema<Next> {
		if (!this.state.operators) this.state.operators = []
		this.state.operators.push(op)
		return this as any
	}

}
