export type AxType =
  | 'string' | 'number' | 'boolean' | 'bigint' | 'symbol'
  | 'null' | 'undefined' | 'unknown' | 'never'
  | 'literal' | 'object' | 'array' | 'tuple' | 'record' | 'union'
  | 'date' | 'instanceof' | 'lazy'
  | 'coerce' | 'operator' | 'merge'

export type Meta = {
  type: AxType

  // error-message overrides
  operatorMessage: string | undefined
  overrideMessage: string | undefined

  // nullability
  optional: boolean
  nullable: boolean
  nullish: boolean

  // literal
  literalValue?: unknown

  // object
  shape?: Record<string, any>
  selectedPicks?: string[]
  selectedOmits?: string[]
  partialKeys?: boolean | string[]
  isRequired?: boolean
  isReadonly?: boolean

  // array / tuple / record
  elementSchema?: any
  itemSchemas?: any[]
  recordKey?: any
  recordValue?: any

  // union
  unionBranches?: any[]

  // date / instanceof / lazy
  classTarget?: new (...args: any[]) => any
  lazyFactory?: () => any

  // coerce / operator
  coercionTarget?: AxType
  operatorFn?: Function

  // pipe / default / merge
  pipeChain?: any[]
  defaultVal?: any
  defaultFn?: () => any
  mergedArray?: any[]
}

export interface SchemaLike {
  readonly $infer: unknown
  metaState: Meta
  meta(): Readonly<Meta>
}

export type Modifiers<Used extends string = never> = Omit<SchemaLike & {
  message(msg: string): Modifiers<Used | 'message'>

  optional(): Modifiers<Used | 'optional' | 'nullable' | 'nullish'>
  nullable(): Modifiers<Used | 'optional' | 'nullable' | 'nullish'>
  nullish(): Modifiers<Used | 'optional' | 'nullable' | 'nullish'>

  default(value: any): Modifiers<Used | 'default'>

  pick(keys: string[]): Modifiers<Used | 'pick'>
  omit(keys: string[]): Modifiers<Used | 'omit'>
  partial(keys?: string[]): Modifiers<Used | 'partial'>
  required(): Modifiers<Used | 'required'>
  readonly(): Modifiers<Used | 'readonly'>

  pipe(operator: any): Modifiers<Used>

  parse(value: unknown): unknown
  safeParse(value: unknown): { ok: boolean; value?: unknown; error?: Error; issues?: any[] }
}, Used>
