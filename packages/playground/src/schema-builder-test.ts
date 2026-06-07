import { ax } from '@aromix/validator'

const UserSchema = ax.object({
      id: ax.number(),
      name: ax.string(),
      email: ax.string(),
      role: ax.union([ax.literal('admin'), ax.literal('user'), ax.literal('moderator')]).default('user'),
      age: ax.union([ax.number(), ax.null()]),
      active: ax.boolean().default(true),
      score: ax.union([ax.number(), ax.null()]),
      bio: ax.union([ax.string(), ax.null()]),
      metadata: ax.union([ax.unknown(), ax.null()]),
      visits: ax.bigint().default(0n),
      createdAt: ax.string(),
      updatedAt: ax.string(),
})

// ── Select ──────────────────────────────────────────────────────────────

console.log('=== Select ===')

const validRow = {
      id: 1,
      name: 'Alice',
      email: 'alice@example.com',
      role: 'admin',
      age: 30,
      active: true,
      score: 99.5,
      bio: 'Hello world',
      metadata: new Uint8Array([1, 2, 3]),
      visits: 100n,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
}
console.log('valid row:', UserSchema.safeParse(validRow).success)

const rowWithNulls = { ...validRow, age: null, score: null, bio: null, metadata: null }
console.log('row with nulls:', UserSchema.safeParse(rowWithNulls).success)

const rowWithBadNull = { ...validRow, name: null }
console.log('row with null on notNull:', UserSchema.safeParse(rowWithBadNull).success)

// ── Insert ──────────────────────────────────────────────────────────────

console.log('\n=== Insert ===')

const minimalInsert = {
      name: 'Bob',
      email: 'bob@example.com',
}
console.log('minimal insert:', UserSchema.safeParse(minimalInsert).success)

const fullInsert = {
      ...validRow,
      id: 2,
      name: 'Bob',
      email: 'bob@example.com',
      role: 'moderator',
      age: 25,
      score: 50.5,
      bio: 'Some bio text',
      visits: 5n,
}
console.log('full insert:', UserSchema.safeParse(fullInsert).success)
console.log('missing name:', UserSchema.safeParse({ email: 'x@y.com' }).success)
