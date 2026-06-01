import { ax } from "./lib/ax"

// ── Primitives ──────────────────────────────────────────────────

ax.string().message('Enter a valid string')
ax.number().message('Enter a valid number')
ax.boolean()
ax.bigint()
ax.symbol()
ax.null()
ax.undefined()
ax.unknown()
ax.never()

// ── Literal ─────────────────────────────────────────────────────

ax.literal('admin')
ax.literal(42)
ax.literal(true)
ax.literal(0n)

// ── Nullability & defaults ──────────────────────────────────────

ax.string().optional()
ax.number().nullable()
ax.string().nullish()
ax.string().default('guest')
ax.array(ax.string()).default(() => [])
ax.number().default(0).optional()

// ── Object ──────────────────────────────────────────────────────

const User = ax.object({
  id: ax.number(),
  name: ax.string(),
  email: ax.string(),
  role: ax.union([ax.literal('admin'), ax.literal('user')]),
  bio: ax.string().optional(),
})

User.pick(['id', 'name', 'email'])
User.omit(['password'])
User.partial()
User.partial(['name', 'email'])
User.required()
User.readonly()

const UserPatch = User.omit(['id']).partial()

// ── Merge ───────────────────────────────────────────────────────

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

const Post = ax.merge([BaseEntity, SoftDelete, PostFields])
const CreatePost = ax.merge([PostFields]).omit(['status'])

// ── Array / Tuple / Record / Union ──────────────────────────────

ax.array(ax.string())
ax.tuple([ax.string(), ax.number()])
ax.record(ax.string(), ax.number())
ax.union([ax.literal('draft'), ax.literal('published'), ax.literal('archived')])

// ── Date / instanceof / Lazy ────────────────────────────────────

ax.date()
ax.instanceof(Blob)
ax.instanceof(File)

class Money {
  constructor(public amount: number, public currency: string) {}
}
ax.instanceof(Money)

const Category: unknown = ax.lazy(() =>
  ax.object({
    id: ax.number(),
    name: ax.string(),
    children: ax.array(Category as any),
  })
)

// ── Coercions ───────────────────────────────────────────────────

ax.coerce.string()
ax.coerce.number()
ax.coerce.boolean()
ax.coerce.date()
ax.coerce.bigint()

ax.coerce.number().default(0)
ax.coerce.boolean().default(false)

const RegistrationForm = ax.object({
  age: ax.coerce.number(),
  isAdmin: ax.coerce.boolean().default(false),
  joinedAt: ax.coerce.date(),
})

// ── Operators & pipe ────────────────────────────────────────────

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

const trim = ax.operator({
  validate(v: string) { return v.trim() },
})

const lowercase = ax.operator({
  validate(v: string) { return v.toLowerCase() },
})

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

ax.number().pipe(isInt).pipe(isPositive)
ax.number().pipe(isInt).pipe(min(13)).pipe(max(120))
ax.string().pipe(trim).pipe(lowercase)
ax.string().pipe(trim).pipe(minLen(3))

// Cross-field operator on object
const ResetPassword = ax.object({
  password: ax.string().pipe(minLen(8)),
  confirmPassword: ax.string(),
}).pipe(ax.operator({
  validate(d: { password: string; confirmPassword: string }) {
    if (d.password !== d.confirmPassword) {
      return ax.fail('Passwords do not match', { path: ['confirmPassword'] })
    }
  },
}))

// ── Parsing & introspection ─────────────────────────────────────

User.parse({ id: 1, name: 'Alice', email: 'alice@test.com', role: 'admin' })
User.safeParse({ id: 1, name: 'Alice', email: 'alice@test.com', role: 'admin' })

ax.string().meta()
ax.string().optional().meta()
ax.number().nullable().meta()
ax.array(ax.string()).meta()
ax.tuple([ax.string(), ax.number()]).meta()
ax.record(ax.string(), ax.number()).meta()
ax.union([ax.literal('a'), ax.literal('b')]).meta()
