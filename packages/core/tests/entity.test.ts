import { describe, it, expect, expectTypeOf } from 'vitest'

import { ax } from '@aromix/validator'
import { lite, SqliteEntity, AxConverter } from '../src'

const db = {
    async query(sql: string) {
        return sql
    },
}

describe('SqliteEntity — basic creation', () => {
    it('creates an entity with name', () => {
        const E = SqliteEntity({
            name: 'users',
            adapter: db,
            columns: { id: lite.int().primaryKey().autoIncrement() },
            options(ctx) {
                ctx.primaryKey(['id'])
            },
        })
        expect(E.state.name).toBe('users')
    })

    it('creates an entity with multiple columns', () => {
        const User = SqliteEntity({
            name: 'users',
            adapter: db,
            columns: {
                id: lite.int().primaryKey().autoIncrement(),
                name: lite.text().notNull(),
                email: lite.text().notNull().unique('conflict:error'),
            },
            options(ctx) {
                ctx.primaryKey(['id'])
                ctx.unique({ name: 'u_email', cols: ['email'], conflict: 'conflict:error' })
            },
        })
        expect(Object.keys(User.state.columns)).toEqual(['id', 'name', 'email'])
    })
})

describe('SqliteEntity — table constraints', () => {
    it('primaryKey constraint is stored', () => {
        const E = SqliteEntity({
            name: 't',
            adapter: db,
            columns: { id: lite.int().primaryKey(), name: lite.text() },
            options(ctx) {
                ctx.primaryKey(['id'])
            },
        })
        expect(E.state.primaryKey).toEqual([{ cols: ['id'] }])
    })

    it('unique constraint is stored with name and conflict', () => {
        const E = SqliteEntity({
            name: 't',
            adapter: db,
            columns: { email: lite.text().notNull() },
            options(ctx) {
                ctx.unique({ name: 'u_email', cols: ['email'], conflict: 'conflict:error' })
            },
        })
        expect(E.state.unique).toEqual([{ name: 'u_email', cols: ['email'], conflict: 'conflict:error' }])
    })

    it('unique constraint with non-default conflict strategy', () => {
        const E = SqliteEntity({
            name: 't',
            adapter: db,
            columns: { email: lite.text().notNull() },
            options(ctx) {
                ctx.unique({ name: 'u_email', cols: ['email'], conflict: 'conflict:ignore' })
            },
        })
        expect(E.state.unique).toEqual([{ name: 'u_email', cols: ['email'], conflict: 'conflict:ignore' }])
    })

    it('index constraint is stored with name', () => {
        const E = SqliteEntity({
            name: 't',
            adapter: db,
            columns: { name: lite.text(), role: lite.text() },
            options(ctx) {
                ctx.index({ name: 'idx_name_role', cols: ['name', 'role'] })
            },
        })
        expect(E.state.index).toEqual([{ name: 'idx_name_role', cols: ['name', 'role'] }])
    })

    it('uniqueIndex constraint is stored with name', () => {
        const E = SqliteEntity({
            name: 't',
            adapter: db,
            columns: { a: lite.int(), b: lite.int() },
            options(ctx) {
                ctx.uniqueIndex({ name: 'uidx_a_b', cols: ['a', 'b'] })
            },
        })
        expect(E.state.uniqueIndex).toEqual([{ name: 'uidx_a_b', cols: ['a', 'b'] }])
    })

    it('withoutRowId is stored', () => {
        const E = SqliteEntity({
            name: 't',
            adapter: db,
            columns: { id: lite.int().primaryKey() },
            options(ctx) {
                ctx.primaryKey(['id'])
                ctx.withoutRowId()
            },
        })
        expect(E.state.withoutRowId).toBe(true)
    })

    it('checks with gt expression', () => {
        const E = SqliteEntity({
            name: 't',
            adapter: db,
            columns: { age: lite.int(), id: lite.int() },
            options(ctx) {
                ctx.checks([ctx.gt('age', 'id')])
            },
        })
        expect(E.state.checks).toEqual([{ left: 'age', op: 'gt', right: 'id' }])
    })

    it('checks with gte, lt, lte expressions', () => {
        const E = SqliteEntity({
            name: 't',
            adapter: db,
            columns: { a: lite.int(), b: lite.int(), c: lite.int(), d: lite.int() },
            options(ctx) {
                ctx.checks([ctx.gte('a', 'b'), ctx.lt('c', 'd'), ctx.lte('a', 'c')])
            },
        })
        expect(E.state.checks).toHaveLength(3)
        expect(E.state.checks[0]).toEqual({ left: 'a', op: 'gte', right: 'b' })
        expect(E.state.checks[1]).toEqual({ left: 'c', op: 'lt', right: 'd' })
        expect(E.state.checks[2]).toEqual({ left: 'a', op: 'lte', right: 'c' })
    })

    it('checks with exprs array', () => {
        const E = SqliteEntity({
            name: 't',
            adapter: db,
            columns: { a: lite.int(), b: lite.int() },
            options(ctx) {
                ctx.checks([{ left: 'a', op: 'gt', right: 'b' }])
            },
        })
        expect(E.state.checks).toEqual([{ left: 'a', op: 'gt', right: 'b' }])
    })
})

describe('SqliteEntity — col() reference', () => {
    it('returns column reference for a valid column', () => {
        const User = SqliteEntity({
            name: 'users',
            adapter: db,
            columns: { id: lite.int().primaryKey(), name: lite.text() },
            options(ctx) {
                ctx.primaryKey(['id'])
            },
        })
        const ref = User.col('id')
        expect(ref.entityName).toBe('users')
        expect(ref.columnName).toBe('id')
        expect(ref.tableState).toBe(User.state.columns)
    })
})

describe('SqliteEntity — toSelectSchema', () => {
    it('returns a valid object schema', () => {
        const User = SqliteEntity({
            name: 'users',
            adapter: db,
            columns: {
                id: lite.int().primaryKey().autoIncrement(),
                name: lite.text().notNull(),
                age: lite.int(),
            },
            options(ctx) {
                ctx.primaryKey(['id'])
            },
        })
        const schema = User.toSelectSchema()
        const row = schema.parse({ id: 1, name: 'Alice', age: null })
        expect(row).toEqual({ id: 1, name: 'Alice', age: null })
    })

    it('rejects missing required columns', () => {
        const User = SqliteEntity({
            name: 'users',
            adapter: db,
            columns: { id: lite.int().primaryKey(), name: lite.text().notNull() },
            options(ctx) {
                ctx.primaryKey(['id'])
            },
        })
        const schema = User.toSelectSchema()
        expect(() => schema.parse({ id: 1 })).toThrow()
    })

    it('rejects wrong types', () => {
        const User = SqliteEntity({
            name: 'users',
            adapter: db,
            columns: { id: lite.int().primaryKey(), name: lite.text().notNull() },
            options(ctx) {
                ctx.primaryKey(['id'])
            },
        })
        const schema = User.toSelectSchema()
        expect(() => schema.parse({ id: 'not-a-number', name: 'X' })).toThrow()
    })

    it('ignores extra fields', () => {
        const User = SqliteEntity({
            name: 'users',
            adapter: db,
            columns: { id: lite.int().primaryKey() },
            options(ctx) {
                ctx.primaryKey(['id'])
            },
        })
        const r = User.toSelectSchema().parse({ id: 1, extra: true })
        expect(r).not.toHaveProperty('extra')
    })
})

describe('SqliteEntity — toInsertSchema', () => {
    it('excludes autoIncrement columns', () => {
        const User = SqliteEntity({
            name: 'users',
            adapter: db,
            columns: {
                id: lite.int().primaryKey().autoIncrement(),
                name: lite.text().notNull(),
            },
            options(ctx) {
                ctx.primaryKey(['id'])
            },
        })
        const schema = User.toInsertSchema()
        const r = schema.parse({ name: 'Alice' })
        expect(r).toEqual({ name: 'Alice' })
        expect(r).not.toHaveProperty('id')
    })

    it('non-autoIncrement PK is required in insert', () => {
        const E = SqliteEntity({
            name: 't',
            adapter: db,
            columns: { id: lite.int().primaryKey(), label: lite.text().notNull() },
            options(ctx) {
                ctx.primaryKey(['id'])
            },
        })
        const schema = E.toInsertSchema()
        expect(() => schema.parse({ label: 'x' })).toThrow()
        expect(schema.parse({ id: 1, label: 'x' })).toEqual({ id: 1, label: 'x' })
    })

    it('makes nullable columns accept undefined', () => {
        const E = SqliteEntity({
            name: 't',
            adapter: db,
            columns: { id: lite.int().primaryKey(), bio: lite.text() },
            options(ctx) {
                ctx.primaryKey(['id'])
            },
        })
        const schema = E.toInsertSchema()
        const r = schema.parse({ id: 1 })
        expect(r).toEqual({ id: 1 })
    })

    it('notNull columns without default are required', () => {
        const E = SqliteEntity({
            name: 't',
            adapter: db,
            columns: { id: lite.int().primaryKey(), name: lite.text().notNull() },
            options(ctx) {
                ctx.primaryKey(['id'])
            },
        })
        const schema = E.toInsertSchema()
        expect(() => schema.parse({ id: 1 })).toThrow()
    })
})

describe('SqliteEntity — toUpdateSchema', () => {
    it('all columns are optional', () => {
        const E = SqliteEntity({
            name: 't',
            adapter: db,
            columns: { id: lite.int().primaryKey(), name: lite.text().notNull() },
            options(ctx) {
                ctx.primaryKey(['id'])
            },
        })
        const schema = E.toUpdateSchema()
        expect(schema.parse({ id: 1 }).id).toBe(1)
        expect(schema.parse({ name: 'x' }).name).toBe('x')
        expect(schema.parse({})).toEqual({})
    })

    it('preserves nullability — nullable column accepts null', () => {
        const E = SqliteEntity({
            name: 't',
            adapter: db,
            columns: { id: lite.int().primaryKey(), bio: lite.text() },
            options(ctx) {
                ctx.primaryKey(['id'])
            },
        })
        const schema = E.toUpdateSchema()
        expect(schema.parse({ bio: null }).bio).toBe(null)
    })

    it('rejects wrong types', () => {
        const E = SqliteEntity({
            name: 't',
            adapter: db,
            columns: { name: lite.text().notNull() },
            options(ctx) {},
        })
        const schema = E.toUpdateSchema()
        expect(() => schema.parse({ name: 42 })).toThrow()
    })
})

describe('SqliteEntity — $infer types', () => {
    it('$inferSelect matches select schema type', () => {
        const User = SqliteEntity({
            name: 'users',
            adapter: db,
            columns: {
                id: lite.int().primaryKey().autoIncrement(),
                name: lite.text().notNull(),
                age: lite.int(),
            },
            options(ctx) {
                ctx.primaryKey(['id'])
            },
        })
        type S = typeof User.$inferSelect
        const selectSchema = User.toSelectSchema()
        type Select = typeof selectSchema.$infer
        expectTypeOf<S>().toEqualTypeOf<Select>()
    })

    it('$inferInsert matches insert schema type', () => {
        const User = SqliteEntity({
            name: 'users',
            adapter: db,
            columns: {
                id: lite.int().primaryKey().autoIncrement(),
                name: lite.text().notNull(),
                age: lite.int(),
            },
            options(ctx) {
                ctx.primaryKey(['id'])
            },
        })
        type I = typeof User.$inferInsert
        const insertSchema = User.toInsertSchema()
        type Insert = typeof insertSchema.$infer
        expectTypeOf<I>().toEqualTypeOf<Insert>()
    })

    it('$inferUpdate matches update schema type', () => {
        const User = SqliteEntity({
            name: 'users',
            adapter: db,
            columns: {
                id: lite.int().primaryKey().autoIncrement(),
                name: lite.text().notNull(),
                age: lite.int(),
            },
            options(ctx) {
                ctx.primaryKey(['id'])
            },
        })
        type U = typeof User.$inferUpdate
        const updateSchema = User.toUpdateSchema()
        type Update = typeof updateSchema.$infer
        expectTypeOf<U>().toEqualTypeOf<Update>()
    })
})

describe('SqliteEntity — complex entity', () => {
    it('User entity with all column types and constraints', () => {
        const User = SqliteEntity({
            name: 'users',
            adapter: db,
            columns: {
                id: lite.int().primaryKey().autoIncrement(),
                name: lite.text().notNull().unique('conflict:error'),
                email: lite.text().notNull().unique('conflict:ignore'),
                age: lite.int().default(0),
                score: lite.real().default(0.0),
                bio: lite.text().default(''),
                avatar: lite.blob().notNull(),
                role: lite.text().notNull().default('user'),
            },
            options(ctx) {
                ctx.primaryKey(['id'])
                ctx.unique({ name: 'u_email', cols: ['email'], conflict: 'conflict:ignore' })
                ctx.index({ name: 'idx_name_role', cols: ['name', 'role'] })
                ctx.uniqueIndex({ name: 'uidx_name_email', cols: ['name', 'email'] })
            },
        })

        expect(User.state.name).toBe('users')
        expect(User.state.columns.id.primaryKey).toBe(true)
        expect(User.state.columns.id.autoIncrement).toBe(true)
        expect(User.state.columns.id.notNull).toBe(true)
        expect(User.state.columns.name.unique).toBe(true)
        expect(User.state.columns.email.uniqueConflict).toBe('conflict:ignore')
        expect(User.state.columns.age.default).toBe(0)
        expect(User.state.columns.avatar.notNull).toBe(true)
        expect(User.state.primaryKey).toEqual([{ cols: ['id'] }])
        expect(User.state.unique).toEqual([{ name: 'u_email', cols: ['email'], conflict: 'conflict:ignore' }])

        const select = User.toSelectSchema()
        const row = select.parse({
            id: 1,
            name: 'Alice',
            email: 'a@b.com',
            age: null,
            score: null,
            bio: null,
            avatar: new Uint8Array(),
            role: 'user',
        })
        expect(row.name).toBe('Alice')

        const insert = User.toInsertSchema()
        const ins = insert.parse({ name: 'Bob', email: 'b@c.com', avatar: new Uint8Array([1]), role: 'admin' })
        expect(ins).not.toHaveProperty('id')
        expect(ins.name).toBe('Bob')
        expect(ins.avatar).toEqual(new Uint8Array([1]))

        type S = typeof User.$inferSelect
        type I = typeof User.$inferInsert
        type U = typeof User.$inferUpdate
        expectTypeOf<S>().toBeObject()
        expectTypeOf<I>().toBeObject()
        expectTypeOf<U>().toBeObject()
    })

    it('PostTag join table with withoutRowId', () => {
        const PostTag = SqliteEntity({
            name: 'post_tags',
            adapter: db,
            columns: {
                postId: lite.int().notNull(),
                tagId: lite.int().notNull(),
            },
            options(ctx) {
                ctx.uniqueIndex({ name: 'uidx_post_tag', cols: ['postId', 'tagId'] })
                ctx.withoutRowId()
            },
        })
        expect(PostTag.state.withoutRowId).toBe(true)
        expect(PostTag.state.uniqueIndex).toEqual([{ name: 'uidx_post_tag', cols: ['postId', 'tagId'] }])

        const insert = PostTag.toInsertSchema()
        expect(insert.parse({ postId: 1, tagId: 2 })).toEqual({ postId: 1, tagId: 2 })
        expect(() => insert.parse({ postId: 1 })).toThrow()
    })
})

describe('SqliteEntity — pipes on entity columns', () => {
    const toArray = ax.operator((v: string) => v.split(',').map((s) => s.trim()))

    it('pipe transforms select schema output type', () => {
        const HasLabels = SqliteEntity({
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
        const select = HasLabels.toSelectSchema()
        const row = select.parse({ id: 1, labels: 'a,b,c' })
        expect(row.labels).toEqual(['a', 'b', 'c'])
        expect(row).toHaveProperty('labels')
    })

    it('insert schema with pipe — input is raw column type', () => {
        const HasLabels = SqliteEntity({
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
        const insert = HasLabels.toInsertSchema()
        const row = insert.parse({ labels: 'x,y,z' })
        expect(row.labels).toEqual(['x', 'y', 'z'])
    })
})

describe('SqliteEntity — edge cases', () => {
    it('entity with no options is valid', () => {
        const E = SqliteEntity({
            name: 'empty',
            adapter: db,
            columns: { id: lite.int() },
            options() {},
        })
        expect(E.state.primaryKey).toEqual([])
        expect(E.state.unique).toEqual([])
        expect(E.state.index).toEqual([])
        expect(E.state.withoutRowId).toBe(false)
    })

    it('entity with only nullable columns', () => {
        const E = SqliteEntity({
            name: 't',
            adapter: db,
            columns: { a: lite.int(), b: lite.text(), c: lite.real() },
            options() {},
        })
        const select = E.toSelectSchema()
        expect(select.parse({ a: null, b: null, c: null })).toEqual({ a: null, b: null, c: null })
        expect(select.parse({ a: 1, b: 'x', c: 0.5 })).toEqual({ a: 1, b: 'x', c: 0.5 })
    })

    it('entity with blob column', () => {
        const E = SqliteEntity({
            name: 't',
            adapter: db,
            columns: { data: lite.blob().notNull() },
            options() {},
        })
        const buf = new Uint8Array([1, 2, 3])
        const r = E.toSelectSchema().parse({ data: buf })
        expect(r.data).toBe(buf)
    })

    it('references between entities via col()', () => {
        const User = SqliteEntity({
            name: 'users',
            adapter: db,
            columns: { id: lite.int().primaryKey(), name: lite.text().notNull() },
            options(ctx) {
                ctx.primaryKey(['id'])
            },
        })
        const Post = SqliteEntity({
            name: 'posts',
            adapter: db,
            columns: {
                id: lite.int().primaryKey().autoIncrement(),
                userId: lite.int().notNull().references(User.col('id')),
            },
            options(ctx) {
                ctx.primaryKey(['id'])
            },
        })
        expect(Post.state.columns.userId.references!.col.columnName).toBe('id')
        expect(Post.state.columns.userId.references!.col.entityName).toBe('users')
    })
})

describe('SqliteEntity — toSql()', () => {
    it('generates CREATE TABLE for a simple entity', () => {
        const E = SqliteEntity({
            name: 'users',
            adapter: db,
            columns: {
                id: lite.int().primaryKey().autoIncrement(),
                name: lite.text().notNull(),
            },
            options(ctx) {
                ctx.primaryKey(['id'])
            },
        })
        const sql = E.toSql()
        expect(sql).toContain('CREATE TABLE IF NOT EXISTS users (')
        expect(sql).toContain('id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL')
        expect(sql).toContain('name TEXT NOT NULL')
    })

    it('includes inline UNIQUE and table-level UNIQUE constraint', () => {
        const E = SqliteEntity({
            name: 'users',
            adapter: db,
            columns: {
                id: lite.int().primaryKey().autoIncrement(),
                email: lite.text().notNull().unique('conflict:ignore'),
            },
            options(ctx) {
                ctx.primaryKey(['id'])
                ctx.unique({ name: 'u_email', cols: ['email'], conflict: 'conflict:ignore' })
            },
        })
        const sql = E.toSql()
        expect(sql).toContain('UNIQUE ON CONFLICT IGNORE')
        expect(sql).toContain('CONSTRAINT u_email UNIQUE (email) ON CONFLICT IGNORE')
    })

    it('includes CHECK constraints (gt, gte, lt, lte, minLength, maxLength)', () => {
        const E = SqliteEntity({
            name: 'products',
            adapter: db,
            columns: {
                id: lite.int().primaryKey().autoIncrement(),
                price: lite.real().gt(0),
                qty: lite.int().gte(0).lte(999),
                name: lite.text().notNull().minLength(1).maxLength(100),
            },
            options(ctx) {
                ctx.primaryKey(['id'])
            },
        })
        const sql = E.toSql()
        expect(sql).toContain('CHECK (price > 0)')
        expect(sql).toContain('CHECK (qty >= 0)')
        expect(sql).toContain('CHECK (qty <= 999)')
        expect(sql).toContain('CHECK (length(name) >= 1)')
        expect(sql).toContain('CHECK (length(name) <= 100)')
    })

    it('includes CHECK IN constraint', () => {
        const E = SqliteEntity({
            name: 'users',
            adapter: db,
            columns: {
                id: lite.int().primaryKey().autoIncrement(),
                role: lite.text().notNull().in(['admin', 'user', 'guest']),
            },
            options(ctx) {
                ctx.primaryKey(['id'])
            },
        })
        const sql = E.toSql()
        expect(sql).toContain('CHECK (role IN ("admin", "user", "guest"))')
    })

    it('includes COLLATE', () => {
        const E = SqliteEntity({
            name: 'users',
            adapter: db,
            columns: {
                id: lite.int().primaryKey().autoIncrement(),
                name: lite.text().notNull().collate('nocase'),
            },
            options(ctx) {
                ctx.primaryKey(['id'])
            },
        })
        const sql = E.toSql()
        expect(sql).toContain('COLLATE NOCASE')
    })

    it('includes REFERENCES (foreign key)', () => {
        const User = SqliteEntity({
            name: 'users',
            adapter: db,
            columns: { id: lite.int().primaryKey(), name: lite.text().notNull() },
            options(ctx) {
                ctx.primaryKey(['id'])
            },
        })
        const Post = SqliteEntity({
            name: 'posts',
            adapter: db,
            columns: {
                id: lite.int().primaryKey().autoIncrement(),
                userId: lite.int().notNull().references(User.col('id'), ['delete:cascade']),
            },
            options(ctx) {
                ctx.primaryKey(['id'])
            },
        })
        const sql = Post.toSql()
        expect(sql).toContain('REFERENCES users(id)')
        expect(sql).toContain('ON DELETE CASCADE')
    })

    it('includes CREATE INDEX for index constraints', () => {
        const E = SqliteEntity({
            name: 't',
            adapter: db,
            columns: { a: lite.int(), b: lite.text() },
            options(ctx) {
                ctx.index({ name: 'idx_a_b', cols: ['a', 'b'] })
            },
        })
        const sql = E.toSql()
        expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_a_b ON t (a, b);')
    })

    it('includes CREATE UNIQUE INDEX for uniqueIndex constraints', () => {
        const E = SqliteEntity({
            name: 't',
            adapter: db,
            columns: { a: lite.int(), b: lite.int() },
            options(ctx) {
                ctx.uniqueIndex({ name: 'uidx_a_b', cols: ['a', 'b'] })
            },
        })
        const sql = E.toSql()
        expect(sql).toContain('CREATE UNIQUE INDEX IF NOT EXISTS uidx_a_b ON t (a, b);')
    })

    it('includes WITHOUT ROWID', () => {
        const E = SqliteEntity({
            name: 't',
            adapter: db,
            columns: { id: lite.int().primaryKey() },
            options(ctx) {
                ctx.primaryKey(['id'])
                ctx.withoutRowId()
            },
        })
        const sql = E.toSql()
        expect(sql).toContain('WITHOUT ROWID')
    })

    it('includes table-level CHECK expressions', () => {
        const E = SqliteEntity({
            name: 't',
            adapter: db,
            columns: { start: lite.int(), end: lite.int() },
            options(ctx) {
                ctx.checks([ctx.lt('start', 'end')])
            },
        })
        const sql = E.toSql()
        expect(sql).toContain('CHECK (start < end)')
    })

    it('generates complete SQL for a complex entity', () => {
        const E = SqliteEntity({
            name: 'orders',
            adapter: db,
            columns: {
                id: lite.int().primaryKey().autoIncrement(),
                userId: lite.int().notNull(),
                total: lite.real().notNull().gt(0),
                status: lite.text().notNull().default('pending').in(['pending', 'shipped', 'delivered']),
                createdAt: lite.text().notNull().collate('rtrim'),
            },
            options(ctx) {
                ctx.primaryKey(['id'])
                ctx.index({ name: 'idx_userId', cols: ['userId'] })
                ctx.unique({ name: 'u_order', cols: ['id', 'userId'], conflict: 'conflict:error' })
                // Column-level gt(0) already generates CHECK (total > 0)
            },
        })
        const sql = E.toSql()
        expect(sql).toContain('CREATE TABLE IF NOT EXISTS orders (')
        expect(sql).toContain('id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL')
        expect(sql).toContain('userId INTEGER NOT NULL')
        expect(sql).toContain('total REAL NOT NULL')
        expect(sql).toContain('status TEXT NOT NULL')
        expect(sql).toContain("CHECK (status IN (\"pending\", \"shipped\", \"delivered\"))")
        expect(sql).toContain('COLLATE RTRIM')
        expect(sql).toContain('CHECK (total > 0)')
        expect(sql).toContain('CONSTRAINT u_order UNIQUE (id, userId)')
        expect(sql).toContain('CREATE INDEX IF NOT EXISTS idx_userId ON orders (userId);')
    })

    it('generates complete SQL for PostTag with withoutRowId and uniqueIndex', () => {
        const E = SqliteEntity({
            name: 'post_tags',
            adapter: db,
            columns: {
                postId: lite.int().notNull(),
                tagId: lite.int().notNull(),
            },
            options(ctx) {
                ctx.uniqueIndex({ name: 'uidx_post_tag', cols: ['postId', 'tagId'] })
                ctx.withoutRowId()
            },
        })
        const sql = E.toSql()
        expect(sql).toContain('CREATE TABLE IF NOT EXISTS post_tags (')
        expect(sql).toContain('postId INTEGER NOT NULL')
        expect(sql).toContain('tagId INTEGER NOT NULL')
        expect(sql).toContain('WITHOUT ROWID')
        expect(sql).toContain('CREATE UNIQUE INDEX IF NOT EXISTS uidx_post_tag ON post_tags (postId, tagId);')
    })
})

describe('SqliteEntity — complex multi-entity schema', () => {
    it('defines User, Post, Comment with full type inference and SQL output', () => {
        const User = SqliteEntity({
            name: 'users',
            adapter: db,
            columns: {
                id: lite.int().primaryKey().autoIncrement(),
                username: lite.text().notNull().unique('conflict:error').minLength(3).maxLength(32),
                email: lite.text().notNull().unique('conflict:ignore'),
                age: lite.int().gte(0).lte(150),
                bio: lite.text(),
                score: lite.real(),
            },
            options(ctx) {
                ctx.primaryKey(['id'])
                ctx.unique({ name: 'u_username', cols: ['username'], conflict: 'conflict:error' })
                ctx.unique({ name: 'u_email', cols: ['email'], conflict: 'conflict:ignore' })
                ctx.index({ name: 'idx_age', cols: ['age'] })
            },
        })

        const Post = SqliteEntity({
            name: 'posts',
            adapter: db,
            columns: {
                id: lite.int().primaryKey().autoIncrement(),
                authorId: lite.int().notNull().references(User.col('id'), ['delete:cascade']),
                title: lite.text().notNull().minLength(1).maxLength(255),
                body: lite.text().notNull(),
                published: lite.int().notNull().default(0).in([0, 1]),
            },
            options(ctx) {
                ctx.primaryKey(['id'])
                ctx.index({ name: 'idx_authorId', cols: ['authorId'] })
                // Column-level checks already cover constraints
            },
        })

        const Comment = SqliteEntity({
            name: 'comments',
            adapter: db,
            columns: {
                id: lite.int().primaryKey().autoIncrement(),
                postId: lite.int().notNull().references(Post.col('id'), ['delete:cascade']),
                authorId: lite.int().notNull().references(User.col('id'), ['delete:cascade']),
                content: lite.text().notNull().minLength(1),
                moderated: lite.int().notNull().default(0).in([0, 1]),
            },
            options(ctx) {
                ctx.primaryKey(['id'])
                ctx.index({ name: 'idx_comment_post', cols: ['postId'] })
                ctx.index({ name: 'idx_comment_author', cols: ['authorId'] })
                ctx.uniqueIndex({ name: 'uidx_comment', cols: ['postId', 'id'] })
            },
        })

        // --- User type inference ---
        type UserSelect = typeof User.$inferSelect
        type UserInsert = typeof User.$inferInsert
        type UserUpdate = typeof User.$inferUpdate

        const userSelectSchema = User.toSelectSchema()
        type UserSelectInfer = typeof userSelectSchema.$infer
        expectTypeOf<UserSelect>().toEqualTypeOf<UserSelectInfer>()

        const userInsertSchema = User.toInsertSchema()
        type UserInsertInfer = typeof userInsertSchema.$infer
        expectTypeOf<UserInsert>().toEqualTypeOf<UserInsertInfer>()

        const userUpdateSchema = User.toUpdateSchema()
        type UserUpdateInfer = typeof userUpdateSchema.$infer
        expectTypeOf<UserUpdate>().toEqualTypeOf<UserUpdateInfer>()

        // --- User select schema runtime ---
        const userRow = userSelectSchema.parse({
            id: 1,
            username: 'alice',
            email: 'a@b.com',
            age: null,
            bio: null,
            score: null,
        })
        expect(userRow.username).toBe('alice')
        expect(userRow.age).toBeNull()

        // --- User insert schema: autoIncrement id excluded, notNull without default required ---
        const userInsert = userInsertSchema.parse({ username: 'bob', email: 'b@c.com' })
        expect(userInsert).not.toHaveProperty('id')
        expect(userInsert.username).toBe('bob')
        expect(() => userInsertSchema.parse({ email: 'x@y.com' })).toThrow()

        // --- User update schema: all optional ---
        expect(userUpdateSchema.parse({ age: 25 }).age).toBe(25)
        expect(userUpdateSchema.parse({})).toEqual({})

        // --- Post type inference ---
        type PostSelect = typeof Post.$inferSelect
        type PostInsert = typeof Post.$inferInsert
        expectTypeOf<PostSelect>().toHaveProperty('title')
        expectTypeOf<PostSelect['title']>().toEqualTypeOf<string>()
        expectTypeOf<PostInsert>().toHaveProperty('authorId')
        expectTypeOf<PostInsert['published']>().toEqualTypeOf<number | undefined>()

        // --- Post insert: published has default so undefined is accepted ---
        const postInsert = Post.toInsertSchema().parse({
            authorId: 1,
            title: 'Hello',
            body: 'World',
        })
        expect(postInsert.published).toBe(0)
        expect(postInsert.title).toBe('Hello')

        // --- Comment with FK references ---
        const commentInsert = Comment.toInsertSchema().parse({
            postId: 1,
            authorId: 1,
            content: 'Nice post!',
        })
        expect(commentInsert.content).toBe('Nice post!')

        // --- SQL output verification ---
        const userSql = User.toSql()
        expect(userSql).toContain('CREATE TABLE IF NOT EXISTS users (')
        expect(userSql).toContain('id INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL')
        expect(userSql).toContain('username TEXT NOT NULL UNIQUE')
        expect(userSql).toContain('email TEXT NOT NULL UNIQUE ON CONFLICT IGNORE')
        expect(userSql).toContain('CHECK (length(username) >= 3)')
        expect(userSql).toContain('CHECK (length(username) <= 32)')
        expect(userSql).toContain('CHECK (age >= 0)')
        expect(userSql).toContain('CHECK (age <= 150)')
        expect(userSql).toContain('CONSTRAINT u_username UNIQUE (username)')
        expect(userSql).toContain('CONSTRAINT u_email UNIQUE (email) ON CONFLICT IGNORE')
        expect(userSql).toContain('CREATE INDEX IF NOT EXISTS idx_age ON users (age);')

        const postSql = Post.toSql()
        expect(postSql).toContain('CREATE TABLE IF NOT EXISTS posts (')
        expect(postSql).toContain('authorId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE')
        expect(postSql).toContain("CHECK (published IN (\"0\", \"1\"))")
        expect(postSql).toContain('CHECK (length(title) >= 1)')
        expect(postSql).toContain('CHECK (length(title) <= 255)')
        expect(postSql).toContain('CREATE INDEX IF NOT EXISTS idx_authorId ON posts (authorId);')

        const commentSql = Comment.toSql()
        expect(commentSql).toContain('CREATE TABLE IF NOT EXISTS comments (')
        expect(commentSql).toContain('postId INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE')
        expect(commentSql).toContain('authorId INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE')
        expect(commentSql).toContain('CHECK (length(content) >= 1)')
        expect(commentSql).toContain("CHECK (moderated IN (\"0\", \"1\"))")
        expect(commentSql).toContain('CREATE UNIQUE INDEX IF NOT EXISTS uidx_comment ON comments (postId, id);')

        // --- Index and uniqueIndex in comment ---
        expect(commentSql).toContain('CREATE INDEX IF NOT EXISTS idx_comment_post ON comments (postId);')
        expect(commentSql).toContain('CREATE INDEX IF NOT EXISTS idx_comment_author ON comments (authorId);')
    })
})
