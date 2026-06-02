import { lite, SchemaBuilder } from '@aromix/core'
import * as v from 'valibot'

const userModel = {
   id:        lite.int().primaryKey().autoIncrement(),
   name:      lite.text().notNull().minLength(1).maxLength(100),
   email:     lite.text().notNull(),
   role:      lite.text().notNull().in(['admin', 'user', 'moderator']).default('user'),
   age:       lite.int().min(0).max(150),
   active:    lite.bool().notNull().default(true),
   score:     lite.real().min(0),
   bio:       lite.text().maxLength(500),
   metadata:  lite.blob(),
   visits:    lite.bigint().default(0n),
   createdAt: lite.date('iso').notNull().defaultFn(() => new Date()),
   updatedAt: lite.date('iso').notNull().defaultFn(() => new Date()).onUpdate(() => new Date()),
}

const schema = new SchemaBuilder(userModel)

const selectSchema = schema.select()
const insertSchema = schema.insert()
const updateSchema = schema.update()




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
   createdAt: new Date(),
   updatedAt: new Date(),
}
console.log('valid row:', v.safeParse(selectSchema, validRow).success)

const rowWithNulls = { ...validRow, age: null, score: null, bio: null, metadata: null }
console.log('row with nulls:', v.safeParse(selectSchema, rowWithNulls).success)

const rowWithBadNull = { ...validRow, name: null }
console.log('row with null on notNull:', v.safeParse(selectSchema, rowWithBadNull).success)

// ── Insert ──────────────────────────────────────────────────────────────

console.log('\n=== Insert ===')

const minimalInsert = {
   name: 'Bob',
   email: 'bob@example.com',
}
console.log('minimal insert:', v.safeParse(insertSchema, minimalInsert).success)

const fullInsert = {
   name: 'Bob',
   email: 'bob@example.com',
   role: 'moderator',
   age: 25,
   score: 50.5,
   bio: 'Some bio text',
   visits: 5n,
}

const parsed =selectSchema['~types']

console.log('full insert:', v.safeParse(insertSchema, fullInsert).success)

console.log('missing name:', v.safeParse(insertSchema, { email: 'x@y.com' }).success)
console.log('invalid role:', v.safeParse(insertSchema, { name: 'X', email: 'x@y.com', role: 'superadmin' }).success)
console.log('age too high:', v.safeParse(insertSchema, { name: 'X', email: 'x@y.com', age: 200 }).success)

// ── Update ──────────────────────────────────────────────────────────────

console.log('\n=== Update ===')

console.log('empty update:', v.safeParse(updateSchema, {}).success)
console.log('partial update:', v.safeParse(updateSchema, { name: 'Charlie' }).success)
console.log('invalid role update:', v.safeParse(updateSchema, { role: 'superadmin' }).success)
console.log('negative age:', v.safeParse(updateSchema, { age: -5 }).success)
console.log('empty name:', v.safeParse(updateSchema, { name: '' }).success)

// ── Type inference ──────────────────────────────────────────────────────

console.log('\n=== Type Inference ===')

type SelectType = v.InferOutput<typeof selectSchema>
type InsertType = v.InferInput<typeof insertSchema>
type UpdateType = v.InferInput<typeof updateSchema>

const _selectCheck: SelectType = {
   id: 1,
   name: 'Alice',
   email: 'a@b.com',
   role: 'admin',
   age: 30,
   active: true,
   score: 1.5,
   bio: 'hi',
   metadata: new Uint8Array(),
   visits: 10n,
   createdAt: new Date(),
   updatedAt: new Date(),
}
console.log('select type checks:', typeof _selectCheck)

const _insertCheck: InsertType = {
   name: 'Alice',
   email: 'a@b.com',
}
console.log('insert type checks:', typeof _insertCheck)

const _updateCheck: UpdateType = {
   name: 'Alice',
}
console.log('update type checks:', typeof _updateCheck)
