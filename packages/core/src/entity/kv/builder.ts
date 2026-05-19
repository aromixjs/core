import * as v from 'valibot'
import { evolve, set } from 'remeda'
import { type ClientOp, type FieldDefault, type FieldDef, type KvFieldBuilder, $def } from './types'

class FieldModifier implements KvFieldBuilder {
  readonly [$def]: FieldDef

  constructor(def: FieldDef) {
    this[$def] = def
  }

  private make(def: FieldDef): FieldModifier {
    return new FieldModifier(def)
  }

  notNull() {
    if (this[$def].kind === 'computed')
      throw new Error('computed fields cannot be notNull')
    return this.make(set(this[$def], 'notNull', true))
  }

  default(value: FieldDefault): FieldModifier {
    if (this[$def].kind === 'computed')
      throw new Error('computed fields cannot have a default')
    return this.make(set(this[$def], 'default', value))
  }

  client(ops?: ClientOp[]): FieldModifier {
    if (this[$def].kind === 'computed') {
      if (ops && ops.length > 0)
        throw new Error('computed fields are read-only — call .client() with no args')
      return this.make(set(this[$def], 'client', { read: true, insert: false, update: false }))
    }

    return this.make(set(this[$def], 'client', {
      read:   !ops || ops.includes('read'),
      insert: !ops || ops.includes('insert'),
      update: !ops || ops.includes('update'),
    }))
  }

  computed(fn: (row: Record<string, unknown>) => unknown): FieldModifier {
    return this.make(evolve(this[$def], {
      kind:      () => 'computed' as const,
      computeFn: () => fn,
      notNull:   () => false,
      default:   () => undefined,
      client:    () => ({ read: false, insert: false, update: false }),
    }))
  }
}

class Kv {
  static readonly #CLOSED = { read: false, insert: false, update: false } as const

  string(): FieldModifier {
    return new FieldModifier({
      kind: 'stored', valueType: 'string', valibotSchema: v.string(),
      notNull: false, default: undefined, client: { ...Kv.#CLOSED }, computeFn: undefined,
    })
  }

  number(): FieldModifier {
    return new FieldModifier({
      kind: 'stored', valueType: 'number', valibotSchema: v.number(),
      notNull: false, default: undefined, client: { ...Kv.#CLOSED }, computeFn: undefined,
    })
  }

  boolean(): FieldModifier {
    return new FieldModifier({
      kind: 'stored', valueType: 'boolean', valibotSchema: v.boolean(),
      notNull: false, default: undefined, client: { ...Kv.#CLOSED }, computeFn: undefined,
    })
  }
}

export const kv = new Kv()