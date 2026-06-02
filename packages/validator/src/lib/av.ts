import { AvInput, Chain, Schema, State } from "./types"
import { Validate, ValidationError } from "./validate"
export class av<Output> implements Schema<Output> {

  readonly $infer!: Output
  state: State

  private constructor(options: AvInput) {
    this.state = {
      type: options.type,
      optional: false,
      nullable: false,
      object: options.object,
      array: options.array,
      tuple: options.tuple,
    }
  }

  // Primitives ( Entry point )
  static string(): Chain<string> {
    return new av<string>({ type: 'string' })
  }

  static number(): Chain<number> {
    return new av<number>({ type: 'number' })
  }

  static boolean(): Chain<boolean> {
    return new av<boolean>({ type: 'boolean' })
  }

  static bigint(): Chain<bigint> {
    return new av<bigint>({ type: 'bigint' })
  }

  static symbol(): Chain<symbol> {
    return new av<symbol>({ type: 'symbol' })
  }

  static null(): Chain<null> {
    return new av<null>({ type: 'null' })
  }

  static undefined(): Chain<undefined> {
    return new av<undefined>({ type: 'undefined' })
  }

  static unknown(): Chain<unknown> {
    return new av<unknown>({ type: 'unknown' })
  }

  static never(): Chain<never> {
    return new av<never>({ type: 'never' })
  }


  // Composites ( Entry Point )
  static object<Shape extends Record<string, Schema>>(shape: Shape): Chain<{ [Key in keyof Shape]: Shape[Key]['$infer'] }> {
    return new av<{ [Key in keyof Shape]: Shape[Key]['$infer'] }>({ type: 'object', object: { shape } })
  }

  static array<Element extends Schema>(element: Element): Chain<Element['$infer'][]> {
    return new av<Element['$infer'][]>({ type: 'array', array: { element } })
  }

  static tuple<T extends Schema[]>(elements: [...T]): Chain<{ [K in keyof T]: T[K]['$infer'] }> {
    return new av<{ [K in keyof T]: T[K]['$infer'] }>({ type: 'tuple', tuple: { elements } })
  }


  // Nullability
  optional(): Chain<Output | undefined> {
    this.state.optional = true
    return this
  }

  nullable(): Chain<Output | null> {
    this.state.nullable = true
    return this
  }



  // --- introspection ---
  meta(): Readonly<State> {
    return structuredClone(this.state)
  }


  parse(value: unknown) {
    const issues = new Validate(this.state).run(value)
    if (issues.length > 0) throw new ValidationError(issues)
    return value as Output
  }


}
