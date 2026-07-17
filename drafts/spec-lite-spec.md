# `lite` — SQLite DDL Spec

> `@aromix/schema` · `lite` dialect · single source of truth

---

## Design Principles

- **DDL is the source of truth.** Everything that can live in SQL does.
- **1:1 SQLite → TS.** Four column types, mapped directly. No abstractions.
- **One way to do one thing.** No duplicate paths. If it's expressible inline, it stays inline.
- **JS layer is minimal and explicit.** `.default()`, `.onUpdate()`, `.pipe()` are clearly JS-only. Nothing sneaks in.
- **Types come from `toAxSchema()`.** No `$inferSelect` / `$inferInsert` — the ax schema is the type source.
- **Bring your own operators.** Date handling, boolean coercion, UUID generation — all userland via `ax.operator()`.

---

## Column Types

```ts
lite.integer() // INTEGER  → number
lite.real() // REAL     → number
lite.text() // TEXT     → string
lite.blob() // BLOB     → Uint8Array
```

---

## Column Modifiers

### DDL-level — emitted into `CREATE TABLE`

#### `.primaryKey()`

```ts
lite.integer().primaryKey()
// → INTEGER PRIMARY KEY
```

One per table. `INTEGER PRIMARY KEY` aliases the implicit rowid — O(1) PK lookups.

#### `.autoIncrement()`

```ts
lite.integer().primaryKey().autoIncrement()
// → INTEGER PRIMARY KEY AUTOINCREMENT
```

Only valid on `integer().primaryKey()`. Prevents rowid reuse after deletes. Slightly slower — only use if reuse prevention actually matters.

#### `.notNull()`

```ts
lite.text().notNull()
// → TEXT NOT NULL
```

#### `.unique(conflict?)`

```ts
lite.text().unique()
lite.text().unique('conflict:replace')
// → TEXT UNIQUE
// → TEXT UNIQUE ON CONFLICT REPLACE
```

Values: `"conflict:error"` (default) · `"conflict:replace"` · `"conflict:ignore"`

Multiple `NULL` values are always allowed — SQLite NULLs are never equal.

#### `.index()`

```ts
lite.text().index()
// → CREATE INDEX ON table (col)
```

Single-column index. Multi-column indexes go in `.options()` via `ctx.index([])`.

#### `.collate(collation)`

```ts
lite.text().collate('nocase')
// → TEXT COLLATE NOCASE
```

Values: `"binary"` (default) · `"nocase"` (ASCII A-Z only) · `"rtrim"` (trailing whitespace ignored)

#### Value checks — typed, resolve to `CHECK` in DDL

Valid on `integer()` and `real()`:

```ts
lite.integer().gt(0) // CHECK (col > 0)
lite.integer().gte(0) // CHECK (col >= 0)
lite.integer().lt(100) // CHECK (col < 100)
lite.integer().lte(100) // CHECK (col <= 100)
lite.integer().min(0) // CHECK (col >= 0)    alias for .gte()
lite.integer().max(100) // CHECK (col <= 100)  alias for .lte()
```

Valid on `text()`:

```ts
lite.text().minLength(3) // CHECK (length(col) >= 3)
lite.text().maxLength(100) // CHECK (length(col) <= 100)
```

Cross-column comparisons belong in `ctx.checks([])` inside `.options()` where columns are fully typed. Inline check modifiers only accept literal values.

#### `.in(values)`

Enum-style CHECK. Only valid on `text()`.

```ts
lite.text().in(['admin', 'user', 'moderator'])
// → CHECK (col IN ('admin', 'user', 'moderator'))
```

#### `.references(col, actions?)`

Single-column foreign key. For composite FKs see the note in `.options()`.

```ts
lite.integer().references(userEntity.col('id'))
lite.integer().references(userEntity.col('id'), ['delete:cascade'])
lite.integer().references(userEntity.col('id'), ['delete:cascade', 'update:no-action'])
// → INTEGER REFERENCES users(id) ON DELETE CASCADE ON UPDATE NO ACTION
```

`col` is `entity.col("key")` — carries entity name, table name, and column.

Action values:

```
"delete:no-action"    "update:no-action"
"delete:restrict"     "update:restrict"
"delete:cascade"      "update:cascade"
"delete:set-null"     "update:set-null"
"delete:set-default"  "update:set-default"
```

> Foreign keys are disabled in SQLite by default. `Adapter.sqlite()` sets `PRAGMA foreign_keys = ON` on every connection.

---

### JS-layer — not emitted into DDL

#### `.default(value | fn)`

Called before insert when no value is provided. Static value or factory function.

```ts
lite.text().default('draft')
lite.integer().default(0)
lite.text().default(() => crypto.randomUUID())
lite.integer().default(() => Date.now())
```

#### `.onUpdate(fn)`

Called before every update on this row.

```ts
lite.integer().onUpdate(() => Date.now())
lite.text().onUpdate(() => new Date().toISOString())
```

#### `.pipe(operator)`

Runs on **insert and update only**. Accepts an `ax.operator()`. Chains are sequential — each receives the output of the previous. Throwing produces a `ValidationError`.

```ts
import { ax } from '@aromix/validator'

// Validation
age: lite.integer()
    .notNull()
    .pipe(
        ax.operator((v: number) => {
            if (v < 0 || v > 150) throw 'Age out of range'
            return v
        }),
    )

// Transformation — stored value is the transformed result
email: lite.text()
    .notNull()
    .pipe(ax.operator((v: string) => v.toLowerCase().trim()))

// Chained
slug: lite.text()
    .notNull()
    .pipe(ax.operator((v: string) => v.toLowerCase().replace(/\s+/g, '-')))
    .pipe(
        ax.operator((v: string) => {
            if (v.length < 3) throw 'Slug too short'
            return v
        }),
    )
```

The operator's input type must match the column's current TS type (or the output of the previous pipe). TypeScript enforces this.

Pipes do **not** run on select. What's in the DB is what you get back.

---

## Table Options

Table-level constraints and flags that cannot be expressed cleanly on a single column. Passed as a callback to `.options()` — `col` is a fully typed proxy of the model, `ctx` scopes all table-level methods.

```ts
lite.table({
    id: lite.integer().primaryKey().autoIncrement(),
    userId: lite.integer().notNull().references(userEntity.col('id'), ['delete:cascade']),
    slug: lite.text().notNull().collate('nocase'),
    email: lite.text().notNull().unique(),
    price: lite.real().notNull(),
    minPrice: lite.real().notNull(),
    startDate: lite.integer().notNull(),
    endDate: lite.integer().notNull(),
}).options((col, ctx) => [
    ctx.unique([col.userId, col.slug]),
    ctx.unique([col.userId, col.slug], 'conflict:ignore'),
    ctx.primaryKey([col.tenantId, col.userId]),
    ctx.index([col.userId, col.slug]),
    ctx.uniqueIndex([col.tenantId, col.email]),
    ctx.checks([col.price.gt(col.minPrice), col.startDate.lt(col.endDate)]),
    ctx.withoutRowId(),
])
```

### `ctx` methods

| Method                         | SQL emitted                           | When to use                                                            |
| ------------------------------ | ------------------------------------- | ---------------------------------------------------------------------- |
| `ctx.unique([cols])`           | `UNIQUE (a, b)`                       | Composite uniqueness                                                   |
| `ctx.unique([cols], conflict)` | `UNIQUE (a, b) ON CONFLICT ...`       | Composite uniqueness with conflict strategy                            |
| `ctx.primaryKey([cols])`       | `PRIMARY KEY (a, b)`                  | Composite PK — no `.primaryKey()` on columns when using this           |
| `ctx.index([cols])`            | `CREATE INDEX ON table (a, b)`        | Multi-column index                                                     |
| `ctx.uniqueIndex([cols])`      | `CREATE UNIQUE INDEX ON table (a, b)` | Multi-column unique index                                              |
| `ctx.checks([exprs])`          | `CHECK (a > b)`                       | Multi-column CHECK expressions                                         |
| `ctx.withoutRowId()`           | `WITHOUT ROWID`                       | No implicit rowid — requires explicit PK, best for small lookup tables |

### `ctx.checks` — column ref expressions

Inside `ctx.checks([])`, `col.x` returns a typed column reference with comparison methods:

```ts
col.price.gt(col.minPrice) // price > minPrice
col.price.gte(col.minPrice) // price >= minPrice
col.price.lt(col.maxPrice) // price < maxPrice
col.price.lte(col.maxPrice) // price <= maxPrice
```

Both sides are typed — `col.x` only has comparison methods that match its column type. Numeric refs get `gt/gte/lt/lte`, text refs get `lt/lte/gt/gte` for collation-aware ordering.

### Why `ctx.foreignKey()` is not here

SQLite's `FOREIGN KEY (a, b) REFERENCES table(a, b)` composite syntax produces the same enforcement behavior as two separate inline `.references()` calls — SQLite checks them independently either way. There is no behavioral difference. So composite FK via `ctx` would be a second way to do the same thing as inline `.references()`, which violates the one-way rule. Use `.references()` on each column.

---

## `toSQL(tableName)`

Emits the full DDL — `CREATE TABLE` then any `CREATE INDEX` statements.

```ts
const table = lite.table({ ...columns }).options(...)

table.toSQL("posts")
```

```sql
CREATE TABLE IF NOT EXISTS posts (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  userId    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug      TEXT NOT NULL COLLATE NOCASE,
  status    TEXT NOT NULL CHECK (status IN ('draft', 'published', 'archived')),
  score     REAL CHECK (score >= 0),

  CONSTRAINT uq_posts_userId_slug UNIQUE (userId, slug)
);
CREATE INDEX IF NOT EXISTS posts_userId_slug_idx ON posts (userId, slug);
```

Index names auto-generated as `{table}_{cols}_idx` when not explicitly named.

---

## `toAxSchema()`

Derives an `ax` schema from the table definition. This is the type source.

```ts
const table = lite.table({ ...columns }).options(...)

const insertSchema = table.toAxSchema("insert")
const selectSchema = table.toAxSchema("select")

type Insert = typeof insertSchema.$infer
type Select = typeof selectSchema.$infer
```

Each column maps to its corresponding `ax` primitive. `.in(values)` maps to `ax.union` of literals. `.notNull()` determines nullability. Pipes are not included — those run separately at the entity layer.

---

## Computed Columns

> **Not a `lite` feature.** Computed columns are handled at the entity layer in JS — not emitted into DDL at all.
>
> SQLite's `GENERATED` columns are dropped from `lite` because they require referencing sibling columns from inside the same object literal, which TypeScript cannot type. The entity layer solves this after the model is closed, with full type access to all columns.
>
> See `Entity.sqlite()` computed columns spec.

---

## Adapter

```ts
const db = Adapter.sqlite({
    query: (sql) => d1.prepare(sql).run(),
})
```

Receives fully resolved SQL — all bindings already interpolated. Executes and returns. No processing, no options. Driver concerns (WAL, busy timeout, pragmas) are handled inside `query` by the caller.

---

## Entity

```ts
const userTable = lite.table({
    id: lite.integer().primaryKey().autoIncrement(),
    name: lite.text().notNull(),
    email: lite.text().notNull().unique().collate('nocase'),
    role: lite.text().in(['admin', 'user']).default('user'),
    createdAt: lite.integer().default(() => Date.now()),
    updatedAt: lite
        .integer()
        .default(() => Date.now())
        .onUpdate(() => Date.now()),
})

const userEntity = Entity.sqlite({
    name: 'users',
    adapter: db,
    model: userTable,
})
```

`name` → table name. Column keys → column names. No renaming, no snake_case conversion.

### Cross-entity references

```ts
const postTable = lite.table({
    id: lite.integer().primaryKey().autoIncrement(),
    userId: lite.integer().notNull().references(userEntity.col('id'), ['delete:cascade']),
})

const postEntity = Entity.sqlite({
    name: 'posts',
    adapter: db,
    model: postTable,
})
```

`entity.col("key")` returns a typed reference carrying entity name, table name, and column. Parent entity must be defined before child. For circular deps, use a thunk: `() => userEntity.col("id")`.

---

## Sync

Additive only. Runs on every server startup.

1. `CREATE TABLE IF NOT EXISTS` — creates table if missing
2. `ALTER TABLE ADD COLUMN` — adds new columns not yet in the DB
3. `CREATE INDEX IF NOT EXISTS` — creates missing indexes

**Never does:** drop columns · rename columns · change column types · drop indexes · drop tables.

Destructive schema changes are your responsibility — run them manually.

---

## `liteKit` — Internal Types

```ts
liteKit.$meta // symbol — key for column metadata on each lite instance
liteKit.ColType // "integer" | "real" | "text" | "blob"
liteKit.ColTypeMap // maps ColType → TS type
liteKit.UniqueConflict // "conflict:error" | "conflict:replace" | "conflict:ignore"
liteKit.Collation // "binary" | "nocase" | "rtrim"
liteKit.ReferenceAction // "delete:cascade" | "update:cascade" | ...
liteKit.Meta // full column metadata shape
```

### Meta shape

```ts
interface Meta {
    type: ColType
    primaryKey: boolean
    autoIncrement: boolean
    notNull: boolean
    unique: boolean
    uniqueConflict?: UniqueConflict
    index: boolean
    default?: unknown | (() => unknown)
    onUpdate?: () => unknown
    collate?: Collation
    checks?: { op: 'gt' | 'gte' | 'lt' | 'lte' | 'min' | 'max' | 'minLength' | 'maxLength'; val: number }[]
    in?: string[]
    references?: { col: any; actions: ReferenceAction[] }
    pipes: Operator[]
}
```

---

## File Structure

```
src/
  adapter.ts
  lite/
    lite.ts        → column builders + modifier chain + liteKit namespace
  entity/
    entity.def.ts  → Entity.sqlite() + Entity.kv()
    entity.type.ts → inferred types
    entity.util.ts → validate(), pipe runners, sync logic
```

---

## Full Example

```ts
const db = Adapter.sqlite({
    query: (sql) => d1.prepare(sql).run(),
})

const userTable = lite.table({
    id: lite.integer().primaryKey().autoIncrement(),
    email: lite.text().notNull().unique().collate('nocase'),
    role: lite.text().in(['admin', 'user', 'moderator']).default('user'),
    createdAt: lite.integer().default(() => Date.now()),
    updatedAt: lite
        .integer()
        .default(() => Date.now())
        .onUpdate(() => Date.now()),
})

const userEntity = Entity.sqlite({ name: 'users', adapter: db, model: userTable })

const postTable = lite
    .table({
        id: lite.integer().primaryKey().autoIncrement(),
        userId: lite.integer().notNull().references(userEntity.col('id'), ['delete:cascade']),
        slug: lite.text().notNull().collate('nocase'),
        title: lite.text().notNull(),
        body: lite.text(),
        status: lite.text().in(['draft', 'published', 'archived']).notNull().default('draft'),
        score: lite.real().gte(0),
        minScore: lite.real().notNull(),
        createdAt: lite.integer().default(() => Date.now()),
        updatedAt: lite
            .integer()
            .default(() => Date.now())
            .onUpdate(() => Date.now()),
    })
    .options((col, ctx) => [ctx.unique([col.userId, col.slug]), ctx.index([col.userId, col.slug]), ctx.checks([col.score.gte(col.minScore)])])

const postEntity = Entity.sqlite({ name: 'posts', adapter: db, model: postTable })
```

Emits:

```sql
CREATE TABLE IF NOT EXISTS users (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  email     TEXT NOT NULL UNIQUE COLLATE NOCASE,
  role      TEXT NOT NULL CHECK (role IN ('admin', 'user', 'moderator')),
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS posts (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  userId    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug      TEXT NOT NULL COLLATE NOCASE,
  title     TEXT NOT NULL,
  body      TEXT,
  status    TEXT NOT NULL CHECK (status IN ('draft', 'published', 'archived')),
  score     REAL CHECK (score >= 0),
  minScore  REAL NOT NULL,
  createdAt INTEGER NOT NULL,
  updatedAt INTEGER NOT NULL,

  UNIQUE (userId, slug),
  CHECK (score >= minScore)
);
CREATE INDEX IF NOT EXISTS posts_userId_slug_idx ON posts (userId, slug);
```

---

## SQLite Has No Native Type For (handle in userland)

| Need             | How                                                         |
| ---------------- | ----------------------------------------------------------- |
| Boolean          | `lite.integer()` + your own `0/1` pipe                      |
| Date / timestamp | `lite.text()` or `lite.integer()` + your own pipe           |
| UUID             | `lite.text().default(() => crypto.randomUUID())`            |
| Enum             | `.in(values)` → `CHECK (col IN (...))`                      |
| JSON             | `lite.text()` — SQLite JSON functions work on TEXT natively |
| Array            | `lite.text()` + your own serialize/deserialize pipe         |
| BigInt           | `lite.blob()` + your own pipe                               |
