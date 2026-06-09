import { lite, Sqlite } from '@aromix/core'
import { createServer } from 'http'

const db = Sqlite.adapter({
    async query(sql) {
        return sql
    },
})

// ── User ──
const User = Sqlite.entity({
    name: 'users',
    adapter: db,
    columns: {
        id: lite.int().primaryKey().autoIncrement(),
        name: lite.text().notNull().unique(),
        email: lite.text().notNull().unique('conflict:ignore'),
        age: lite.int().default(0),
        score: lite.real().default(0.0),
        bio: lite.text().default(''),
        avatar: lite.blob(),
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
        label: lite.text().notNull(),
        color: lite.text().default('#000000'),
        sortOrder: lite.int().default(0),
        userId: lite.int().references(User.col('id'))
    },
    options(ctx) {
        ctx.primaryKey(['id'])
        ctx.unique(['label'], 'conflict:error')
        ctx.gt('sortOrder', 'id')
    },
})

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


const server = createServer((req, res) => {
    res.end('ok')

})


server.listen(3000)