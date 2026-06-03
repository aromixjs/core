import { AxInput, Chain, Schema, State } from "./types"
import { Validate, ValidationError } from "./validate"
export class ax<Output> implements Schema<Output> {

  readonly $infer!: Output
  state: State

  private constructor(options: AxInput) {
    this.state = {
      type: options.type,
      object: options.object,
      array: options.array,
      tuple: options.tuple,
      literal: options.literal,
      record: options.record,
      union: options.union,
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

  static tuple<T extends Schema[]>(elements: [...T]): Chain<{ [K in keyof T]: T[K]['$infer'] }> {
    return new ax<{ [K in keyof T]: T[K]['$infer'] }>({ type: 'tuple', tuple: { elements } })
  }

  static literal<T extends string | number | boolean | bigint | null>(value: T): Chain<T> {
    return new ax<T>({ type: 'literal', literal: { value } })
  }

  static record<V extends Schema>(value: V): Chain<Record<string, V['$infer']>> {
    return new ax<Record<string, V['$infer']>>({ type: 'record', record: { value } })
  }

  static union<T extends Schema[]>(schemas: [...T]): Chain<T[number]['$infer']> {
    return new ax<T[number]['$infer']>({ type: 'union', union: { schemas } })
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
