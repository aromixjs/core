# Aromix — Blueprint: MongoDB ORM Plugin (`@aromix/mongo`)

**Feature:** `mongoDb()`, `Model<TDoc>`, `MongoDBAdapter`, `ModelDoc<T>`, Query Builder, Sync API  
**Package:** `@aromix/mongo`  
**Status:** Draft — Ready for implementation  
**Depends on:** Blueprint 01 (DI), Blueprint 07 (Plugin System), MongoDB Node Driver  

---

## Purpose & Philosophy
- **MongoDB-Native**: No relational abstractions, no migrations by default. Collections auto-create. Indexes are ensured idempotently.
- **DI-First**: Models are `@provide()` services. Injected via `inject(Model)`. Zero statics, zero global registries.
- **Explicit**: All models passed to plugin. `sync()` never auto-runs. Validation opt-in.
- **Type-Safe**: `ModelDoc<UserModel>` extracts document type at compile-time without `typeof`.
- **Single-Class Surface**: Schema, hooks, repository methods, seeders, and optional sync live in one class.

---

## Public API Surface

### Plugin Registration
```ts
import { make } from '@aromix/core'
import { serve } from 'aromix/node'
import { mongoDb } from '@aromix/mongo'
import { UserModel } from '#models/User'
import { ProductModel } from '#models/Product'

const app = make({
  endpoint: '/api',
  middleware: [requireHttps()],
  namespaces: [UserGroup, ProductGroup],
  plugins: [
    mongoDb({
      uri: process.env.MONGODB_URI!,
      options: { maxPoolSize: 10 },
      models: [UserModel, ProductModel] // Explicit list — required
    })
  ]
})

serve(app).listen(3000, async () => {
  console.log('Ready — models initialized, indexes ensured')
})
```

### Model Definition
```ts
import { provide } from '@aromix/core'
import { Model, ModelDoc } from '@aromix/mongo'

@provide()
export class UserModel extends Model {

  schema() {
    this.defineSchema('users', (field) => {
      field.string('email').unique().notNullable()
      field.string('password').notNullable().maxLength(180)
      field.string('name').nullable()
      field.boolean('active').default(true)
      field.date('createdAt').notNullable()
      field.date('updatedAt').notNullable()
      
      // Indexes (idempotent on startup)
      field.index({ email: 1 }, { unique: true })
      field.index({ createdAt: -1 })
    })
  }

  hooks() {
    this.beforeInsert((ctx) => {
      if (ctx.data.password) ctx.data.password = hash(ctx.data.password)
      ctx.data.createdAt = new Date()
      ctx.data.updatedAt = new Date()
    })
    this.beforeUpdate((ctx) => {
      if (ctx.data.password) ctx.data.password = hash(ctx.data.password)
      ctx.data.updatedAt = new Date()
    })
  }

  // Custom repository methods
  findByEmail(email: string) {
    return this.first({ email })
  }

  // Optional seeder
  async seed() {
    await this.insertMany([
      { email: 'admin@example.com', password: 'admin123', active: true },
      { email: 'demo@example.com', password: 'demo123', active: true }
    ])
  }
}
```

### Type Extraction (No `typeof`)
```ts
import { ModelDoc } from '@aromix/mongo'
import { UserModel } from '#models/User'

type UserDoc = ModelDoc<UserModel>
// { email: string; password: string; name: string | null; active: boolean; createdAt: Date; updatedAt: Date; _id?: string }

const formatUser = (user: UserDoc) => `${user.name ?? 'Anonymous'} <${user.email}>`
```

---

## Plugin Implementation Contract

### `mongoDb(options): AromixPlugin`
```ts
interface MongoOptions {
  uri: string
  options?: MongoClientOptions
  models: Array<new (db: MongoDBAdapter) => Model<any>>
}

function mongoDb(options: MongoOptions): AromixPlugin {
  return {
    name: 'mongo',
    install(app: PluginApp) {
      // 1. Register configured adapter as DI service
      const AdapterConfig = class extends MongoDBAdapter {
        constructor() { super({ uri: options.uri, options: options.options }) }
      }
      ;(AdapterConfig as any).$$token = 'MongoDBAdapter'
      app.addService(AdapterConfig)

      // 2. Register & warm models
      for (const Model of options.models) {
        app.addService(Model)
        inject(Model) // forces constructor → schema() + hooks() + _ensureIndexes()
      }

      // 3. Optional: attach raw collection accessor to ctx
      app.extendCtx('mongo', (rawCtx) => ({
        collection: <T>(name: string) => inject(MongoDBAdapter).collection<T>(name)
      }))
    }
  }
}
```

**Execution Order (per Blueprint 07):**
1. `make()` runs plugin `install()`
2. Adapter registered, models registered & instantiated
3. `make()` continues building dispatch map
4. `serve()` starts server, all models ready

---

## Core Types & Type Inference

```ts
// types.ts
export type FieldType =
  | { type: 'string'; opts?: { notNullable?: boolean; unique?: boolean; maxLength?: number; default?: string } }
  | { type: 'number'; opts?: { notNullable?: boolean; unique?: boolean; default?: number } }
  | { type: 'boolean'; opts?: { notNullable?: boolean; default?: boolean } }
  | { type: 'date'; opts?: { notNullable?: boolean } }
  | { type: 'objectId'; opts?: { notNullable?: boolean } }
  | { type: 'array'; itemType: FieldType; opts?: { notNullable?: boolean } }

export type InferSchema<T extends Record<string, FieldType>> = {
  [K in keyof T]: T[K]['opts']?.notNullable extends true
    ? InferField<T[K]>
    : InferField<T[K]> | null | undefined
}

type InferField<F extends FieldType> =
  F extends { type: 'string' } ? string :
  F extends { type: 'number' } ? number :
  F extends { type: 'boolean' } ? boolean :
  F extends { type: 'date' } ? Date :
  F extends { type: 'objectId' } ? string :
  F extends { type: 'array' } ? InferField<F['itemType']>[] :
  unknown

// The magic helper: extracts TDoc from any Model class
export type ModelDoc<T> = T extends Model<infer D> ? D : never
```

---

## Model Base Class Contract

```ts
export abstract class Model<TDoc = any> {
  // Injected by DI
  constructor(protected readonly db: MongoDBAdapter) {}

  // Internal state (protected)
  protected _collectionName: string = ''
  protected _schemaRegistry: Map<string, FieldType> = new Map()
  protected _hooks: Map<HookType, Function[]> = new Map()
  protected _indexes: Array<{ fields: Record<string, 1|-1>; options?: IndexOptions }> = []

  // === Initialization ===
  protected _initialize(): void {
    this.schema?.()
    this.hooks?.()
    this._ensureIndexes() // async, non-blocking or awaited in plugin
  }

  // === User Overrides ===
  protected schema?(): void
  protected hooks?(): void
  seed?(): Promise<void>

  // === Type Access (Compile-Time) ===
  get schema(): TDoc { return {} as TDoc }

  // === Repository Methods ===
  async create( TDoc): Promise<TDoc & { _id: string }>
  async insertMany(docs: Partial<TDoc>[]): Promise<InsertManyResult>
  async first(filter: Filter<TDoc>): Promise<(TDoc & { _id: string }) | null>
  async find(filter: Filter<TDoc>): Promise<Array<TDoc & { _id: string }>>
  async findById(id: string): Promise<(TDoc & { _id: string }) | null>
  async update(filter: Filter<TDoc>,  Partial<TDoc>): Promise<UpdateResult>
  async updateById(id: string,  Partial<TDoc>): Promise<UpdateResult>
  async delete(filter: Filter<TDoc>): Promise<DeleteResult>
  async deleteById(id: string): Promise<DeleteResult>
  async count(filter: Filter<TDoc>): Promise<number>
  async exists(filter: Filter<TDoc>): Promise<boolean>

  // === Query Builder ===
  query(): QueryBuilder<TDoc>

  // === MongoDB Native ===
  aggregate(pipeline: any[]): Promise<any[]>
  bulkWrite(ops: AnyBulkWriteOperation<TDoc>[]): Promise<BulkWriteResult>
  collection(): Collection<TDoc>
  enableValidation(): Promise<void>

  // === Sync (Opt-In) ===
  async sync(options?: SyncOptions): Promise<SyncStats>
}
```

---

## Schema & Hook System

### `defineSchema` API
```ts
protected defineSchema(name: string, builder: (f: FieldBuilder) => void): void {
  this._collectionName = name
  const registry = this._schemaRegistry
  
  const f: FieldBuilder = {
    string: (n) => new FieldChain<string>(n, { type: 'string', opts: {} }, registry),
    number: (n) => new FieldChain<number>(n, { type: 'number', opts: {} }, registry),
    boolean: (n) => new FieldChain<boolean>(n, { type: 'boolean', opts: {} }, registry),
    date: (n) => new FieldChain<Date>(n, { type: 'date', opts: {} }, registry),
    objectId: (n) => new FieldChain<string>(n, { type: 'objectId', opts: {} }, registry),
    array: (n, type) => new FieldChain<any[]>(n, { type: 'array', itemType: { type }, opts: {} }, registry),
    index: (fields, opts) => this._indexes.push({ fields, options: opts })
  }
  builder(f)
}
```

### Hook Registration
```ts
type HookType = 'beforeInsert' | 'afterInsert' | 'beforeUpdate' | 'afterUpdate' | 'beforeDelete' | 'afterDelete'

interface HookContext<T> {
   Partial<T>
  filter?: Filter<T>
  skip: () => void
}

protected beforeInsert(fn: (ctx: HookContext<TDoc>) => void | Promise<void>): void
protected afterInsert(fn: (ctx: { doc: TDoc & { _id: string } }) => void | Promise<void>): void
// ... same for update/delete
```

---

## Repository & Query Builder

### Query Builder Contract
```ts
interface QueryBuilder<T> {
  where(field: keyof T, op: MongoOperator, value: any): this
  and(filters: Filter<T>[]): this
  or(filters: Filter<T>[]): this
  select<K extends keyof T>(...keys: K[]): QueryBuilder<Pick<T, K>>
  orderBy(field: keyof T, dir: 'asc' | 'desc'): this
  limit(n: number): this
  skip(n: number): this
  
  exec(): Promise<Array<T & { _id: string }>>
  first(): Promise<(T & { _id: string }) | null>
  count(): Promise<number>
  update( Partial<T>): Promise<UpdateResult>
  delete(): Promise<DeleteResult>
}
```

---

## Seeder & Sync API

### Seeder
```ts
// Utility (exported)
export async function seedAll(models: Array<new (db: MongoDBAdapter) => Model<any>>): Promise<void> {
  for (const M of models) {
    const instance = inject(M)
    if (typeof instance.seed === 'function') await instance.seed()
  }
}
```

### Sync Contract
```ts
interface SyncOptions {
  dryRun?: boolean
  applyDefaults?: boolean
  cleanUnknown?: boolean
  batchSize?: number
  onProgress?: (stats: SyncStats) => void
}

interface SyncStats { matched: number; modified: number; skipped: number; errors: number }

interface SyncTransforms<TDoc> {
  [field: string]: (doc: Partial<TDoc>) => any
}

async sync(options: SyncOptions = {}): Promise<SyncStats> {
  // 1. Build aggregation pipeline from _schemaRegistry + syncTransforms()
  // 2. If dryRun: simulate pipeline, return stats without $merge/$out
  // 3. If apply: process in batches using updateMany with pipeline syntax
  // 4. Track stats, retry on failure, respect batchSize
  // 5. Return final SyncStats
}
```

---

## Initialization Flow (Step-by-Step)

```
make({ plugins: [mongoDb({ uri, models: [UserModel] })] })
│
├─ Plugin.install(app)
│   ├─ Register configured MongoDBAdapter via app.addService()
│   ├─ Register UserModel via app.addService()
│   └─ inject(UserModel) → triggers new UserModel(db)
│
├─ UserModel constructor
│   ├─ this._initialize()
│   ├─ this.schema() → captures fields + indexes
│   ├─ this.hooks()  → registers handlers
│   └─ this._ensureIndexes() → db.ensureIndex() (idempotent)
│
├─ make() continues → builds dispatch map
└─ serve().listen() → server ready, DB connected, models warmed
```

## Implementation Phases (Recommended Order)

1. **Types & Inference**: `types.ts`, `ModelDoc<T>`, `InferSchema`
2. **Adapter & Plugin**: `adapter.ts`, `plugin.ts`, DI registration
3. **Model Base**: `model.ts` constructor, `_initialize()`, `_ensureIndexes()`
4. **Schema Builder**: `builder.ts`, proxy capture, field chains
5. **Hook System**: `hooks.ts`, context, execution around DB ops
6. **Repository Methods**: CRUD, `insertMany`, raw `collection()`
7. **Query Builder**: `query.ts`, filter mapping, execution
8. **Sync API**: `sync.ts`, pipeline generation, dry-run, batching
9. **Seeder**: `seed.ts`, `seedAll()` utility
10. **DX Polish**: Module augmentation, error handling, TypeScript strictness checks

---

## Constraints & Rules

| Rule | Reason |
|------|--------|
| **No statics** | DI-native, testable, matches Aromix architecture |
| **Explicit model list** | No auto-scanning, predictable startup, tree-shakeable |
| `sync()` never auto-runs | Prevents unexpected DB writes on startup |
| **Validation opt-in** | MongoDB is schema-flexible by design; strict mode is a choice |
| **Idempotent indexes** | `createIndex()` runs safely every startup; no migration files |
| **`ModelDoc<T>` only** | No `typeof` needed; conditional type extracts generic |
| **Follow Blueprint 07** | `app.addService()`, `inject()`, plugin order, `extendCtx` rules |
| **No N+1 queries** | Query builder & sync use MongoDB aggregation/pipeline syntax |

---

This spec is implementation-ready. Start with Phase 1 (`types.ts` + `ModelDoc<T>`) and move sequentially. Each phase can be tested in isolation before integrating with Aromix's DI + plugin system. When you begin coding, I can provide exact TypeScript signatures and pipeline generation logic for any layer.