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
}

export type AxType = keyof AxTypeMap



export interface State {
  type: AxType
  optional: boolean
  nullable: boolean
  object?: { shape: Record<string, Schema> }
  array?: { element: Schema }
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
}

export type Chain<Output, Used extends string = never> = Omit<{
  optional(): Chain<Output | undefined, Used | 'optional' | 'nullable'>
  nullable(): Chain<Output | null, Used | 'optional' | 'nullable'>
} & Schema<Output>, Used>