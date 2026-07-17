# SQLite Feature — Internal Docs

## Overview

The SQLite feature is split across three layers:

```
Storage.sqlite()   → DB connection + pragma config
lite               → column/table DDL definitions
Entity.sqlite()    → ties storage + schema together, entry point for all DB operations
```

---

## Storage Adapter

Defined in `storage.ts`. Wraps the native DB driver.

```ts
const db = Storage.sqlite({
    query: (sql) => d1.prepare(sql).run(), // required
    foreignKeys: true, // PRAGMA foreign_keys  default: true
    wal: true, // PRAGMA journal_mode=WAL  default: true, ignored on D1
    busyTimeout: 5000, // PRAGMA busy_timeout  default: 5000ms, ignored on D1
})
```

`query` receives fully resolved SQL from the entity layer. The adapter does no processing — it just executes and returns whatever the native driver gives back. Normalization happens above this layer.

`foreignKeys` is the critical one — SQLite disables FK enforcement by default. This pragma must be set per connection, not per table.

D1 has WAL always on and manages its own busy timeout — those two options are silently ignored on D1.

---

## `lite` — DDL Builder

Defined in `lite/lite.ts` + `lite/lite.kit.ts`.

### Column Types

| Method                 | SQL type  | TS type      |
| ---------------------- | --------- | ------------ |
| `lite.int()`           | `INTEGER` | `number`     |
| `lite.real()`          | `REAL`    | `number`     |
| `lite.text()`          | `TEXT`    | `string`     |
| `lite.blob()`          | `BLOB`    | `Uint8Array` |
| `lite.boolean()`       | `INTEGER` | `boolean`    |
| `lite.bigint()`        | `BLOB`    | `bigint`     |
| `lite.date('iso')`     | `TEXT`    | `Date`       |
| `lite.date('unix-ms')` | `INTEGER` | `Date`       |

`boolean` stores as `0`/`1` — coercion handled at entity layer.
`bigint` stores as BLOB — SQLite has no native bigint.
`date` format controls storage class and serialization strategy — `iso` uses ISO8601 TEXT, `unix-ms` uses integer milliseconds.

### Column Modifiers

**Constraints — emitted into DDL:**

| Modifier                     | SQL emitted                                          |
| ---------------------------- | ---------------------------------------------------- |
| `.primaryKey()`              | `PRIMARY KEY`                                        |
| `.autoIncrement()`           | `AUTOINCREMENT` — only valid on `int().primaryKey()` |
| `.notNull()`                 | `NOT NULL`                                           |
| `.unique(conflict?)`         | `UNIQUE ON CONFLICT ...`                             |
| `.references(col, actions?)` | `REFERENCES table(col) ON DELETE ... ON UPDATE ...`  |
| `.collate(collation)`        | `COLLATE NOCASE \| RTRIM \| BINARY`                  |

**Value checks — generate `CHECK` internally:**

| Modifier        | SQL emitted                | Applies to            |
| --------------- | -------------------------- | --------------------- |
| `.min(n)`       | `CHECK (col >= n)`         | `int` `real` `bigint` |
| `.max(n)`       | `CHECK (col <= n)`         | `int` `real` `bigint` |
| `.minLength(n)` | `CHECK (length(col) >= n)` | `text`                |
| `.maxLength(n)` | `CHECK (length(col) <= n)` | `text`                |
| `.in(values)`   | `CHECK (col IN (...))`     | `text`                |
| `.lt(col)`      | `CHECK (this < col)`       | `int` `real` `date`   |
| `.gt(col)`      | `CHECK (this > col)`       | `int` `real` `date`   |
| `.lte(col)`     | `CHECK (this <= col)`      | `int` `real` `date`   |
| `.gte(col)`     | `CHECK (this >= col)`      | `int` `real` `date`   |

`.in(values)` also narrows the TS type to a union literal of the provided values.

Cross-column checks (`lt`, `gt`, `lte`, `gte`) take a column name as string — not type safe, validated at sync time.

**Multi-column — resolved at entity registration:**

| Modifier                       | SQL emitted                              |
| ------------------------------ | ---------------------------------------- |
| `.uniqueWith(cols, conflict?)` | `UNIQUE (this, ...cols)`                 |
| `.indexWith(cols)`             | `CREATE INDEX ON (this, ...cols)`        |
| `.uniqueIndexWith(cols)`       | `CREATE UNIQUE INDEX ON (this, ...cols)` |
| `.primaryKeyWith(cols)`        | `PRIMARY KEY (this, ...cols)`            |

Declare on the most semantically relevant column. Column name is resolved from the object key when the entity walks the model.

**JS-layer only — not emitted into DDL:**

| Modifier         | When called                                 |
| ---------------- | ------------------------------------------- |
| `.defaultFn(fn)` | Called before insert when no value provided |
| `.onUpdate(fn)`  | Called before every update on this row      |

### `liteKit` Namespace

All types live in `liteKit`:

```ts
liteKit.$meta // symbol key for column metadata
liteKit.ColType // union of all column type strings
liteKit.DateFormat // 'iso' | 'unix-ms'
liteKit.ColTypeMap // maps ColType → TS type
liteKit.UniqueConflict // 'conflict:error' | 'conflict:replace' | 'conflict:ignore'
liteKit.Collation // 'binary' | 'nocase' | 'rtrim'
liteKit.ReferenceAction // 'delete:cascade' | 'update:cascade' | ...
liteKit.Meta // full column metadata shape
liteKit.Input // constructor input shape
```

Each `lite` instance carries its full definition in `instance[liteKit.$meta]`. The entity layer reads this symbol to build DDL and resolve relationships.

---

## `Entity.sqlite()`

Defined in `entity/entity.def.ts`.

```ts
const userEntity = Entity.sqlite({
    name: 'users',
    storage: db,
    model: {
        id: lite.int().primaryKey().autoIncrement(),
        name: lite.text().notNull(),
        email: lite.text().notNull().unique(),
        role: lite.text().in(['admin', 'user']).default('user'),
        createdAt: lite.date('iso').defaultFn(() => new Date()),
        updatedAt: lite
            .date('iso')
            .defaultFn(() => new Date())
            .onUpdate(() => new Date()),
    },
})
```

`name` becomes the table name in SQL.
`model` keys become column names — no renaming, no snake_case conversion.
`storage` must be a `Storage.sqlite()` adapter.

### Cross-entity references

```ts
const postEntity = Entity.sqlite({
    name: 'posts',
    storage: db,
    model: {
        id: lite.int().primaryKey().autoIncrement(),
        userId: lite.int().notNull().references(userEntity.col('id'), ['delete:cascade']),
    },
})
```

`userEntity.col('id')` returns a typed reference object carrying the entity name, table name, and column — enough to resolve the full FK at sync time.

Parent entities must be defined before child entities that reference them. If circular deps are unavoidable a thunk `() => userEntity.col('id')` can be used.

---

## Sync

Additive only — no migration files, no destructive operations.

On each server startup the entity layer runs:

1. `CREATE TABLE IF NOT EXISTS` — creates table if missing, skips if exists
2. `ALTER TABLE ADD COLUMN` — adds new columns that don't exist yet
3. `CREATE INDEX IF NOT EXISTS` — creates missing indexes

**What sync will never do:**

- Drop columns
- Rename columns
- Change column types
- Drop indexes
- Drop tables

Destructive changes are the developer's responsibility — run them manually against the DB.

---

## File Structure

```
src/
  storage.ts              → Storage.kv() + Storage.sqlite()
  lite/
    lite.ts               → lite class + liteKit namespace
  entity/
    entity.def.ts         → Entity.kv() + Entity.sqlite()
    entity.type.ts        → all entity types
    entity.util.ts        → validate(), createOperation()
```
