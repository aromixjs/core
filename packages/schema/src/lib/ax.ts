import { AxInput, Chain, Schema, State } from "./types"
import { ValidationError, Validator } from "./validator"
export class ax<Output> implements Schema<Output> {

  readonly $infer!: Output
  state: State

  private constructor(options: AxInput) {
    this.state = {
      type: options.type,
      optional: false,
      nullable: false,
      object: options.object,
      array: options.array,
    }
  }

  // Primitives ( Entry point )
  static string(): Chain<string> {
    return new ax<string>({ type: 'string' })
  }

  static number(): Chain<number> {
    return new ax<number>({ type: 'number' })
  }

  static boolean(): Chain<boolean> {
    return new ax<boolean>({ type: 'boolean' })
  }

  static bigint(): Chain<bigint> {
    return new ax<bigint>({ type: 'bigint' })
  }

  static symbol(): Chain<symbol> {
    return new ax<symbol>({ type: 'symbol' })
  }

  static null(): Chain<null> {
    return new ax<null>({ type: 'null' })
  }

  static undefined(): Chain<undefined> {
    return new ax<undefined>({ type: 'undefined' })
  }

  static unknown(): Chain<unknown> {
    return new ax<unknown>({ type: 'unknown' })
  }

  static never(): Chain<never> {
    return new ax<never>({ type: 'never' })
  }


  // Composites ( Entry Point )
  static object<Shape extends Record<string, Schema>>(shape: Shape): Chain<{ [Key in keyof Shape]: Shape[Key]['$infer'] }> {
    return new ax<{ [Key in keyof Shape]: Shape[Key]['$infer'] }>({ type: 'object', object: { shape } })
  }

  static array<Element extends Schema>(element: Element): Chain<Element['$infer'][]> {
    return new ax<Element['$infer'][]>({ type: 'array', array: { element } })
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
    const issues = new Validator(this.state).run(value)
    if (issues.length > 0) throw new ValidationError(issues)
    return value as Output
  }


}
