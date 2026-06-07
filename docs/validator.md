# @aromix/validator

## Getting Started

```bash
npm install @aromix/validator
```

Import the `ax` object — that's your entry point for everything:

```ts
import { ax } from '@aromix/validator'
```

Make your first schema:

```ts
const s = ax.string()
```

Validate some data:

```ts
s.parse('hello') // 'hello'
s.parse(42) // throws ValidationError
```

---

## The Two Parse Methods

Every schema has two ways to validate data.

### `.parse()` — throws on failure

```ts
try {
      const val = ax.number().parse('not a number')
} catch (e) {
      // e is ValidationError
}
```

### `.safeParse()` — never throws

Returns a discriminated union. Check `.success` to know which branch you're in.

```ts
const result = ax.number().safeParse('hello')

if (result.success) {
      result.data // typed as number
      result.errors // null
} else {
      result.data // null
      result.errors // string[] — human-readable messages
}
```

TypeScript narrows the type automatically inside each `if` branch, so `result.data` is properly typed.

---

## Primitive Schemas

These cover the basic JavaScript types.

| Schema           | What it accepts                      |
| ---------------- | ------------------------------------ |
| `ax.string()`    | any string                           |
| `ax.number()`    | any number (including NaN, Infinity) |
| `ax.boolean()`   | true or false                        |
| `ax.bigint()`    | BigInt values                        |
| `ax.symbol()`    | Symbol values                        |
| `ax.null()`      | only null                            |
| `ax.undefined()` | only undefined                       |
| `ax.unknown()`   | literally anything — passes through  |
| `ax.never()`     | nothing — always fails               |

```ts
ax.string().parse('hello') // ✓
ax.number().parse(42) // ✓
ax.boolean().parse(true) // ✓
ax.bigint().parse(100n) // ✓
ax.symbol().parse(Symbol()) // ✓
ax.null().parse(null) // ✓
ax.undefined().parse(undefined) // ✓
ax.unknown().parse('anything') // ✓
ax.never().parse('anything') // ✗
```

---

## Complex Schemas

### object

Define the shape of an object. Each field uses its own schema.

```ts
const User = ax.object({
      name: ax.string(),
      age: ax.number(),
})

User.parse({ name: 'Alice', age: 30 })
// { name: 'Alice', age: 30 }
```

- Missing fields throw.
- Wrong types throw.
- Extra fields are **stripped** from the output.
- Nested objects work fine.

```ts
const Nested = ax.object({
      inner: ax.object({ value: ax.number() }),
})
Nested.parse({ inner: { value: 99 } }) // ✓
```

### array

Every element must match the schema.

```ts
const Names = ax.array(ax.string())
Names.parse(['Alice', 'Bob']) // ✓
Names.parse([1, 2]) // ✗
```

Nested arrays:

```ts
const Matrix = ax.array(ax.array(ax.number()))
Matrix.parse([
      [1, 2],
      [3, 4],
]) // ✓
```

### tuple

Fixed length, typed by position.

```ts
const Coord = ax.tuple([ax.number(), ax.number()])
Coord.parse([10, 20]) // ✓ [number, number]

// Wrong length
Coord.parse([1]) // ✗
Coord.parse([1, 2, 3]) // ✗

// Wrong type at position
Coord.parse(['x', 10]) // ✗
```

### union

Tries each schema in order. Returns the first one that succeeds.

```ts
const StrOrNum = ax.union([ax.string(), ax.number()])
StrOrNum.parse('hello') // 'hello'
StrOrNum.parse(42) // 42
StrOrNum.parse(true) // ✗
```

Useful for optional fields and discriminated unions:

```ts
const Event = ax.union([ax.object({ type: ax.literal('click'), x: ax.number(), y: ax.number() }), ax.object({ type: ax.literal('keydown'), key: ax.string() })])
```

### record

All values in an object must match the schema. Keys are always strings.

```ts
const Flags = ax.record(ax.boolean())
Flags.parse({ a: true, b: false }) // ✓
Flags.parse({ a: 1 }) // ✗
```

---

## Special Schemas

### literal

Accepts one specific value and nothing else.

```ts
ax.literal('admin').parse('admin') // ✓
ax.literal(42).parse(42) // ✓
ax.literal(true).parse(true) // ✓

ax.literal('admin').parse('user') // ✗
```

Works with `string | number | boolean | bigint | null`.

### instance

Validates using `instanceof`.

```ts
ax.instance(Date).parse(new Date()) // ✓
ax.instance(Date).parse('2024-01-01') // ✗

// Custom classes work too
class MyClass {
      constructor(public x: number) {}
}
ax.instance(MyClass).parse(new MyClass(5)) // ✓
```

Output type is inferred as the class's instance type.

---

## Default Values

When the input is `undefined`, you can supply a fallback.

### `.default(value)`

```ts
const s = ax.string().default('guest')

s.parse('alice') // 'alice'
s.parse(undefined) // 'guest'
s.parse(null) // ✗ (null is not undefined)
```

Default is applied before pipe operators run, so the operator sees the default:

```ts
const s = ax
      .string()
      .pipe(ax.operator((v) => v.toUpperCase()))
      .default('anon')

s.parse(undefined) // 'ANON'
```

### `.defaultFn(fn)`

Same idea, but calls a function each time a default is needed.

```ts
let counter = 0
const s = ax.number().defaultFn(() => ++counter)

s.parse(undefined) // 1
s.parse(undefined) // 2
```

Good for timestamps, IDs, random values.

---

## Pipes & Operators

Pipes let you add custom logic to any schema — validation, transformation, or both.

### Creating an Operator

Use `ax.operator()`:

```ts
const minLen = (n: number) =>
      ax.operator((v: string) => {
            if (v.length < n) throw `Min ${n} chars`
            return v
      })
```

It's just a function `(value) => newValue`. Throw an error to reject the value.

### Validation

```ts
const Name = ax.string().pipe(minLen(2))

Name.parse('Al') // ✓
Name.parse('A') // ✗ ValidationError (code: 'custom')
```

### Transformation

The type changes as you pipe:

```ts
const toArray = ax.operator((v: string) => v.split(',').map((s) => s.trim()))
const first = ax.operator((v: string[]) => v[0])
const upper = ax.operator((v: string) => v.toUpperCase())

const CsvFirst = ax
      .string()
      .pipe(toArray) // Schema<string[]>
      .pipe(first) // Schema<string>

CsvFirst.parse('a, b, c') // 'a'
```

### Chaining

```ts
const Processed = ax.string().pipe(minLen(2)).pipe(upper).pipe(toArray).pipe(first)

Processed.parse('john, bob') // 'JOHN'
```

### Type Safety

The operator's input type is checked against the schema's current output type:

```ts
const s = ax.string()
// @ts-expect-error — can't pipe a number operator from a string schema
s.pipe(ax.operator((v: number) => v * 2))
```

### Error Wrapping

Whatever your operator throws — string or Error — gets wrapped in a `ValidationError` with `code: 'custom'`. You never get raw thrown values leaking out of `.parse()`.

---

## Error Handling

`ValidationError` carries structured information.

```ts
import { ValidationError } from '@aromix/validator'

try {
      ax.object({ name: ax.string() }).parse({ name: 42 })
} catch (e) {
      const err = e as ValidationError

      err.name // 'ValidationError'
      err.message // "Expected string, received number at 'name'"
      err.issues // [{ code, path, message }]
}
```

### `ValidationIssue`

```ts
{
  code: 'invalidType',    // machine-readable
  path: ['name'],         // where the error happened
  message: string         // human-readable
}
```

### Error Codes

| Code               | When it happens                             |
| ------------------ | ------------------------------------------- |
| `'invalidType'`    | Wrong type (string instead of number, etc.) |
| `'invalidLiteral'` | Value doesn't match the literal             |
| `'custom'`         | Operator threw an error                     |

---

## Type Inference

Access the TypeScript type of any schema via `$infer`:

```ts
const User = ax.object({
      name: ax.string(),
      age: ax.number(),
})

type T = typeof User.$infer
// { name: string; age: number }
```

Works after pipes too:

```ts
const Slug = ax.string().pipe(ax.operator((v) => v.toLowerCase().replace(/\s+/g, '-')))

type T = typeof Slug.$infer // string
```

---

## The Public `.state` Property

Every schema exposes its internal config through `state`:

```ts
const s = ax.string().default('hello')
s.state.type // 'string'
s.state.default // { value: 'hello' }
```

Read-only inspection, useful for metaprogramming.

---

## Quick Patterns

**Optional field** (union with undefined):

```ts
ax.union([ax.string(), ax.undefined()])
```

**Nullable field** (union with null):

```ts
ax.union([ax.number(), ax.null()])
```

**Optional + default**:

```ts
ax.union([ax.literal('admin'), ax.literal('user'), ax.undefined()]).default('user')
```

**Enum-like**:

```ts
ax.union([ax.literal('draft'), ax.literal('published'), ax.literal('archived')])
```
