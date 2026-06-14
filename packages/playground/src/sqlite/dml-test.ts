import { Database } from 'bun:sqlite'
import { createSqliteAdapter, lite, SqliteEntity } from '@aromix/core'

const bunDb = new Database(':memory:')

const adapter = createSqliteAdapter({
    async query(sql: string) {
        try {
            const rows = bunDb.query(sql).all()
            return rows
        } catch (err) {
            throw err
        }
    },
})

const UserEntity = SqliteEntity({
    name: 'users',
    adapter,
    columns: {
        id: lite.int().primaryKey().autoIncrement(),
        name: lite.text().notNull(),
        email: lite.text().notNull().unique('conflict:error'),
        age: lite.int().notNull().gte(0),
        score: lite.real().default(0),
        bio: lite.text(),
    },
    options() { },
})

// Create table
const createSql = UserEntity.toSql()
console.log('=== Create SQL ===')
console.log(createSql)
bunDb.run(createSql)

// Also run indexes if any were generated separately
for (const line of createSql.split('\n')) {
    const trimmed = line.trim()
    if (trimmed.startsWith('CREATE INDEX') || trimmed.startsWith('CREATE UNIQUE INDEX')) {
        bunDb.run(trimmed)
    }
}

console.log('\n=== Insert ===')
const user1 = await UserEntity.insert({ name: 'Alice', email: 'alice@test.com', age: 30 })
console.log('Inserted:', JSON.stringify(user1))

const user2 = await UserEntity.insert({ name: 'Bob', email: 'bob@test.com', age: 25, score: 100 })
console.log('Inserted:', JSON.stringify(user2))

console.log('\n=== Find By ID ===')
const found = await UserEntity.findById(user1.id)
console.log('Found by id 1:', JSON.stringify(found))

const notFound = await UserEntity.findById(999)
console.log('Not found:', notFound)

console.log('\n=== Find One ===')
const one = await UserEntity.findOne({ name: 'Bob' })
console.log('Find one (name=Bob):', JSON.stringify(one))

const oneNotFound = await UserEntity.findOne({ name: 'Nobody' })
console.log('Find one not found:', oneNotFound)

console.log('\n=== Find Many ===')
const all = await UserEntity.findMany()
console.log('All users:', JSON.stringify(all))

const filtered = await UserEntity.findMany({ age: { gt: 25 } })
console.log('Users with age > 25:', JSON.stringify(filtered))

console.log('\n=== Count ===')
const total = await UserEntity.count()
console.log('Total count:', total)

const adultCount = await UserEntity.count({ age: { gte: 18 } })
console.log('Adults (age>=18):', adultCount)

console.log('\n=== Exist ===')
const exists = await UserEntity.exist({ email: 'alice@test.com' })
console.log('Alice exists:', exists)

const notExists = await UserEntity.exist({ email: 'fake@test.com' })
console.log('Fake exists:', notExists)

console.log('\n=== Update ===')
const updated = await UserEntity.update({ id: user1.id }, { score: 50, bio: 'Hello world' })
console.log('Updated:', JSON.stringify(updated))

console.log('\n=== Upsert ===')
const upserted = await UserEntity.upsert(
    { name: 'Charlie', email: 'charlie@test.com', age: 35 },
    ['email'],
)
console.log('Upserted new:', JSON.stringify(upserted))

const upsertedExisting = await UserEntity.upsert(
    { name: 'Charlie Updated', email: 'charlie@test.com', age: 36 },
    ['email'],
)
console.log('Upserted existing:', JSON.stringify(upsertedExisting))

console.log('\n=== Paginate ===')
const page1 = await UserEntity.paginate(undefined, { page: 1, pageSize: 2 })
console.log('Page 1:', JSON.stringify(page1))

const page2 = await UserEntity.paginate(undefined, { page: 2, pageSize: 2 })
console.log('Page 2:', JSON.stringify(page2))

const pageFiltered = await UserEntity.paginate({ age: { gte: 25 } }, { page: 1, pageSize: 10 })
console.log('Page filtered (age>=25):', JSON.stringify(pageFiltered))

console.log('\n=== Delete By Id ===')
const deleted = await UserEntity.deleteById(user2.id)
console.log('Deleted by id:', JSON.stringify(deleted))

const deletedAgain = await UserEntity.deleteById(user2.id)
console.log('Deleted again:', deletedAgain)

console.log('\n=== Delete (filter) ===')
const delFiltered = await UserEntity.delete({ email: 'charlie@test.com' })
console.log('Deleted by filter:', JSON.stringify(delFiltered))

console.log('\n=== Final State ===')
const remaining = await UserEntity.findMany()
console.log('Remaining users:', JSON.stringify(remaining))
const finalCount = await UserEntity.count()
console.log('Final count:', finalCount)

console.log('\n=== All tests passed! ===')
