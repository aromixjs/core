import { AxType, Meta, Modifiers, SchemaLike } from "./types"

export class ax {
  readonly $infer!: unknown

  metaState: Meta

  // ── Internal ────────────────────────────────────────────────

  private constructor(options: { type: AxType } & Partial<Meta>) {
    this.metaState = {
      operatorMessage: undefined,
      overrideMessage: undefined,
      optional: false,
      nullable: false,
      nullish: false,
      ...options
    }
  }

  // ── Primitives ──────────────────────────────────────────────

  static string(): Modifiers {
    return new ax({ type: 'string' })
  }

  static number(): Modifiers {
    return new ax({ type: 'number' })
  }

  static boolean(): Modifiers {
    return new ax({ type: 'boolean' })
  }

  static bigint(): Modifiers {
    return new ax({ type: 'bigint' })
  }

  static symbol(): Modifiers {
    return new ax({ type: 'symbol' })
  }

  static null(): Modifiers {
    return new ax({ type: 'null' })
  }

  static undefined(): Modifiers {
    return new ax({ type: 'undefined' })
  }

  static unknown(): Modifiers {
    return new ax({ type: 'unknown' })
  }

  static never(): Modifiers {
    return new ax({ type: 'never' })
  }

  // ── Literal ─────────────────────────────────────────────────

  static literal<T extends string | number | boolean | bigint>(value: T): Modifiers {
    return new ax({ type: 'literal', literalValue: value })
  }

  // ── Composite types ─────────────────────────────────────────

  static object(shape: Record<string, SchemaLike>): Modifiers {
    return new ax({ type: 'object', shape })
  }

  static array(schema: SchemaLike): Modifiers {
    return new ax({ type: 'array', elementSchema: schema })
  }

  static tuple(schemas: SchemaLike[]): Modifiers {
    return new ax({ type: 'tuple', itemSchemas: schemas })
  }

  static record(key: SchemaLike, value: SchemaLike): Modifiers {
    return new ax({ type: 'record', recordKey: key, recordValue: value })
  }

  static union(schemas: SchemaLike[]): Modifiers {
    return new ax({ type: 'union', unionBranches: schemas })
  }

  static date(): Modifiers {
    return new ax({ type: 'date' })
  }

  static instanceof(ctor: new (...args: any[]) => any): Modifiers {
    return new ax({ type: 'instanceof', classTarget: ctor })
  }

  static lazy(factory: () => SchemaLike): Modifiers {
    return new ax({ type: 'lazy', lazyFactory: factory })
  }

  // ── Merge ───────────────────────────────────────────────────

  static merge(schemas: SchemaLike[]): Modifiers {
    return new ax({ type: 'merge', mergedArray: schemas })
  }

  // ── Coercions ───────────────────────────────────────────────

  static coerce = {
    string: (): Modifiers => new ax({ type: 'coerce', coercionTarget: 'string' }),
    number: (): Modifiers => new ax({ type: 'coerce', coercionTarget: 'number' }),
    boolean: (): Modifiers => new ax({ type: 'coerce', coercionTarget: 'boolean' }),
    date: (): Modifiers => new ax({ type: 'coerce', coercionTarget: 'date' }),
    bigint: (): Modifiers => new ax({ type: 'coerce', coercionTarget: 'bigint' }),
  }

  // ── Operator factory ────────────────────────────────────────

  static operator(op: { validate: Function; message?: string }): Modifiers {
    return new ax({ type: 'operator', operatorFn: op.validate, operatorMessage: op.message })
  }

  static fail(message?: string, options?: { path?: (string | number)[] }): { _fail: boolean; message?: string; path?: (string | number)[] } {
    return { _fail: true, message, path: options?.path }
  }

  // ── Nullability modifiers ───────────────────────────────────

  optional(): Modifiers {
    this.metaState.optional = true

    return this
  }

  nullable(): Modifiers {
    this.metaState.nullable = true

    return this
  }

  nullish(): Modifiers {
    this.metaState.nullish = true

    return this
  }

  // ── Message override ────────────────────────────────────────

  message(msg: string): Modifiers {
    this.metaState.overrideMessage = msg

    return this
  }

  // ── Default value ───────────────────────────────────────────

  default(valueOrFn: any): Modifiers {
    if (typeof valueOrFn === 'function') {
      this.metaState.defaultFn = valueOrFn
    } else {
      this.metaState.defaultVal = valueOrFn
    }

    return this
  }

  // ── Object modifiers ────────────────────────────────────────

  pick(keys: string[]): Modifiers {
    this.metaState.selectedPicks = keys

    return this
  }

  omit(keys: string[]): Modifiers {
    this.metaState.selectedOmits = keys

    return this
  }

  partial(keys?: string[]): Modifiers {
    this.metaState.partialKeys = keys ?? true

    return this
  }

  required(): Modifiers {
    this.metaState.isRequired = true

    return this
  }

  readonly(): Modifiers {
    this.metaState.isReadonly = true

    return this
  }

  // ── Pipe ────────────────────────────────────────────────────

  pipe(operator: SchemaLike): Modifiers {
    if (!this.metaState.pipeChain) {
      this.metaState.pipeChain = []
    }

    this.metaState.pipeChain.push(operator)

    return this
  }

  // ── Introspection ───────────────────────────────────────────

  meta(): Readonly<Meta> {
    return structuredClone(this.metaState)
  }

  // ── Parsing (stubs — validation not yet implemented) ────────

  parse(value: unknown): unknown {
    return value
  }

  safeParse(value: unknown): { ok: boolean; value?: unknown; error?: Error; issues?: any[] } {
    return { ok: true, value }
  }
}
