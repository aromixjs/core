### FieldDef

One interface for all field kinds. `kind` discriminates.

Computed constraints — always fixed, never changed by chain:

- `valibotSchema` → `undefined`
- `notNull` → `false`
- `default` → `undefined`
- `client.insert` → `false`
- `client.update` → `false`

```ts
export interface FieldDef {
      kind: 'stored' | 'computed'
      valueType: 'string' | 'number' | 'boolean' | 'computed'
      valibotSchema: AnySchema | undefined
      notNull: boolean
      default: unknown
      client: {
            read: boolean
            insert: boolean
            update: boolean
      }
      computeFn: ((row: Record<string, unknown>) => unknown) | undefined
}
```

### KvFieldBuilder

One builder for everything — stored and computed.

```ts
export interface KvFieldBuilder {
      [$def]: FieldDef
      notNull(): KvFieldBuilder
      default(value: unknown): KvFieldBuilder
      client(...ops: ('read' | 'insert' | 'update')[]): KvFieldBuilder
}
```

### FieldMeta

Serializable, no functions. Used by docs and codegen only.

```ts
export interface FieldMeta {
      name: string
      valueType: 'string' | 'number' | 'boolean' | 'computed'
      notNull: boolean
      default: 'none' | 'static' | 'dynamic'
      defaultValue: unknown
      client: { read: boolean; insert: boolean; update: boolean }
      isComputed: boolean
}
```

`defaultValue` is only populated when `default === 'static'`, else `undefined`.

### KvSchemaDescriptor

```ts
export interface KvSchemaDescriptor {
      fields: FieldMeta[]
      schemas: {
            clientInsert: AnyObjectSchema
            clientUpdate: AnyObjectSchema
            clientOutput: AnyObjectSchema
            serverRecord: AnyObjectSchema
      }
      runtime: {
            applyDefaults(input: Record<string, unknown>): Record<string, unknown>
            applyComputed(stored: Record<string, unknown>): Record<string, unknown>
            stripForClient(full: Record<string, unknown>): Record<string, unknown>
      }
}
```

### KvAdapter

```ts
export interface KvAdapter {
      get(key: string): Promise<unknown>
      set(key: string, value: unknown): Promise<void>
      delete(key: string): Promise<void>
      has(key: string): Promise<boolean>
      list(prefix?: string): Promise<string[]>
}
```

### KvStorage

```ts
export interface KvStorage {
      readonly __type: 'kv'
      readonly adapter: KvAdapter
}
```

### EntityDef

```ts
export interface EntityDef {
      name: string
      storage: KvStorage
      schema: KvSchemaDescriptor
}
```

---

## kv-field.ts

Single internal factory used by all four `kv.*` calls.

```ts
function makeBuilder(def: FieldDef): KvFieldBuilder {
      return {
            [$def]: def,

            notNull() {
                  if (def.kind === 'computed') throw new Error('computed fields cannot be notNull')
                  return makeBuilder({ ...def, notNull: true })
            },

            default(value) {
                  if (def.kind === 'computed') throw new Error('computed fields cannot have a default')
                  return makeBuilder({ ...def, default: value })
            },

            client(...ops) {
                  if (def.kind === 'computed') {
                        if (ops.length > 0) throw new Error('computed fields only support .client() with no args')
                        return makeBuilder({ ...def, client: { read: true, insert: false, update: false } })
                  }
                  if (ops.length === 0) {
                        return makeBuilder({ ...def, client: { read: true, insert: true, update: true } })
                  }
                  return makeBuilder({
                        ...def,
                        client: {
                              read: ops.includes('read'),
                              insert: ops.includes('insert'),
                              update: ops.includes('update'),
                        },
                  })
            },
      }
}
```

### kv object

```ts
export const kv = {
      string(): KvFieldBuilder {
            return makeBuilder({
                  kind: 'stored',
                  valueType: 'string',
                  valibotSchema: v.string(),
                  notNull: false,
                  default: undefined,
                  client: { read: false, insert: false, update: false },
                  computeFn: undefined,
            })
      },

      number(): KvFieldBuilder {
            return makeBuilder({
                  kind: 'stored',
                  valueType: 'number',
                  valibotSchema: v.number(),
                  notNull: false,
                  default: undefined,
                  client: { read: false, insert: false, update: false },
                  computeFn: undefined,
            })
      },

      boolean(): KvFieldBuilder {
            return makeBuilder({
                  kind: 'stored',
                  valueType: 'boolean',
                  valibotSchema: v.boolean(),
                  notNull: false,
                  default: undefined,
                  client: { read: false, insert: false, update: false },
                  computeFn: undefined,
            })
      },

      computed(fn: (row: Record<string, unknown>) => unknown): KvFieldBuilder {
            return makeBuilder({
                  kind: 'computed',
                  valueType: 'computed',
                  valibotSchema: undefined,
                  notNull: false,
                  default: undefined,
                  client: { read: false, insert: false, update: false },
                  computeFn: fn,
            })
      },
}
```

---

## kv-schema.ts

```ts
export function kvSchema(shape: Record<string, KvFieldBuilder>): KvSchemaDescriptor
```

### Step 1 — read `[$def]` from every key

Only ever access `builder[$def]`. Nothing else on the builder is read here.

### Step 2 — build `fields[]`

For each `[name, builder]` in shape:

```
name         = name
valueType    = def.valueType
notNull      = def.notNull
isComputed   = def.kind === 'computed'
default      = def.default === undefined          → 'none'
             = typeof def.default === 'function'  → 'dynamic'
             = anything else                      → 'static'
defaultValue = def.default if 'static', else undefined
client       = { ...def.client }
```

### Step 3 — build `schemas`

**`clientInsert`** — stored fields where `client.insert === true`

For each included field:

- required if `notNull === true AND default === undefined`
- optional otherwise — wrap with `v.optional()`

**`clientUpdate`** — stored fields where `client.update === true`

Every field is `v.optional()` regardless of `notNull`.

**`clientOutput`** — fields where `client.read === true`

- stored field → use `def.valibotSchema`
- computed field → use `v.unknown()`

**`serverRecord`** — all stored fields, no computed

- required if `notNull === true AND default === undefined`
- optional otherwise

Build each schema with `v.object({ ... })`.

### Step 4 — build `runtime`

**`applyDefaults(input)`**

For each stored field where `def.default !== undefined`:

```
if input[name] === undefined:
  typeof def.default === 'function'
    → input[name] = def.default()
  else
    → input[name] = def.default
```

Return input (mutate in place or return new object, consistent either way).

**`applyComputed(storedRow)`**

For each field where `kind === 'computed'`:

```
storedRow[name] = def.computeFn(storedRow)
```

Computed fn receives the full stored row. It always runs server-side.
Return storedRow.

**`stripForClient(fullRow)`**

Return a new object with only keys where `client.read === true`.

### Step 5 — startup validation, throw on:

- `shape` has no keys → `'kvSchema requires at least one field'`
- Two entries share a name → impossible via object keys, skip
- `kind === 'computed'` field has `client.insert` or `client.update` set to true
  → `'computed field "{name}" cannot have insert or update access'`
  (guards against manually constructed defs bypassing the builder)

---

## kv-storage.ts

```ts
export function kvStorage(adapter: KvAdapter): KvStorage {
      return { __type: 'kv', adapter }
}
```

No logic. Adapter errors propagate unchanged.

---

## entity.ts

```ts
export function entity(def: EntityDef) {
  const { storage: { adapter }, schema } = def

  async function runOp(key: string, data: Record<string, unknown> | null, op: string) {
    // see per-operation detail below
  }

  return {
    name:   def.name,
    schema: def.schema,

    async get(key)         { ... },
    async insert(key, data){ ... },
    async update(key, data){ ... },
    async upsert(key, data){ ... },
    async delete(key)      { ... },
    async list(prefix?)    { ... },

    forClient() { ... },
  }
}
```

### Operation pipelines

**`get(key)`**

```
1. adapter.get(key)
2. if null/undefined → return null
3. applyComputed(row)
4. stripForClient(row)
5. return
```

**`insert(key, data)`**

```
1. adapter.has(key) → true  → throw ConflictError(key)
2. validate data against schemas.clientInsert
3. applyDefaults(data)
4. validate full record against schemas.serverRecord
5. adapter.set(key, full)
6. applyComputed(full)
7. stripForClient(full)
8. return
```

**`update(key, data)`**

```
1. adapter.has(key) → false → throw NotFoundError(key)
2. validate data against schemas.clientUpdate
3. current = await adapter.get(key)
4. merged  = { ...current, ...data }
5. validate merged against schemas.serverRecord
6. adapter.set(key, merged)
7. applyComputed(merged)
8. stripForClient(merged)
9. return
```

**`upsert(key, data)`**

```
1. validate data against schemas.clientInsert
2. applyDefaults(data)
3. validate full record against schemas.serverRecord
4. adapter.set(key, full)
5. applyComputed(full)
6. stripForClient(full)
7. return
```

**`delete(key)`**

```
1. adapter.has(key) → false → throw NotFoundError(key)
2. adapter.delete(key)
3. return void
```

**`list(prefix?)`**

```
1. adapter.list(prefix)
2. return string[] of keys — no values loaded
```

### forClient()

Returns an object. A method is present only if the schema qualifies:

```
get    → always present
insert → any stored field has client.insert = true
update → any stored field has client.update = true
upsert → any stored field has client.insert = true
delete → never present on client entity
list   → never present on client entity
```

Client methods call the same entity methods internally. No separate pipeline.

---

## errors.ts

```ts
export class ConflictError extends Error {
      readonly code = 'CONFLICT'
      constructor(key: string) {
            super(`record already exists: ${key}`)
      }
}

export class NotFoundError extends Error {
      readonly code = 'NOT_FOUND'
      constructor(key: string) {
            super(`record not found: ${key}`)
      }
}

export class ValidationError extends Error {
      readonly code = 'VALIDATION'
      constructor(public issues: unknown[]) {
            super('validation failed')
      }
}
```
