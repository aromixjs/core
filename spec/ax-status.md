# ax — Implementation Status

> Legend:  ✅ IMPLEMENTED   🗑️ KILLED   📋 TODO

---

## Primitives ✅

| Schema | Runtime check | TS type |
|---|---|---|
| `ax.string()` | `typeof x === 'string'` | `string` |
| `ax.number()` | `typeof x === 'number' && !isNaN(x)` | `number` |
| `ax.boolean()` | `typeof x === 'boolean'` | `boolean` |
| `ax.bigint()` | `typeof x === 'bigint'` | `bigint` |
| `ax.symbol()` | `typeof x === 'symbol'` | `symbol` |
| `ax.null()` | `x === null` | `null` |
| `ax.undefined()` | `x === undefined` | `undefined` |
| `ax.unknown()` | always passes | `unknown` |
| `ax.never()` | always fails | `never` |

Every primitive **coerces** input by default — `String()`, `Number()`, `BigInt()`, `Boolean()`, or `new Date()` are called during `parse()` before validation.

### 📋 `.message()` (TODO)
Override default error message on type check failure.

---

## Literal ✅

`ax.literal('admin')` → `'admin'`

---

## Nullability & defaults  🗑️  KILLED

| Removed method | Replacement |
|---|---|
| `.optional()` | `ax.union([schema, ax.undefined()])` |
| `.nullable()` | `ax.union([schema, ax.null()])` |
| `.nullish()` | `ax.union([schema, ax.null(), ax.undefined()])` |
| `.default(value)` | not yet replaced |
| `.defaultFn(() => value)` | not yet replaced |

---

## Object ✅ / 📋

- **✅** Shape validation — each field validated
- **📋** Undeclared key stripping (drop keys not in schema)
- **📋** Modifiers: `.pick()`, `.omit()`, `.partial()`, `.required()`, `.readonly()`
- **📋** `ax.merge([...])` — merge multiple object schemas

---

## Array ✅

`ax.array(schema)` → `T[]`

## Tuple ✅

`ax.tuple([...])` → `[string, number, ...]`

---

## Record ✅ / 📋

- **✅** `ax.record(valueSchema)` → `Record<string, V>`
- **📋** `ax.record(keySchema, valueSchema)` → `Record<K, V>` (two-param)

---

## Union ✅

`ax.union([schemaA, schemaB])` → `A | B`

---

## Date ✅

`ax.date()` — coerces ISO strings and timestamps via `new Date()`.

---

## 📋 `ax.instanceof(Constructor)` (TODO)

## 📋 `ax.lazy(() => schema)` (TODO)

---

## Coercions  🗑️  KILLED

`ax.coerce.*` namespace removed. Built-in coercion on all primitives instead.

---

## 📋 Operators & `.pipe()` (TODO)

- `ax.operator({ validate, message })`
- `.pipe()` chaining
- `ax.fail()` / `ax.fail('msg', { path })`

---

## Parsing

- **✅** `.parse(value)` → `T` or throws `ValidationError`
- **📋** `.safeParse(value)` → `{ ok, value }` / `{ ok, error, issues }`

---

## Errors ✅ / 📋

- **✅** `ValidationError extends Error { issues: Issue[] }` where `Issue { message, received }`
- **📋** Full `ValidationIssue` with `path`, `code` + `IssueCode` enum

## Inference ✅

`typeof schema.$infer`

## Introspection ✅

`.meta()` returns serialisable state

---

## Summary

| Area | Status |
|---|---|
| Primitives (9) | ✅ |
| Literal | ✅ |
| Object (shape) | ✅ |
| Array | ✅ |
| Tuple | ✅ |
| Record (1-param) | ✅ |
| Union | ✅ |
| Date | ✅ |
| `.parse()` | ✅ |
| `$infer` | ✅ |
| `.meta()` | ✅ |
| ValidationError | ✅ |
| **KILLED:** `.optional()`/`.nullable()`/`.default()` | 🗑️ |
| **KILLED:** `ax.coerce.*` | 🗑️ |
| `.message()` | 📋 |
| Object key stripping | 📋 |
| Object modifiers | 📋 |
| `ax.merge()` | 📋 |
| Record (2-param) | 📋 |
| `ax.instanceof()` | 📋 |
| `ax.lazy()` | 📋 |
| Operators + `.pipe()` | 📋 |
| `.safeParse()` | 📋 |
| Full Issue codes/path | 📋 |
