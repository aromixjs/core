export interface AvTypeMap {
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
}

export type AvType = keyof AvTypeMap



export interface State {
  type: AvType
  optional: boolean
  nullable: boolean
  object?: { shape: Record<string, Schema> }
  array?: { element: Schema }
  tuple?: { elements: Schema[] }
}

export interface Schema<Output = unknown> {
  readonly $infer: Output
  state: State
  meta(): Readonly<State>
  parse(value: unknown): Output
}

export type Infer<SchemaType extends Schema> = SchemaType['$infer']


export type AvInput = {
  type: AvType
  object?: { shape: Record<string, Schema> }
  array?: { element: Schema }
  tuple?: { elements: Schema[] }
}

export type Chain<Output, Used extends string = never> = Omit<{
  optional(): Chain<Output | undefined, Used | 'optional' | 'nullable'>
  nullable(): Chain<Output | null, Used | 'optional' | 'nullable'>
} & Schema<Output>, Used>