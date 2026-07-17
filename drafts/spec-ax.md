# ax

Schema validation library. Every schema is a 1:1 runtime mapping of a TypeScript type. The core only establishes types. Everything else — validation, transformation, error control — goes through operators and `.pipe()`.

---

## Primitives

| Schema           | Runtime check                        | TS type     |
| ---------------- | ------------------------------------ | ----------- |
| `ax.string()`    | `typeof x === 'string'`              | `string`    |
| `ax.number()`    | `typeof x === 'number' && !isNaN(x)` | `number`    |
| `ax.boolean()`   | `typeof x === 'boolean'`             | `boolean`   |
| `ax.bigint()`    | `typeof x === 'bigint'`              | `bigint`    |
| `ax.symbol()`    | `typeof x === 'symbol'`              | `symbol`    |
| `ax.null()`      | `x === null`                         | `null`      |
| `ax.undefined()` | `x === undefined`                    | `undefined` |
| `ax.unknown()`   | always passes                        | `unknown`   |
| `ax.never()`     | always fails                         | `never`     |

Every primitive accepts `.message()` to override the default error when the type check fails:

```ts
ax.string()
ax.number()
```

---

## Literal

Exact value match. Inferred type is the value itself.

```ts
ax.literal('admin') // → 'admin'
ax.literal(42) // → 42
ax.literal(true) // → true
ax.literal(0n) // → 0n
```

---

## Nullability & defaults

Chained on any schema. Each changes `$infer`.

```ts
.optional()            // T → T | undefined
.nullable()            // T → T | null
.nullish()             // T → T | null | undefined
.default(value)        // T | undefined → T  (absent input uses the default)
.defaultFn(() => value)  // lazy default — function called fresh each time
```

```ts
ax.string().optional() // string | undefined
ax.number().nullable() // number | null
ax.string().default('guest') // string  (never undefined in output)
ax.array(ax.string()).defaultFn(() => []) // fresh array each time
```

---

## Object

Validates a plain object. Undeclared keys are dropped from the output — the output shape is exactly what the schema declares.

```ts
ax.object({
    id: ax.number(),
    name: ax.string(),
    email: ax.string(),
    role: ax.union([ax.literal('admin'), ax.literal('user')]),
    bio: ax.string().optional(),
})
```

### Object modifiers

All return a new schema. Originals are never mutated.

| Method                 | TS equivalent         | Notes                            |
| ---------------------- | --------------------- | -------------------------------- |
| `.pick(['a', 'b'])`    | `Pick<T, 'a' \| 'b'>` | keep only listed fields          |
| `.omit(['a', 'b'])`    | `Omit<T, 'a' \| 'b'>` | remove listed fields             |
| `.partial()`           | `Partial<T>`          | all fields optional              |
| `.partial(['a', 'b'])` | selective             | only listed fields optional      |
| `.required()`          | `Required<T>`         | strip all optional wrappers      |
| `.readonly()`          | `Readonly<T>`         | type-level only, no runtime cost |

```ts
const User = ax.object({
    id: ax.number(),
    name: ax.string(),
    email: ax.string(),
    password: ax.string(),
    createdAt: ax.date(),
})

// safe to send to client — no password, no timestamps
const PublicUser = User.omit(['password', 'createdAt'])

// all fields optional for PATCH
const UserPatch = User.omit(['id', 'createdAt']).partial()

// only name and email optional
const UserUpdate = User.partial(['name', 'email'])
```

---

## ax.merge

Merges multiple object schemas into one. Applied left to right — later schemas win on key conflict. Replaces `.extend()` and field spreading.

```ts
ax.merge([schemaA, schemaB, ...])
```

```ts
const BaseEntity = ax.object({
    id: ax.number(),
    createdAt: ax.coerce.date(),
    updatedAt: ax.coerce.date(),
})

const SoftDelete = ax.object({
    deletedAt: ax.date().nullable(),
    deletedBy: ax.number().nullable(),
})

const PostFields = ax.object({
    title: ax.string(),
    body: ax.string(),
    status: ax.union([ax.literal('draft'), ax.literal('published'), ax.literal('archived')]),
})

// full db model
const Post = ax.merge([BaseEntity, SoftDelete, PostFields])

// what the client sends on create — no server-set fields
const CreatePost = ax.merge([PostFields]).omit(['status'])

// what the client sends on update — all optional
const UpdatePost = PostFields.partial()

// what gets returned in API response
const PostResponse = ax.merge([BaseEntity, PostFields])
```

---

## Array

```ts
ax.array(schema) // → T[]
```

```ts
ax.array(ax.string()) // string[]
ax.array(ax.number()).optional() // number[] | undefined
ax.array(ax.object({ id: ax.number(), name: ax.string() })) // { id: number, name: string }[]
```

---

## Tuple

Fixed-length array, each position independently typed.

```ts
ax.tuple([ax.string(), ax.number(), ax.boolean()]) // → [string, number, boolean]
```

```ts
const Coord = ax.tuple([ax.number(), ax.number()]) // [number, number]
const RGBColor = ax.tuple([ax.number(), ax.number(), ax.number()]) // [number, number, number]
const NamedPair = ax.tuple([ax.string(), ax.unknown()]) // [string, unknown]
```

---

## Record

Dynamic keys, uniform value type.

```ts
ax.record(keySchema, valueSchema) // → Record<K, V>
```

Key schema must resolve to `string`, `number`, or `symbol`.

```ts
ax.record(ax.string(), ax.number()) // Record<string, number>
ax.record(ax.string(), ax.array(ax.string())) // Record<string, string[]>

// config map
const Config = ax.record(ax.string(), ax.unknown())
```

---

## Union

Tries each schema in order. First match wins.

```ts
ax.union([schemaA, schemaB]) // → A | B
```

No `ax.enum` — a union of literals covers it with an identical inferred type:

```ts
const Status = ax.union([ax.literal('draft'), ax.literal('published'), ax.literal('archived')])
// → 'draft' | 'published' | 'archived'

// mixed types
const StringOrNumber = ax.union([ax.string(), ax.number()])

// nullable via union (or just use .nullable())
const MaybeString = ax.union([ax.string(), ax.null()])
```

---

## Date

```ts
ax.date() // → Date
```

`instanceof Date && !isNaN(x.getTime())`. The extra check is necessary — `new Date('invalid')` passes `instanceof Date` but is not a valid date.

---

## instanceof

For any class.

```ts
ax.instanceof(Constructor) // → InstanceType<typeof Constructor>
```

```ts
ax.instanceof(File)
ax.instanceof(Blob)
ax.instanceof(ArrayBuffer)

class Money {
    constructor(
        public amount: number,
        public currency: string,
    ) {}
}
ax.instanceof(Money) // → Money
```

---

## Lazy

For recursive schemas. Pass a function that returns the schema.

```ts
const Category: ax.AnySchema = ax.lazy(() =>
    ax.object({
        id: ax.number(),
        name: ax.string(),
        children: ax.array(Category),
    }),
)

const TreeNode: ax.AnySchema = ax.lazy(() =>
    ax.object({
        value: ax.unknown(),
        left: ax.lazy(() => TreeNode).optional(),
        right: ax.lazy(() => TreeNode).optional(),
    }),
)
```

---

## Coercions

Convert from one JS type to another before validation. The inferred input type changes — the output type is the target type. Use at API and form boundaries where input is not yet the right JS type.

```ts
ax.coerce.string() // number | boolean | bigint → string
ax.coerce.number() // string → number
ax.coerce.boolean() // 0/1 → boolean, "true"/"false"/"yes"/"no"/"on"/"off" → boolean
ax.coerce.date() // ISO 8601 string | unix-ms integer → Date
ax.coerce.bigint() // number | string → bigint
```

All chain methods available after coercion:

```ts
// HTML form — everything arrives as a string
const RegistrationForm = ax.object({
    age: ax.coerce.number(),
    isAdmin: ax.coerce.boolean().default(false),
    joinedAt: ax.coerce.date(),
})

// database row — status stored as 0/1
const DbUser = ax.object({
    id: ax.coerce.number(),
    active: ax.coerce.boolean(),
    createdAt: ax.coerce.date(),
})

// query string params
const PaginationQuery = ax.object({
    page: ax.coerce.number().default(1),
    limit: ax.coerce.number().default(20),
})
```

---

## Operators

Operators are the single extension point for everything after the type check: validation, transformation, and value coercion. They are reusable and composable.

### Defining an operator

```ts
ax.operator({
    validate(value) {
        // return a value   → passes, $infer becomes the return type
        // return ax.fail() → fails with the operator's default message
        // return ax.fail('explicit message') → fails with this message
        // return nothing   → passes, value unchanged
    },
    message: 'default error message used when ax.fail() is called with no argument',
})
```

### Using operators with .pipe()

`.pipe()` chains one operator at a time. Each operator receives the output of the previous step.

```ts
schema.pipe(op).pipe(op).pipe(op)
```

`$infer` becomes the return type of the last operator in the chain.

---

### Validation operators

Return nothing to pass, `ax.fail()` to reject. `$infer` does not change.

```ts
const isInt = ax.operator({
    message: 'Must be a whole number',
    validate(v: number) {
        if (!Number.isInteger(v)) return ax.fail()
    },
})

const isPositive = ax.operator({
    message: 'Must be greater than zero',
    validate(v: number) {
        if (v <= 0) return ax.fail()
    },
})

const email = ax.operator({
    message: 'Invalid email address',
    validate(v: string) {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return ax.fail()
    },
})

const uuid = ax.operator({
    message: 'Invalid UUID',
    validate(v: string) {
        if (!/^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(v)) return ax.fail()
    },
})

// usage
const UserSchema = ax.object({
    id: ax.number().pipe(isInt).pipe(isPositive),
    email: ax.string().pipe(email),
})
```

---

### Transformation operators

Return a new value. `$infer` becomes the return type.

```ts
const trim = ax.operator({
    validate(v: string) {
        return v.trim()
    },
})

const lowercase = ax.operator({
    validate(v: string) {
        return v.toLowerCase()
    },
})

const uppercase = ax.operator({
    validate(v: string) {
        return v.toUpperCase()
    },
})

const toNumber = ax.operator({
    message: 'Must be a numeric string',
    validate(v: string) {
        const n = Number(v)
        if (isNaN(n)) return ax.fail()
        return n // $infer becomes number
    },
})

const splitComma = ax.operator({
    validate(v: string) {
        return v
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        // $infer becomes string[]
    },
})

// usage
const Tags = ax.string().pipe(trim).pipe(splitComma)
// typeof Tags.$infer → string[]

const Slug = ax.string().pipe(trim).pipe(lowercase)
// typeof Slug.$infer → string
```

---

### Operator factories

A factory is a plain function that takes arguments and returns an operator:

```ts
const min = (n: number) =>
    ax.operator({
        message: `Must be at least ${n}`,
        validate(v: number) {
            if (v < n) return ax.fail()
        },
    })

const max = (n: number) =>
    ax.operator({
        message: `Must be at most ${n}`,
        validate(v: number) {
            if (v > n) return ax.fail()
        },
    })

const minLen = (n: number) =>
    ax.operator({
        message: `Must be at least ${n} characters`,
        validate(v: string) {
            if (v.length < n) return ax.fail()
        },
    })

const maxLen = (n: number) =>
    ax.operator({
        message: `Must be at most ${n} characters`,
        validate(v: string) {
            if (v.length > n) return ax.fail()
        },
    })

const oneOf = (vals: string[]) =>
    ax.operator({
        message: `Must be one of: ${vals.join(', ')}`,
        validate(v: string) {
            if (!vals.includes(v)) return ax.fail()
        },
    })

const maxSize = (bytes: number) =>
    ax.operator({
        message: `File must be under ${Math.round(bytes / 1024 / 1024)}MB`,
        validate(v: Blob) {
            if (v.size > bytes) return ax.fail()
        },
    })

// usage

const UsernameField = ax.string().pipe(trim).pipe(minLen(3)).pipe(maxLen(32))
const CountryField = ax.string().pipe(oneOf(['US', 'GB', 'BD', 'IN']))
const AvatarField = ax.instanceof(Blob).pipe(maxSize(5 * 1024 * 1024))
```

---

### Cross-field validation

An operator applied to an object schema receives the whole object. Use `ax.fail(message, { path })` to attach the error to a specific field:

```ts
const ResetPassword = ax
    .object({
        password: ax.string().pipe(minLen(8)),
        confirmPassword: ax.string(),
    })
    .pipe(
        ax.operator({
            validate(d) {
                if (d.password !== d.confirmPassword) return ax.fail('Passwords do not match', { path: ['confirmPassword'] })
            },
        }),
    )

const DateRange = ax
    .object({
        from: ax.date(),
        to: ax.date(),
    })
    .pipe(
        ax.operator({
            validate(d) {
                if (d.to <= d.from) return ax.fail('End date must be after start date', { path: ['to'] })
            },
        }),
    )
```

---

## Parsing

```ts
schema.parse(value)
// → T  or throws ValidationError

schema.safeParse(value)
// → { ok: true, value: T }
// → { ok: false, error: ValidationError, issues: ValidationIssue[] }
```

All issues are collected before returning — a single parse never short-circuits on the first failure. A form with five invalid fields gets five issues back, not one.

```ts
const result = UserSchema.safeParse(req.body)

if (!result.ok) {
    // map issues to field errors
    const fieldErrors = Object.fromEntries(result.issues.map((i) => [i.path.join('.'), i.message]))
    return res.status(422).json({ errors: fieldErrors })
}

// result.value is fully typed as typeof UserSchema.$infer
const user = result.value
```

---

## Errors

```ts
interface ValidationIssue {
    path: (string | number)[] // field path, e.g. ['address', 'zip']
    code: IssueCode
    message: string
    received: unknown // the actual value that failed
}
```

| Code              | When                                              |
| ----------------- | ------------------------------------------------- |
| `invalid_type`    | type check failed (`typeof`, `instanceof`, `===`) |
| `invalid_literal` | literal value did not match                       |
| `invalid_union`   | no branch in `ax.union` matched                   |
| `missing_key`     | required object field was absent                  |
| `coerce_failed`   | `ax.coerce.*` could not convert the input         |
| `custom`          | operator returned `ax.fail(...)`                  |

---

## Inference

Every schema exposes `$infer`. Use `typeof schema.$infer` to get the output type — no generics needed.

```ts
const UserSchema = ax.object({
    id: ax.number(),
    name: ax.string(),
    role: ax.union([ax.literal('admin'), ax.literal('user')]),
})

type User = typeof UserSchema.$infer
// → { id: number; name: string; role: 'admin' | 'user' }

type Status = typeof Status.$infer // 'draft' | 'published' | 'archived'
type Coord = typeof Coord.$infer // [number, number]
type Tags = typeof Tags.$infer // string[]  (after .pipe(splitComma))
```

`$infer` is always the final output type — post-transform if a transform operator is in the chain.

For generic utilities:

```ts
function validate<S extends ax.AnySchema>(schema: S, value: unknown): S['$infer'] {
    return schema.parse(value)
}

function isValid<S extends ax.AnySchema>(schema: S, value: unknown): value is S['$infer'] {
    return schema.safeParse(value).ok
}
```

---

## Introspection

Every schema exposes `.meta()` — a plain serialisable object. The framework reads this to emit SDK client types, OpenAPI JSON Schema, and form field descriptors. Never touches the TypeScript compiler.

```ts
ax.string().meta()
// { type: 'string', optional: false, nullable: false }

ax.string().optional().meta()
// { type: 'string', optional: true, nullable: false }

ax.number().nullable().meta()
// { type: 'number', optional: false, nullable: true }

ax.object({ id: ax.number(), name: ax.string() }).meta()
// { type: 'object', fields: { id: { type: 'number' }, name: { type: 'string' } } }

ax.array(ax.string()).meta()
// { type: 'array', element: { type: 'string' } }

ax.tuple([ax.string(), ax.number()]).meta()
// { type: 'tuple', schemas: [{ type: 'string' }, { type: 'number' }] }

ax.record(ax.string(), ax.number()).meta()
// { type: 'record', key: { type: 'string' }, value: { type: 'number' } }

ax.union([ax.literal('a'), ax.literal('b')]).meta()
// { type: 'union', schemas: [{ type: 'literal', value: 'a' }, { type: 'literal', value: 'b' }] }
```

---

## Future — v2

> Not in v1. Planned once core is stable.

### ax.all

Runs multiple operators against the same input value. Collects every failure — does not short-circuit. Use when you want to report all constraint violations at once.

```ts
// sequential .pipe stops at first failure
// ax.all runs everything and returns all errors
ax.string().pipe(ax.all([minLen(8), hasUppercase, hasDigit, hasSymbol]))
```

### ax.any

Passes if at least one operator passes. Fails only if all fail.

```ts
// accepts email OR phone number
ax.string().pipe(ax.any([email, phoneNumber]))
```

### ax.when

Runs an operator only when a condition passes.

```ts
ax.when(predicate, operator)
ax.when(predicate, operator, elseOperator)
```

```ts
const AgeField= ax.number().pipe([
  isInt
  min(13)
  max(120)
])
```
