// AxType:: every schema kind ax knows about
export type AxType = 'string' | 'number' | 'boolean' | 'bigint' | 'symbol' | 'null' | 'undefined' | 'unknown' | 'never' | 'date' | 'object' | 'array' | 'tuple' | 'literal' | 'record' | 'union'

export type LiteralValue = string | number | boolean | bigint | null

export interface Operator<Input, Output> {
      run: (value: Input) => Output
}

export interface AnySchema<Output = unknown> {
      readonly $infer: Output
      parse(value: unknown): Output
      meta(): Readonly<SchemaState>
}

export interface SchemaState {
      type: AxType
      object?: { shape: Record<string, AnySchema> }
      array?: { element: AnySchema }
      tuple?: { elements: AnySchema[] }
      literal?: { value: LiteralValue }
      record?: { value: AnySchema }
      union?: { schemas: AnySchema[] }
      operators?: Operator<any, any>[]
      // modifiers
      default?: { value: any }
      defaultFn?: { fn: () => unknown }
}

// ─────────────────────────────────────────────────────────────────────────────
// Chain — the fluent public interface every ax entry point returns.
//
// The Used phantom generic accumulates every consumed method key.
// Omit<{ all methods }, Used> permanently removes those keys from the surface.
//
// Consumed (call-once):  default, defaultFn (remove each other)
// ─────────────────────────────────────────────────────────────────────────────

export type Chain<Output, Used extends string = never> = Omit<
      {
            readonly $infer: Output
            default(value: Output): Chain<NonNullable<Output>, Used | 'default' | 'defaultFn'>
            defaultFn(fn: () => Output): Chain<NonNullable<Output>, Used | 'default' | 'defaultFn'>
            parse(value: unknown): Output
            meta(): Readonly<SchemaState>
      },
      Used
>
