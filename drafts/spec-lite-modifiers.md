# `lite` Column Modifiers

## Modifiers

```ts
// core — SQLite DDL level
primaryKey()
autoIncrement()
notNull()
unique(conflict?: UniqueConflict)
default(value)
defaultFn(fn)
onUpdate(fn)
collate(collation)
references(col, actions?: ReferenceAction[])
in(values)

// multi-col table level
uniqueWith(cols: string[], conflict?: UniqueConflict)
indexWith(cols: string[])
uniqueIndexWith(cols: string[])
primaryKeyWith(cols: string[])

// js layer — ax pipe chain
pipe(operator)
```

---

## Types

```ts
type UniqueConflict =
    | 'conflict:error' // default — throws error
    | 'conflict:replace' // deletes conflicting row, inserts new
    | 'conflict:ignore' // skips violating row silently

type Collation =
    | 'binary' // byte comparison (default)
    | 'nocase' // case-insensitive ASCII
    | 'rtrim' // ignores trailing whitespace

type ReferenceAction =
    | 'delete:no-action'
    | 'update:no-action'
    | 'delete:restrict'
    | 'update:restrict'
    | 'delete:cascade'
    | 'update:cascade'
    | 'delete:set-null'
    | 'update:set-null'
    | 'delete:set-default'
    | 'update:set-default'
```

---

## `in` — CHECK constraint

```ts
in(values: string[])
// → CHECK (col IN ('a', 'b', 'c'))
// narrows TS type to union literal of provided values
// only valid on text columns
```

---

## `.pipe(operator)` — JS layer via ax

Each `.pipe()` takes a single `ax.operator()`. Chain multiple `.pipe()` calls for sequential steps.
Runs at the entity layer — before insert/update, after select.
No SQL emitted.

```ts
// validation only
age: lite.int()
    .notNull()
    .pipe(
        ax.operator((v: number) => {
            if (v < 0 || v > 150) throw 'Age must be between 0 and 150'
            return v
        }),
    )

// transformation only — stored value is the transformed result
email: lite.text()
    .notNull()
    .pipe(ax.operator((v: string) => v.toLowerCase().trim()))

// chained — each pipe receives output of the previous
slug: lite.text()
    .notNull()
    .pipe(ax.operator((v: string) => v.toLowerCase().replace(/\s+/g, '-')))
    .pipe(
        ax.operator((v: string) => {
            if (v.length < 3) throw 'Slug too short'
            return v
        }),
    )

// transformation that changes the type
tags: lite.text()
    .notNull()
    .pipe(ax.operator((v: string) => v.split(','))) // string → string[]
    .pipe(ax.operator((v: string[]) => v.map((t) => t.trim())))
```

Operators are defined with `ax.operator(fn)` where `fn` is `(value) => newValue`. Throwing inside rejects the value with a `ValidationError`.

---

## References

```ts
references(col: any, actions?: ReferenceAction[])
// col = userEntity.col('id') — carries entity + table + column
// actions = ['delete:cascade', 'update:no-action']
// resolved at Entity.sqlite() registration time
```

---

## Multi-Column Modifiers

| Modifier                      | SQL emitted                              |
| ----------------------------- | ---------------------------------------- |
| `uniqueWith(cols, conflict?)` | `UNIQUE (this, ...cols) ON CONFLICT ...` |
| `indexWith(cols)`             | `CREATE INDEX ON (this, ...cols)`        |
| `uniqueIndexWith(cols)`       | `CREATE UNIQUE INDEX ON (this, ...cols)` |
| `primaryKeyWith(cols)`        | `PRIMARY KEY (this, ...cols)`            |

Declare on the most semantically relevant column. Col name resolved from object key at entity registration time.

---

## What moved out of lite → use ax pipe instead

| Was in lite    | Use instead                                                                      |
| -------------- | -------------------------------------------------------------------------------- |
| `min(n)`       | `.pipe(ax.operator((v: number) => { if (v < n) throw '...'; return v }))`        |
| `max(n)`       | `.pipe(ax.operator((v: number) => { if (v > n) throw '...'; return v }))`        |
| `minLength(n)` | `.pipe(ax.operator((v: string) => { if (v.length < n) throw '...'; return v }))` |
| `maxLength(n)` | `.pipe(ax.operator((v: string) => { if (v.length > n) throw '...'; return v }))` |
| `lt(col)`      | `.pipe(ax.operator((v, row) => { if (v >= row[col]) throw '...'; return v }))`   |
| `gt(col)`      | `.pipe(ax.operator((v, row) => { if (v <= row[col]) throw '...'; return v }))`   |
| `lte(col)`     | `.pipe(ax.operator((v, row) => { if (v > row[col]) throw '...'; return v }))`    |
| `gte(col)`     | `.pipe(ax.operator((v, row) => { if (v < row[col]) throw '...'; return v }))`    |

---

## Meta

```ts
interface Meta {
    type: ColumnType
    dateFormat?: DateFormat
    primaryKey: boolean
    autoIncrement: boolean
    notNull: boolean
    unique: boolean
    uniqueConflict?: UniqueConflict
    default?: unknown
    defaultFn?: () => unknown
    onUpdate?: () => unknown
    collate?: Collation
    references?: { col: any; actions: ReferenceAction[] }
    in?: string[]
    pipes: Operator[]
    uniqueWith?: string[]
    uniqueWithConflict?: UniqueConflict
    indexWith?: string[]
    uniqueIndexWith?: string[]
    primaryKeyWith?: string[]
}
```
