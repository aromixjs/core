import { OperatorRecord } from "./operators"

export function EntityBuilder<const Operators extends OperatorRecord>(input: {
   adapter: (sql: string) => Promise<unknown>
   operators: Operators
}) {
   return input
}
