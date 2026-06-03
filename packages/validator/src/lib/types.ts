export interface AxTypeMap {
  string: string
  number: number
  boolean: boolean
  bigint: bigint
  symbol: symbol
  null: null
  undefined: undefined
  unknown: unknown
  never: never
  object: Record<string, unknown>
  array: unknown[]
  tuple: unknown[]
  literal: string | number | boolean | bigint | null
  record: Record<string, unknown>
  union: unknown
}

export type AxType = keyof AxTypeMap



export interface State {
  type: AxType
  object?: { shape: Record<string, Schema> }
  array?: { element: Schema }
  tuple?: { elements: Schema[] }
  literal?: { value: string | number | boolean | bigint | null }
  record?: { value: Schema }
  union?: { schemas: Schema[] }
}

export interface Schema<Output = unknown> {
  readonly $infer: Output
  state: State
  meta(): Readonly<State>
  parse(value: unknown): Output
}

export type Infer<SchemaType extends Schema> = SchemaType['$infer']


export type AxInput = {
  type: AxType
  object?: { shape: Record<string, Schema> }
  array?: { element: Schema }
  tuple?: { elements: Schema[] }
  literal?: { value: string | number | boolean | bigint | null }
  record?: { value: Schema }
  union?: { schemas: Schema[] }
}

export type Chain<Output> = Schema<Output>