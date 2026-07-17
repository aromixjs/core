# `@aromix/lite` — Entity Spec

> Single source of truth for the entity API design.

---

## Core Architecture

The library is split into two layers:

- **`@aromix/lite/core`** — database-agnostic entity engine. Handles the builder, operators, type inference, validate/fields/constraints blocks. Knows nothing about SQL.
- **`@aromix/lite`** — concrete adapters built on top of core. Ships `SqliteEntityBuilder`, and later `PgEntityBuilder`, `MongoEntityBuilder`, `S3EntityBuilder` etc.

Everything — including `notNull`, `nullable`, `unique`, `default` — is an operator. The core has no hardcoded column behavior. All behavior is injected via operators.

---

## Design Principles

- **Everything is an operator.** Built-in modifiers (`notNull`, `nullable`, `unique`) ship as `BuiltInOperators` — an operator group like any other. Nothing is hardcoded into the core.
- **Operators are decoupled.** They live in their own packages or files and are composed at builder creation time.
- **Three independent blocks.** `model` owns DDL structure. `constraints` owns table-level composite rules. `fields` owns JS data lifecycle.
- **Pluggable core.** The same `EntityBuilder` core powers SQLite, PostgreSQL, MongoDB, S3 — only the adapter differs.
- **Explicit over magic.** No derivation, no conventions, no name-matching.

---

## SqliteEntityBuilder

```typescript
import { SqliteEntityBuilder } from '@aromix/lite'
import { BuiltInOperators } from '@aromix/lite/operators'
import { authOperators } from '@aromix/auth'
import { auditOperators } from '@aromix/audit'
import { myOps } from './ops'

export const sqlite = SqliteEntityBuilder({
    adapter(sql: string) {
        return db.prepare(sql).run()
    },
    operators: [
        BuiltInOperators, // notNull, nullable, unique, default, index, collate, references etc.
        authOperators, // hash, userId etc.
        auditOperators, // createdAt, updatedAt etc.
        myOps, // app-level custom operators
    ],
})

// export the bound entity factory
export const { entity } = sqlite
```

`operators` is an array of operator groups. Each group is a plain object of `colOp` definitions. They are merged in order — later groups can override earlier ones.

---

## Operator Groups

An operator group is a plain object of named `colOp` definitions:

```typescript
import { colOp } from '@aromix/lite/core'
import { ax } from '@aromix/validator'

// ops/audit.ts — can live anywhere, ships as a package or local file
export const auditOperators = {
    createdAt: colOp({
        ddl: { type: 'int' },
        fields: {
            insert: ax.number().default(() => Date.now()),
            select: ax.number(),
            update: ax.number().auto(() => Date.now()), // always override
        },
    }),
    updatedAt: colOp({
        ddl: { type: 'int' },
        fields: {
            insert: ax.number().default(() => Date.now()),
            select: ax.number(),
            update: ax.number().auto(() => Date.now()),
        },
    }),
}

// ops/auth.ts
export const authOperators = {
    hash: colOp((algo: 'bcrypt' | 'argon2') => ({
        ddl: { type: 'text' },
        fields: {
            select: ax.string(),
            insert: ax.string().transform((v) => hash(v, algo)),
            update: ax
                .string()
                .transform((v) => hash(v, algo))
                .optional(),
        },
    })),
    userId: colOp({
        ddl: { type: 'int' },
        fields: {
            select: ax.number(),
            insert: ax.number(),
            update: ax.number().optional(),
        },
    }),
}

// ops/roles.ts — app-level
export const myOps = {
    roles: colOp({
        ddl: { type: 'text' },
        fields: {
            select: ax.union([ax.literal('user'), ax.literal('admin')]),
            insert: ax.literal('user'),
            update: ax.union([ax.literal('user'), ax.literal('admin'), ax.undefined()]),
        },
    }),
}
```

### `colOp` signature

```typescript
// no args — fixed behavior
colOp({ ddl, fields })

// with args — parameterized
colOp((arg: T) => ({ ddl, fields }))
```

`ddl` — SQL structure this operator emits.
`fields` — JS data lifecycle for select/insert/update.

---

## BuiltInOperators

Ships with `@aromix/lite/operators`. These are just operators — nothing special about them internally.

```typescript
import { BuiltInOperators } from '@aromix/lite/operators'

// exposes: notNull, nullable, unique, default, index, collate,
//          references, onDelete, onUpdate, generated, primaryKey
```

Since they're operators, if you don't include `BuiltInOperators` you get a bare core with no built-in modifiers. This is intentional — you could replace them entirely with your own.

---

## Entity Definition

```typescript
import { entity } from './db'

export const users = entity({
    name: 'users',

    model: (b) =>
        [
            b.primaryKey('id'),
            b.text('role').notNull().roles(), // notNull from BuiltIn, roles from myOps
            b.text('password').notNull().hash('argon2'),
            b.text('email').unique().notNull(),
            b.text('username').unique().notNull(),
            b.int('score').notNull(),
            b.text('bio').nullable(),
            b.blob('avatar').nullable(),
            b.int('dept_id').references('departments', 'id').onDelete('CASCADE'),
        ]
            .createdAt()
            .updatedAt(), // ← or as standalone columns:

    // alternatively:
    model: (b) => [
        b.primaryKey('id'),
        b.text('role').notNull().roles(),
        b.text('password').notNull().hash('argon2'),
        b.text('email').unique().notNull(),
        b.int('score').notNull(),
        b.text('bio').nullable(),
        b.createdAt(), // standalone column from operator
        b.updatedAt(),
    ],

    constraints: (col, ctx) => [ctx.unique([col.role, col.email]), ctx.index([col.role, col.score]), ctx.checks([col.score.gte(0)])],

    fields: (cols) => [
        cols.bio({ all: ax.string().nullable() }),
        // createdAt, updatedAt handled by their operators
        // role, password handled by their operators
        // score, email — base types sufficient
    ],
})
```

---

## `model` Block

The `model` callback receives a builder `b` whose methods are derived entirely from the registered operators. If `BuiltInOperators` is included, `b` has `.notNull()`, `.nullable()`, `.unique()` etc. If auth operators are included, `b` has `.hash()`, `.userId()`. All are first-class native chains — no difference between built-in and custom.

Column order in the array = column order in `CREATE TABLE`.

### Base column types

These are the only thing hardcoded into the core — the four raw SQL types and primaryKey:

```typescript
b.int('colName')
b.real('colName')
b.text('colName')
b.blob('colName')
b.primaryKey('colName')
```

Everything else (notNull, nullable, unique etc.) comes from operators.

---

## `constraints` Block

Table-level composite constraints. Same as before — nothing changes here.

```typescript
constraints: (col, ctx) => [
    ctx.unique([col.userId, col.slug]),
    ctx.unique([col.userId, col.slug], 'conflict:ignore'),
    ctx.primaryKey([col.tenantId, col.userId]),
    ctx.index([col.userId, col.slug]),
    ctx.uniqueIndex([col.tenantId, col.email]),
    ctx.checks([col.price.gt(col.minPrice), col.startDate.lt(col.endDate)]),
    ctx.withoutRowId(),
]
```

---

## `fields` Block

JS data lifecycle for columns that need it. Sparse — only columns that need custom behavior appear here. Columns handled by their operator (like `createdAt`, `hash`) don't need a `fields` entry.

```typescript
fields: (cols) => [
    cols.role({
        all: ax.union([ax.literal('user'), ax.literal('admin')]),
        insert: ax.literal('user'),
    }),
    cols.email({ all: ax.string() }),
    cols.bio({ all: ax.string().nullable() }),
]
```

### Config — two forms

**Form 1 — `all` shorthand:**

```typescript
cols.role({ all: role, insert: ax.literal('user') })
```

**Form 2 — fully explicit:**

```typescript
cols.role({ select: role, insert: ax.literal('user'), update: ax.union([role, ax.undefined()]) })
```

---

## `ax` Schema Additions Required

The following additions are needed in `@aromix/validator` to support the fields lifecycle:

```typescript
ax.string().nullable() // → Schema<string | null>
ax.string().optional() // → Schema<string | undefined>
ax.string().transform((v) => v.trim()) // → Schema<string>, runs transform in pipeline
ax.string().default('value') // → fills when value is undefined on insert
ax.string().default(() => uuid()) // → fn default, runs before insert
ax.number().auto(() => Date.now()) // → always overrides value regardless of input (onUpdate)
```

These map to new state fields in `SchemaState`:

```typescript
interface SchemaState {
    // existing
    type: string
    operators?: Operator[]
    default?: { value: unknown }
    defaultFn?: { fn: () => unknown }

    // new
    nullable?: boolean // adds | null to output type
    optional?: boolean // adds | undefined to output type
    transform?: { fn: Function } // shorthand for single operator
    auto?: { fn: () => unknown } // always-set, ignores input — used for updatedAt pattern
}
```

---

## Inferred Types

```typescript
type SelectUsers = typeof users.$inferSelect
type InsertUsers = typeof users.$inferInsert
type UpdateUsers = typeof users.$inferUpdate
```

Types come from:

1. Operator `fields.select/insert/update` if the column uses an operator with fields
2. `fields` block override if present
3. Base SQL type map as fallback

---

## Other Adapters (future)

Same core, different adapter:

```typescript
import { PgEntityBuilder } from '@aromix/lite/pg'

export const pg = PgEntityBuilder({
    adapter(sql: string) {
        return pool.query(sql)
    },
    operators: [
        PgBuiltInOperators, // same shape, emits Postgres DDL
        authOperators, // same operator, works across adapters
        auditOperators, // same
        myOps,
    ],
})

export const { entity } = pg
```

Operators are adapter-agnostic by default — the `ddl` part of `colOp` specifies the abstract type (`text`, `int` etc.), and the adapter translates that to its own DDL syntax. Operators that need adapter-specific DDL can check the adapter context.

---

## Full Example

```typescript
// db.ts
import { SqliteEntityBuilder } from '@aromix/lite'
import { BuiltInOperators } from '@aromix/lite/operators'
import { authOperators } from '@aromix/auth'
import { auditOperators } from '@aromix/audit'
import { myOps } from './ops'

export const sqlite = SqliteEntityBuilder({
    adapter: (sql) => d1.prepare(sql).run(),
    operators: [BuiltInOperators, authOperators, auditOperators, myOps],
})

export const { entity } = sqlite

// ops/index.ts
import { colOp } from '@aromix/lite/core'
import { ax } from '@aromix/validator'

const role = ax.union([ax.literal('user'), ax.literal('admin'), ax.literal('moderator')])

export const myOps = {
    roles: colOp({
        ddl: { type: 'text' },
        fields: {
            select: role,
            insert: ax.literal('user'),
            update: ax.union([role, ax.undefined()]),
        },
    }),
}

// users.entity.ts
import { entity } from './db'
import { ax } from '@aromix/validator'

export const users = entity({
    name: 'users',

    model: (b) => [
        b.primaryKey('id'),
        b.text('role').notNull().roles(),
        b.text('password').notNull().hash('argon2'),
        b.text('email').unique().notNull(),
        b.text('username').unique().notNull(),
        b.int('score').notNull(),
        b.text('bio').nullable(),
        b.blob('avatar').nullable(),
        b.int('dept_id').references('departments', 'id').onDelete('CASCADE'),
        b.createdAt(),
        b.updatedAt(),
    ],

    constraints: (col, ctx) => [ctx.unique([col.role, col.email]), ctx.index([col.score]), ctx.checks([col.score.gte(0)])],

    fields: (cols) => [
        cols.email({ all: ax.string() }),
        cols.bio({ all: ax.string().nullable() }),
        // role, password, createdAt, updatedAt handled by operators
    ],
})
```

---

## File Structure

```
packages/
  @aromix/lite/
    core/
      engine.ts          → EntityBuilder core — adapter agnostic
      col.builder.ts     → base column types (int, real, text, blob, pk)
      col.context.ts     → modifier chain interfaces + operator extension
      col.op.ts          → colOp() factory
      constraint.ts      → constraints block (ctx.unique, ctx.index etc.)
      fields.ts          → fields block runner
      infer.ts           → $inferSelect, $inferInsert, $inferUpdate
    operators/
      builtin.ts         → BuiltInOperators (notNull, nullable, unique, default etc.)
    adapters/
      sqlite.ts          → SqliteEntityBuilder
      pg.ts              → PgEntityBuilder (future)
      mongo.ts           → MongoEntityBuilder (future)

  @aromix/auth/
    operators.ts         → authOperators (hash, userId)

  @aromix/audit/
    operators.ts         → auditOperators (createdAt, updatedAt)
```

---

## SQLite Has No Native Type For (handle via operators or fields)

| Need          | How                                                                                     |
| ------------- | --------------------------------------------------------------------------------------- |
| Boolean       | `b.int()` + `fields` with `ax.union([ax.literal(0), ax.literal(1)])` or custom `boolOp` |
| Enum          | custom `colOp` with union literals (like `roles` above)                                 |
| JSON          | custom `colOp` with `ax.string().transform(JSON.stringify)`                             |
| UUID          | custom `colOp` with `ax.string().default(() => crypto.randomUUID())`                    |
| Timestamps    | `auditOperators` — `createdAt`, `updatedAt`                                             |
| Hashed fields | `authOperators` — `hash(algo)`                                                          |

---

## Internal Types

```typescript
// colOp return type
interface ColOp<Args extends any[] = []> {
    (...args: Args): {
        ddl: { type: 'int' | 'real' | 'text' | 'blob' }
        fields?: {
            select?: AnySchema
            insert?: AnySchema
            update?: AnySchema
        }
    }
}

// column definition after builder resolves it
interface ColDef {
    col: string
    type: 'integer' | 'real' | 'text' | 'blob' | 'primaryKey'
    operators: string[] // which operators were applied, in order
    ddlOverride?: Partial<DDLOptions>
    fields?: { select: AnySchema; insert: AnySchema; update: AnySchema }
}

// constraint
type Constraint =
    | { kind: 'unique'; cols: string[]; conflict?: string }
    | { kind: 'primaryKey'; cols: string[] }
    | { kind: 'index'; cols: string[]; unique?: boolean }
    | { kind: 'check'; exprs: CheckExpr[] }
    | { kind: 'withoutRowId' }
```
