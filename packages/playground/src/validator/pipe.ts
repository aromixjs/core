import { ax, ValidationError } from '@aromix/validator'

// ── Defining operators ─────────────────────────────────────

const minLen = (n: number) =>
      ax.operator((v: string) => {
            if (v.length < n) throw `Min ${n} chars`
            return v
      })

const toArray = ax.operator((v: string) => v.split(',').map((s) => s.trim()))
const first = ax.operator((v: string[]) => {
      if (v.length === 0) throw 'Array is empty'
      return v[0]
})
const upper = ax.operator((v: string) => v.toUpperCase())

// ── Runtime type checking ──────────────────────────────────

console.log('\n── Type check throws ValidationError ──')
try {
      ax.number().parse('not a number')
} catch (e) {
      const err = e as ValidationError
      console.log(err.message) // 'Expected number, received string'
      console.log(err.issues[0]) // { code: 'invalidType', path: [], message: '...' }
}

// ── parse (throws on failure) ──────────────────────────────

const Name = ax.string().pipe(minLen(2)).pipe(minLen(5))

console.log('\n── parse throws ValidationError ──')
console.log(Name.parse('Rifat')) // 'Rifat'

try {
      Name.parse('X')
} catch (e) {
      const err = e as ValidationError
      console.log(err.message) // 'Min 2 chars'
      console.log(err.issues[0].code) // 'custom'
}

// ── safeParse (never throws) ───────────────────────────────

const SafeName = ax.string().pipe(minLen(2)).default('anon')

console.log('\n── safeParse success ──')
const r1 = SafeName.safeParse('hi')
if (r1.success) {
      console.log(r1.data.toUpperCase()) // 'HI'
}

console.log('\n── safeParse failure ──')
const r2 = SafeName.safeParse('x')
if (!r2.success) {
      console.log(r2.errors) // ['Min 2 chars']
}

console.log('\n── safeParse with default ──')
const r3 = SafeName.safeParse(undefined)
if (r3.success) {
      console.log(r3.data) // 'anon'
}

// ── Type transformation ────────────────────────────────────

const CsvFirst = ax
      .string()
      .pipe(toArray) // Schema<string[]>
      .pipe(first) // Schema<string>

console.log('\n── Transformation ──')
console.log(CsvFirst.parse('a, b, c')) // 'a'

// ── Long chain ─────────────────────────────────────────────

const Processed = ax
      .string()
      .pipe(minLen(2))
      .pipe(upper) // string → string
      .pipe(toArray) // string → string[]
      .pipe(first) // string[] → string

console.log('\n── Long chain ──')
console.log(Processed.parse('john, bob')) // 'JOHN'

// ── Nested in objects ──────────────────────────────────────

const User = ax.object({
      name: ax.string().pipe(minLen(2)),
      tags: ax.string().pipe(toArray),
})

console.log('\n── Object with pipes ──')
console.log(User.parse({ name: 'Alex', tags: 'admin, editor' }))

// ── Object runtime validation ──────────────────────────────

console.log('\n── Object validation fails ──')
const fail = User.safeParse({ name: 123, tags: 'x' })
if (!fail.success) {
      console.log(fail.errors)
}

// ── Combine with default ───────────────────────────────────

const WithDefault = ax.string().pipe(minLen(2)).default('guest')

console.log('\n── With default ──')
console.log(WithDefault.parse(undefined)) // 'guest'
console.log(WithDefault.parse('alex')) // 'alex'
