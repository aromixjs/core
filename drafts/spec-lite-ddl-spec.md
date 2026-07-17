# `lite` API Reference

---

## Column Types

```ts
lite.integer() // INTEGER  → number
lite.real() // REAL     → number
lite.text() // TEXT     → string
lite.blob() // BLOB     → Uint8Array
lite.numeric() // NUMERIC  → number | string
lite.boolean() // INTEGER  → boolean  (0/1)
lite.bigint() // BLOB     → bigint
lite.date('iso') // TEXT     → Date     (ISO8601 string)
lite.date('unix') // INTEGER  → Date     (unix seconds)
lite.date('unix-ms') // INTEGER  → Date     (unix milliseconds)
lite.date('julian') // REAL     → Date     (julian day number, SQLite native)
```

---

## Column Modifiers

### `.primaryKey()`

```ts
lite.integer().primaryKey()
lite.integer().primaryKey().autoIncrement()
```

### `.notNull()`

```ts
lite.text().notNull()
```

### `.unique()`

```ts
lite.text().unique()
```

### `.default(value)`

SQL-level — emitted into DDL.

```ts
lite.text().default('draft')
lite.integer().default(0)
lite.boolean().default(true)
lite.date('unix').default(lite.fn.epoch())
lite.date('iso').default(lite.fn.now())
```

### `.defaultFn(fn)`

JS-level — not in DDL. Called at runtime before insert.

```ts
lite.text().defaultFn(() => crypto.randomUUID())
lite.date('iso').defaultFn(() => new Date())
```

### `.onUpdate(fn)`

Called at runtime before every update. Not in DDL.

```ts
lite.date('iso').onUpdate(() => new Date())
```

### `.check(expr)`

```ts
lite.integer().check('age >= 0 AND age <= 150')
```

### `.enum(values)`

```ts
lite.text().enum(['admin', 'user', 'moderator'])
// → CHECK (col IN ('admin', 'user', 'moderator'))
// TS: "admin" | "user" | "moderator"
```

### `.collate(collation)`

```ts
lite.text().collate('nocase')
lite.text().collate('rtrim')
lite.text().collate('binary')
```

### `.references(col, actions?)`

```ts
lite.integer().references(userTable.id)
lite.integer().references(userTable.id, ['delete:cascade'])
lite.integer().references(userTable.id, ['delete:cascade', 'update:no-action'])
```

**Action literals:**

```ts
"delete:no-action"    "update:no-action"
"delete:restrict"     "update:restrict"
"delete:cascade"      "update:cascade"
"delete:set-null"     "update:set-null"
"delete:set-default"  "update:set-default"
```

### `.generatedAs(expr, mode?)`

```ts
lite.integer().generatedAs('length(body)') // virtual (default)
lite.text().generatedAs("first || ' ' || last", 'stored')
// Absent from $inferInsert — cannot be written to
```

### `.onConflict(strategy)`

```ts
lite.text().notNull().onConflict('ignore')
lite.text().unique().onConflict('replace')
// "abort" | "fail" | "ignore" | "replace" | "rollback"
```

### `.$type<T>()`

```ts
lite.integer().$type<UserId>()
```

### `.transformer(transformer)`

```ts
lite.text().transformer({
    from: (db: string) => new URL(db),
    to: (js: URL) => js.toString(),
})
```

---

## `lite.fn`

```ts
lite.fn.now() // datetime('now')              → use with date("iso")
lite.fn.epoch() // unixepoch()                  → use with date("unix")
lite.fn.uuid() // lower(hex(randomblob(16)))   → use with text()
lite.fn.raw(expr) // raw SQL expression
```

---

## `lite.table(columns).options(opts)`

```ts
lite.table({
    // columns
}).options({
    strict: true,
    withoutRowId: false,

    primaryKey: ['tenantId', 'userId'],

    unique: [['userId', 'slug'], { columns: ['a', 'b'], onConflict: 'ignore' }],

    checks: ['startDate < endDate'],

    foreignKeys: [
        {
            columns: ['tenantId', 'userId'],
            references: [userTable.tenantId, userTable.id],
            actions: ['delete:cascade', 'update:no-action'],
        },
    ],

    indexes: [{ columns: ['email'], unique: true }, { columns: ['role', 'active'] }, { expr: 'lower(email)', unique: true, name: 'idx_email_ci' }],
})
```

---

## TypeScript Inference

```ts
typeof table.$inferSelect
typeof table.$inferInsert
```

| Declaration                       | `$inferSelect` | `$inferInsert`           |
| --------------------------------- | -------------- | ------------------------ |
| (bare)                            | `T \| null`    | `T \| null \| undefined` |
| `.notNull()`                      | `T`            | `T`                      |
| `.notNull().default(x)`           | `T`            | `T \| undefined`         |
| `.default(x)` or `.defaultFn(fn)` | `T \| null`    | `T \| null \| undefined` |
| `.generatedAs(...)`               | `T \| null`    | _(absent)_               |
| `.$type<U>()`                     | `U`            | `U`                      |

---

## `toSQL(tableName)`

```ts
postTable.toSQL('posts')
```

```sql
CREATE TABLE IF NOT EXISTS posts (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  userId    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug      TEXT NOT NULL COLLATE NOCASE,
  status    TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  wordCount INTEGER GENERATED ALWAYS AS (length(body)) VIRTUAL,
  createdAt TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (userId, slug)
);
CREATE INDEX IF NOT EXISTS posts_userId_idx ON posts (userId);
```

Index names auto-generated as `{table}_{cols}_idx` when not explicitly named.
