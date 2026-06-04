import { AnySchema, Chain, Operator, SchemaState } from './types'

export class Schema<Output> implements AnySchema<Output> {
      declare readonly $infer: Output
      state: SchemaState

      constructor(input: SchemaState) {
            this.state = { ...input }
      }

      default(value: Output): Chain<Output, 'default' | 'defaultFn'> {
            this.state.default = { value }
            
            return this
      }

      defaultFn(fn: () => Output) {
            this.state.defaultFn = { fn }
            return this
      }

      pipe(operators: Operator<Output, Output>[]) {
            this.state.operators = operators
            return this
      }

      parse(value: unknown): Output {
            return value as Output
      }

      meta(): Readonly<SchemaState> {
            return structuredClone(this.state)
      }
}
