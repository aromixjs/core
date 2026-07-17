# @aromix/validator — Implementation Reference

```typescript
const [data, err] = ax.number().parse('not a number')
if (err) {
  // err is ValidationError
} else {
  data // typed as number
}
```

## Parse Methods

| Method | Applies |
|---|---|
| `.parse(v)` | base validation only, ignores all access-control state |
| `.parseInsert(v)` | `readonly`, `locked`, `access` entries tagged `'insert'` |
| `.parseUpdate(v)` | `readonly`, `locked`, `access` entries tagged `'update'`, implicit `.partial()` |
| `.parseSelect(v)` | strips `.hidden()` fields recursively |

```typescript
const User = ax.object({
  id: ax.string().readonly(),
  email: ax.string(),
  passwordHash: ax.string().hidden(),
})

User.parseInsert({ email: 'a@b.com', passwordHash: 'x' })
// [null, ValidationError] — passwordHash isn't insertable, id is readonly

User.parseUpdate({ email: 'new@b.com' })
// [{ email: 'new@b.com' }, null] — partial, only sent fields validated

User.parseSelect({ id: '1', email: 'a@b.com', passwordHash: 'x' })
// [{ id: '1', email: 'a@b.com' }, null] — passwordHash stripped
```

## Primitives

```typescript
ax.string().parse('hello')      // ['hello', null]
ax.number().parse(42)           // [42, null]
ax.boolean().parse(true)        // [true, null]
ax.bigint().parse(100n)         // [100n, null]
ax.symbol().parse(Symbol())     // [Symbol(), null]
ax.null().parse(null)           // [null, null]
ax.undefined().parse(undefined) // [undefined, null]
ax.unknown().parse('anything')  // ['anything', null]
ax.never().parse('anything')    // [null, ValidationError]
```

## `.convert()`

Coerces input to expected type before validation, falls through to normal error if it can't. Incoming only — applies to `parse`/`parseInsert`/`parseUpdate`, **not** `parseSelect`. Runs before pipes and before access-control checks.

```typescript
const n = ax.number().convert()
n.parse('123')          // [123, null]
n.parse('not a number') // [null, ValidationError]

const b = ax.boolean().convert()
b.parse('true') // [true, null]
b.parse(1)       // [true, null]
```

## `ax.object(shape)`

```typescript
const User = ax.object({
  name: ax.string(),
  age: ax.number(),
})

User.parse({ name: 'Alice', age: 30 })       // [{ name: 'Alice', age: 30 }, null]
User.parse({ name: 'Alice' })                // [null, ValidationError] — missing field
User.parse({ name: 'Alice', age: '30' })     // [null, ValidationError] — wrong type
User.parse({ name: 'Alice', age: 30, x: 1 }) // [{ name: 'Alice', age: 30 }, null] — x stripped

const Nested = ax.object({
  inner: ax.object({ value: ax.number() }),
})
Nested.parse({ inner: { value: 99 } }) // [{ inner: { value: 99 } }, null]
```

### `.partial()`

Object-only. All fields structurally optional. If a field has an `access` entry for that op, it still applies when the field is present — `.partial()` only relaxes presence, not type.

```typescript
const PartialUser = User.partial()
// $infer: { name?: string; age?: number }

PartialUser.parse({}) // [{}, null]
PartialUser.parse({ age: 30 }) // [{ age: 30 }, null]
PartialUser.parse({ age: '30' }) // [null, ValidationError] — type still enforced when present
```

### object-level `.access()` / `.readonly()` / `.hidden()`

- `.readonly()` / `.hidden()` on an object cascades to all children, no exceptions.
- `.access()` on an object narrows the whole shape for that op.
- precedence: more specific (child) wins over parent, but a parent rule isn't silently dropped — a child has to explicitly opt out by declaring its own modifier.

```typescript
const Settings = ax.object({
  theme: ax.string(),
  apiKey: ax.string(),
}).hidden()
// every child field is treated as hidden, regardless of its own modifiers

const Profile = ax.object({
  id: ax.string().readonly(),
  bio: ax.string(),
}).access((for) => [
  for('update').value({ bio: '' }),
])
```

## `array / tuple / union / record`

```typescript
const Names = ax.array(ax.string())
Names.parse(['Alice', 'Bob']) // [['Alice', 'Bob'], null]
Names.parse([1, 2])           // [null, ValidationError]

const Coord = ax.tuple([ax.number(), ax.number()])
Coord.parse([10, 20])  // [[10, 20], null]
Coord.parse([1])       // [null, ValidationError] — wrong length
Coord.parse(['x', 10]) // [null, ValidationError] — wrong type at position

const StrOrNum = ax.union([ax.string(), ax.number()])
StrOrNum.parse('hello') // ['hello', null]
StrOrNum.parse(42)      // [42, null]
StrOrNum.parse(true)    // [null, ValidationError]

const Flags = ax.record(ax.boolean())
Flags.parse({ a: true, b: false }) // [{ a: true, b: false }, null]
Flags.parse({ a: 1 })              // [null, ValidationError]
```

## `literal(v)` / `literals(...)`

`literals` is the variadic closed-set version, avoids `union([literal(...)])`. Stored as `state.type === 'literals'` so SDK gen can read the value set directly.

```typescript
ax.literal('admin').parse('admin') // ['admin', null]
ax.literal('admin').parse('user')  // [null, ValidationError]

const Role = ax.literals('admin', 'editor', 'viewer')
Role.parse('editor') // ['editor', null]
Role.parse('owner')  // [null, ValidationError]
// $infer: 'admin' | 'editor' | 'viewer'
```

## `instance(Class)`

```typescript
ax.instance(Date).parse(new Date())   // [Date, null]
ax.instance(Date).parse('2024-01-01') // [null, ValidationError]

class MyClass { constructor(public x: number) {} }
ax.instance(MyClass).parse(new MyClass(5)) // [MyClass, null]
```

## Defaults / Nullability

```typescript
const s = ax.string().default('guest')
s.parse('alice')   // ['alice', null]
s.parse(undefined) // ['guest', null]
s.parse(null)      // [null, ValidationError] — null is not undefined

let counter = 0
const id = ax.number().defaultFn(() => ++counter)
id.parse(undefined) // [1, null]
id.parse(undefined) // [2, null]
```

- `.optional()` → `| undefined`, `.nullable()` → `| null`, `.nullish()` → both. Flags on `state`, no union wrapping.

```typescript
ax.string().optional().parse(undefined) // [undefined, null]
ax.number().nullable().parse(null)      // [null, null]
ax.string().nullish().parse(undefined)  // [undefined, null]
```

## `.pipe(fn)`

Takes value, returns validated value or throws (caught, becomes error tuple). Single value only — no `(value, context)`. Any cross-field/contextual logic is explicitly out of scope, lives in a separate guards layer.

```typescript
const minLen = (n: number) => (v: string) => {
  if (v.length < n) throw `Min ${n} chars`
  return v
}

const Name = ax.string().pipe(minLen(2))
Name.parse('Al') // ['Al', null]
Name.parse('A')  // [null, ValidationError] — code: 'custom'

// type changes as you pipe
const CsvFirst = ax.string()
  .pipe((v) => v.split(',').map((s) => s.trim())) // string[]
  .pipe((v) => v[0])                               // string

CsvFirst.parse('a, b, c') // ['a', null]

// chaining
const Processed = ax.string()
  .pipe(minLen(2))
  .pipe((v) => v.toUpperCase())
  .pipe((v) => v.split(','))
  .pipe((v) => v[0])

Processed.parse('john, bob') // ['JOHN', null]

ax.string().pipe((v: number) => v * 2); // @ts-expect-error — input type checked against current output type
```

Whatever the function throws — string or `Error` — gets wrapped in `ValidationError` with `code: 'custom'`. Nothing raw leaks out of `.parse()`.

## Access Control

Metadata only — never affects `.parse()`. Read by `parseInsert/Update/Select` and SDK gen.

| Modifier | `$inferInsert` | `$inferUpdate` | `$inferSelect` |
|---|---|---|---|
| `.default()/.defaultFn()` | optional | — | — |
| `.readonly()/.readonlyFn()` | omitted | omitted | — |
| `.locked()` | normal rules | omitted | — |
| `.hidden()` | — | — | omitted |
| `.access(...)` with `.value()`/`.oneOf()` on `'insert'` | narrowed | — | — |
| `.access(...)` with `.value()`/`.oneOf()` on `'update'` | — | narrowed | — |
| `.access(...)` with `.range()`/`.length()` | no type change (parse-time only) | no type change (parse-time only) | — |

### `.readonly(value?)` / `.readonlyFn(fn)`

Never accepts client value. Omitted from insert+update entirely. There's no separate on/off flag to check — a field is treated as readonly simply because a fallback (`readonlyValue` or `readonlyFn`) is present; that presence *is* the check at parse time.

- `.readonly(value)` — sets a fixed fallback value in one call.
- `.readonly()` bare — needs a fallback from `.default()`/`.defaultFn()` elsewhere, or `.parseInsert()` errors instead of letting client value through.

```typescript
const Id = ax.string().readonlyFn(() => crypto.randomUUID())
Id.parseInsert('whatever-client-sent') // [<uuid>, null] — client value ignored

const Status = ax.string().readonly('active')
Status.parseInsert('banned')  // ['active', null] — forced regardless of input
Status.parseUpdate('banned')  // [null, ValidationError]

const Broken = ax.string().readonly() // no fallback configured anywhere
Broken.parseInsert('x') // [null, ValidationError] — no fallback to fall back to
```

### `.locked()`

Client sets once at insert (normal rules — required unless defaulted), never after. Omitted from update only.

```typescript
const CreatedAt = ax.string().locked().defaultFn(() => new Date().toISOString())
CreatedAt.parseInsert('2026-01-01') // ['2026-01-01', null]
CreatedAt.parseUpdate('2027-01-01') // [null, ValidationError]
```

### `.access((for) => [...])`

Centralized narrowing, built per-operation through a small chain instead of passing a full schema. The callback receives `for`, a function you call with `'insert'` or `'update'` to start a chain scoped to that one operation. The array can hold at most one entry per op — one insert entry, one update entry, or both (in either order) — never two for the same op.

Each chain only exposes the operations that make sense for the field's base type:

| Chain method | Available when | Effect on inferred type |
|---|---|---|
| `.value(v)` | always | narrows to the literal `v` |
| `.oneOf([...])` | base is a literal union (`literal`/`literals`/`.in([...])`) | narrows to the union of the passed values |
| `.range({min, max})` | base extends `number \| bigint` | parse-time only, type stays the base numeric type |
| `.length({min, max})` | base extends `string` | parse-time only, type stays `string` |

`.value()`/`.oneOf()` must stay within the field's existing base type — narrow only, never widen, never arbitrary. `.value()` here is for narrowing what's *allowed*, not for forcing a fixed value regardless of input — use `.readonly(value)` for that.

```typescript
const Role = ax.literals('admin', 'editor', 'viewer').access((for_) => [
  for_('insert').oneOf(['viewer']),
])
Role.parseInsert('viewer') // ['viewer', null]
Role.parseInsert('admin')  // [null, ValidationError]

const Status = ax.literals('draft', 'published', 'archived').access((for_) => [
  for_('update').oneOf(['draft', 'published']),
])
Status.parseUpdate('archived')  // [null, ValidationError] — not in update-time set
Status.parseUpdate('published') // ['published', null]

const Age = ax.number().access((for_) => [
  for_('insert').range({ min: 0, max: 120 }),
])
Age.parseInsert(150) // [null, ValidationError] — parse-time only, $inferInsert is still `number`

// both ops in one call
const Bio = ax.string().access((for_) => [
  for_('insert').length({ max: 280 }),
  for_('update').length({ max: 280 }),
])
```

Allowed on primitives and on `ax.object()` (see object-level section above).

### `.hidden()`

Omitted from select only. Orthogonal to write perms. Pure metadata on primitives (`state.access.hidden`); `.parseSelect()` strips it at the object level.

```typescript
const PasswordHash = ax.string().hidden()

const User = ax.object({
  id: ax.string(),
  password: ax.string().hidden(),
})
User.parseSelect({ id: '1', password: 'secret' })
// [{ id: '1' }, null] — password stripped
```

## Error Shape

```typescript
{
  name: 'ValidationError',
  message: "Expected string, received number at 'name'",
  issues: [
    { code: 'invalidType', path: ['name'], message: string }
  ]
}
```

| Code | When |
|---|---|
| `invalidType` | wrong type |
| `invalidLiteral` | value doesn't match the literal/literals set |
| `custom` | a `.pipe()` function threw |

Validator's job stops here — HTTP/RPC mapping is the RPC layer's concern.

## Inference

```typescript
const User = ax.object({ name: ax.string(), age: ax.number() })

type T = typeof User.$infer        // { name: string; age: number }
type Insert = typeof User.$inferInsert
type Update = typeof User.$inferUpdate
type Select = typeof User.$inferSelect
```

## `.state`

Public, read-only, metaprogramming/SDK-gen surface.

```typescript
const s = ax.string().default('hello')
s.state.type    // 'string'
s.state.default // { value: 'hello' }
```