import { createSqliteAdapter, lite, SqliteEntity } from '@aromix/core'
import { ax } from '@aromix/validator'
import { createServer } from 'http'

const db = createSqliteAdapter({
    async query(sql) {
        return sql
    },
})

// ── User ──
const User = SqliteEntity({
    name: 'users',
    adapter: db,
    columns: {
        id: lite.int().primaryKey().autoIncrement(),
        name: lite.text().notNull().unique(),
        email: lite.text().notNull().unique('conflict:ignore'),
        age: lite.int().default(0),
        score: lite.real().default(0.0),
        bio: lite.text().default(''),
        avatar: lite.blob().notNull(),
        role: lite.text().notNull().default('user'),
    },
    options(ctx) {
        ctx.primaryKey(['id'])
        ctx.unique(['email'], 'conflict:ignore')
        ctx.index(['name', 'role'])
        ctx.uniqueIndex(['name', 'email'])
    },
})

// ── Post ──
const Post = Sqlite.entity({
    name: 'posts',
    adapter: db,
    columns: {
        id: lite.int().primaryKey().autoIncrement(),
        title: lite.text().notNull(),
        body: lite.text().default(''),
        published: lite.int().default(0).index(),
        userId: lite.int().notNull(),
    },
    options(ctx) {
        ctx.primaryKey(['id'])
        ctx.index(['userId', 'published'])
    },
})

// ── Comment ──
const Comment = Sqlite.entity({
    name: 'comments',
    adapter: db,
    columns: {
        id: lite.int().primaryKey().autoIncrement(),
        content: lite.text().notNull().minLength(1),
        postId: lite.int().notNull().index(),
        userId: lite.int().notNull(),
        likes: lite.int().default(0),
    },
    options(ctx) {
        ctx.primaryKey(['id'])
        ctx.uniqueIndex(['postId', 'userId'])
        ctx.gte('likes', 'id')
    },
})

// ── Tag ──
const Tag = Sqlite.entity({
    name: 'tags',
    adapter: db,
    columns: {
        id: lite.int().primaryKey().autoIncrement(),
        label: lite
            .text()
            .notNull()
            .pipe(
                ax.operator((value) => {
                    return [value]
                }),
            ),
        color: lite.text().default('#000000'),
        sortOrder: lite.int().default(0),
        userId: lite.int().references(User.col('id')),
    },
    options(ctx) {
        ctx.primaryKey(['id'])
        ctx.unique(['label'], 'conflict:error')
        ctx.gt('sortOrder', 'id')
    },
})

const schema = Tag.toSelectSchema()
type TestS = typeof schema.$infer

// ── PostTag (join table) ──
const PostTag = Sqlite.entity({
    name: 'post_tags',
    adapter: db,
    columns: {
        postId: lite.int().notNull(),
        tagId: lite.int().notNull(),
    },
    options(ctx) {
        ctx.uniqueIndex(['postId', 'tagId'])
        ctx.withoutRowId()
    },
})

// ── Log everything ──
console.log('── User ──')
console.dir(User.state)
console.log('col("name"):', User.col('name'))

console.log('\n── Post ──')
console.dir(Post.state)

console.log('\n── Comment ──')
console.dir(Comment.state)
console.log('col("postId"):', Comment.col('postId'))

console.log('\n── Tag ──')
console.dir(Tag.state)

console.log('\n── PostTag ──')
console.dir(PostTag.state)

// ── liteToAx type inference tests ──
// liteToAx now accepts a Chain directly for precise type inference
const intNotNull = liteToAx(lite.int().notNull())
type T1 = typeof intNotNull.$infer
//   ^? number  — int + notNull → required number

const intNullable = liteToAx(lite.int())
type T2 = typeof intNullable.$infer
//   ^? number | null  — int, no notNull → nullable number

const textNotNull = liteToAx(lite.text().notNull())
type T3 = typeof textNotNull.$infer
//   ^? string  — text + notNull → required string

const textNullable = liteToAx(lite.text())
type T4 = typeof textNullable.$infer
//   ^? string | null  — text, no notNull → nullable string

const realDefault = liteToAx(lite.real().default(0.0).notNull())
type T5 = typeof realDefault.$infer
//   ^? number  — real + notNull → required number, default 0.0

const blobNotNull = liteToAx(lite.blob().notNull())
type T6 = typeof blobNotNull.$infer
//   ^? Uint8Array  — blob + notNull → required Uint8Array

const blobNullable = liteToAx(lite.blob())
type T7 = typeof blobNullable.$infer
//   ^? Uint8Array | null  — blob, no notNull → nullable Uint8Array

console.log('\n── liteToAx type inference ──')
console.log('intNotNull parse(42):', intNotNull.parse(42))
console.log('intNullable parse(null):', intNullable.parse(null))
console.log('textNotNull parse("hi"):', textNotNull.parse('hi'))
console.log('realDefault parse(undefined):', realDefault.parse(undefined))

// ── Entity schema tests ──
const userSelect = User.toSelectSchema()
type SelectUser = typeof userSelect.$infer
//   ^? { id: number; name: string; email: string; age: number | null; score: number | null; bio: string | null; avatar: Uint8Array | null; role: string }

const userInsert = User.toInsertSchema()
type InsertUser = typeof userInsert.$infer
//   ^? { name: string; email: string; age?: number | null | undefined; score?: number | null | undefined; bio?: string | null | undefined; avatar?: Uint8Array | null | undefined; role?: string | undefined }
//   id is excluded (autoIncrement), fields with defaults are optional

const userUpdate = User.toUpdateSchema()
type UpdateUser = typeof userUpdate.$infer
//   ^? { id: number | undefined; name: string | undefined; email: string | undefined; age: number | null | undefined; score: number | null | undefined; bio: string | null | undefined; avatar: Uint8Array | null | undefined; role: string | undefined }

// Direct $infer* phantom types on entity (no .toXxxSchema().$infer needed)
type SelectUserDirect = typeof User.$inferSelect
type InsertUserDirect = typeof User.$inferInsert
type UpdateUserDirect = typeof User.$inferUpdate

console.log('\n── Entity schema tests ──')
console.log('User select parse valid:', userSelect.parse({ id: 1, name: 'Alice', email: 'a@b.com', age: null, score: null, bio: null, avatar: null, role: 'user' }))
console.log('User insert parse valid:', userInsert.parse({ name: 'Bob', email: 'b@c.com', role: 'admin' }))
console.log('User update parse valid:', userUpdate.parse({ id: 1, name: 'Alice' }))

// PostTag has no autoIncrement, so insert includes both columns
const ptInsert = PostTag.toInsertSchema()
type InsertPostTag = typeof ptInsert.$infer
//   ^? { postId: number; tagId: number } — both required, no autoIncrement

console.log('PostTag insert parse:', ptInsert.parse({ postId: 1, tagId: 2 }))

// ── Pipe transformation tests ──
const toUpper = ax.operator((v: string) => v.toUpperCase())
const toArray = ax.operator((v: string) => v.split(',').map((s) => s.trim()))

// Pipe on lite text: transforms string input to uppercase
const upperCol = lite.text().pipe(toUpper).notNull()
const upperSchema = liteToAx(upperCol)
type UpperType = typeof upperSchema.$infer
//   ^? string  — pipe transforms string→string (uppercase)
console.log('upper pipe parse("hello"):', upperSchema.parse('hello'))

// Pipe that changes type: string → string[]
const arrayCol = lite.text().pipe(toArray).notNull()
const arraySchema = liteToAx(arrayCol)
type ArrayType = typeof arraySchema.$infer
//   ^? string[]  — pipe transforms string→string[]
console.log('array pipe parse("a,b,c"):', arraySchema.parse('a,b,c'))

// Pipe on entity column: text stored as csv in DB, pipe transforms to array on read
const HasLabels = Sqlite.entity({
    name: 'has_labels',
    adapter: db,
    columns: {
        id: lite.int().primaryKey().autoIncrement(),
        labels: lite.text().notNull().pipe(toArray),
    },
    options(ctx) {
        ctx.primaryKey(['id'])
    },
})
const labelSelect = HasLabels.toSelectSchema()
type LabelRow = typeof labelSelect.$infer
//   ^? { id: number; labels: string[] } — pipe transforms text→string[]
// Input is a csv string (what the DB stores), output is an array after pipe transformation
console.log('entity pipe parse:', labelSelect.parse({ id: 1, labels: 'a,b,c' }))

const server = createServer((req, res) => {
    res.end('ok')
})

server.listen(3000)
