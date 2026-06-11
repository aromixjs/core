import { describe, it, expect, expectTypeOf } from 'vitest'

import { ax } from '@aromix/validator'
import { lite, Sqlite } from '../src'

const db = Sqlite.adapter({ async query(sql) { return sql } })

describe('Sqlite.entity — basic creation', () => {
    it('creates an entity with name', () => {
        const E = Sqlite.entity({
            name: 'users',
            adapter: db,
            columns: { id: lite.int().primaryKey().autoIncrement() },
            options(ctx) { ctx.primaryKey(['id']) },
        })
        expect(E.state.name).toBe('users')
    })

    it('creates an entity with multiple columns', () => {
        const User = Sqlite.entity({
            name: 'users',
            adapter: db,
            columns: {
                id: lite.int().primaryKey().autoIncrement(),
                name: lite.text().notNull(),
                email: lite.text().notNull().unique(),
            },
            options(ctx) {
                ctx.primaryKey(['id'])
                ctx.unique(['email'])
            },
        })
        expect(Object.keys(User.state.columns)).toEqual(['id', 'name', 'email'])
    })
})

describe('Sqlite.entity — table constraints', () => {
    it('primaryKey constraint is stored', () => {
        const E = Sqlite.entity({
            name: 't', adapter: db,
            columns: { id: lite.int().primaryKey(), name: lite.text() },
            options(ctx) { ctx.primaryKey(['id']) },
        })
        expect(E.state.primaryKey).toEqual([{ cols: ['id'] }])
    })

    it('unique constraint is stored with default conflict', () => {
        const E = Sqlite.entity({
            name: 't', adapter: db,
            columns: { email: lite.text().notNull() },
            options(ctx) { ctx.unique(['email']) },
        })
        expect(E.state.unique).toEqual([{ cols: ['email'], conflict: undefined }])
    })

    it('unique constraint with conflict strategy', () => {
        const E = Sqlite.entity({
            name: 't', adapter: db,
            columns: { email: lite.text().notNull() },
            options(ctx) { ctx.unique(['email'], 'conflict:ignore') },
        })
        expect(E.state.unique).toEqual([{ cols: ['email'], conflict: 'conflict:ignore' }])
    })

    it('index constraint is stored', () => {
        const E = Sqlite.entity({
            name: 't', adapter: db,
            columns: { name: lite.text(), role: lite.text() },
            options(ctx) { ctx.index(['name', 'role']) },
        })
        expect(E.state.index).toEqual([{ cols: ['name', 'role'] }])
    })

    it('uniqueIndex constraint is stored', () => {
        const E = Sqlite.entity({
            name: 't', adapter: db,
            columns: { a: lite.int(), b: lite.int() },
            options(ctx) { ctx.uniqueIndex(['a', 'b']) },
        })
        expect(E.state.uniqueIndex).toEqual([{ cols: ['a', 'b'] }])
    })

    it('withoutRowId is stored', () => {
        const E = Sqlite.entity({
            name: 't', adapter: db,
            columns: { id: lite.int().primaryKey() },
            options(ctx) {
                ctx.primaryKey(['id'])
                ctx.withoutRowId()
            },
        })
        expect(E.state.withoutRowId).toBe(true)
    })

    it('checks with gt expression', () => {
        const E = Sqlite.entity({
            name: 't', adapter: db,
            columns: { age: lite.int(), id: lite.int() },
            options(ctx) { ctx.checks([ctx.gt('age', 'id')]) },
        })
        expect(E.state.checks).toEqual([{ left: 'age', op: 'gt', right: 'id' }])
    })

    it('checks with gte, lt, lte expressions', () => {
        const E = Sqlite.entity({
            name: 't', adapter: db,
            columns: { a: lite.int(), b: lite.int(), c: lite.int(), d: lite.int() },
            options(ctx) {
                ctx.checks([
                    ctx.gte('a', 'b'),
                    ctx.lt('c', 'd'),
                    ctx.lte('a', 'c'),
                ])
            },
        })
        expect(E.state.checks).toHaveLength(3)
        expect(E.state.checks[0]).toEqual({ left: 'a', op: 'gte', right: 'b' })
        expect(E.state.checks[1]).toEqual({ left: 'c', op: 'lt', right: 'd' })
        expect(E.state.checks[2]).toEqual({ left: 'a', op: 'lte', right: 'c' })
    })

    it('checks with exprs array', () => {
        const E = Sqlite.entity({
            name: 't', adapter: db,
            columns: { a: lite.int(), b: lite.int() },
            options(ctx) { ctx.checks([{ left: 'a', op: 'gt', right: 'b' }]) },
        })
        expect(E.state.checks).toEqual([{ left: 'a', op: 'gt', right: 'b' }])
    })
})

describe('Sqlite.entity — col() reference', () => {
    it('returns column reference for a valid column', () => {
        const User = Sqlite.entity({
            name: 'users', adapter: db,
            columns: { id: lite.int().primaryKey(), name: lite.text() },
            options(ctx) { ctx.primaryKey(['id']) },
        })
        const ref = User.col('id')
        expect(ref.entityName).toBe('users')
        expect(ref.columnName).toBe('id')
        expect(ref.tableState).toBe(User.state.columns)
    })
})

describe('Sqlite.entity — toSelectSchema', () => {
    it('returns a valid object schema', () => {
        const User = Sqlite.entity({
            name: 'users', adapter: db,
            columns: {
                id: lite.int().primaryKey().autoIncrement(),
                name: lite.text().notNull(),
                age: lite.int(),
            },
            options(ctx) { ctx.primaryKey(['id']) },
        })
        const schema = User.toSelectSchema()
        const row = schema.parse({ id: 1, name: 'Alice', age: null })
        expect(row).toEqual({ id: 1, name: 'Alice', age: null })
    })

    it('rejects missing required columns', () => {
        const User = Sqlite.entity({
            name: 'users', adapter: db,
            columns: { id: lite.int().primaryKey(), name: lite.text().notNull() },
            options(ctx) { ctx.primaryKey(['id']) },
        })
        const schema = User.toSelectSchema()
        expect(() => schema.parse({ id: 1 })).toThrow()
    })

    it('rejects wrong types', () => {
        const User = Sqlite.entity({
            name: 'users', adapter: db,
            columns: { id: lite.int().primaryKey(), name: lite.text().notNull() },
            options(ctx) { ctx.primaryKey(['id']) },
        })
        const schema = User.toSelectSchema()
        expect(() => schema.parse({ id: 'not-a-number', name: 'X' })).toThrow()
    })

    it('ignores extra fields', () => {
        const User = Sqlite.entity({
            name: 'users', adapter: db,
            columns: { id: lite.int().primaryKey() },
            options(ctx) { ctx.primaryKey(['id']) },
        })
        const r = User.toSelectSchema().parse({ id: 1, extra: true })
        expect(r).not.toHaveProperty('extra')
    })
})

describe('Sqlite.entity — toInsertSchema', () => {
    it('excludes autoIncrement columns', () => {
        const User = Sqlite.entity({
            name: 'users', adapter: db,
            columns: {
                id: lite.int().primaryKey().autoIncrement(),
                name: lite.text().notNull(),
            },
            options(ctx) { ctx.primaryKey(['id']) },
        })
        const schema = User.toInsertSchema()
        const r = schema.parse({ name: 'Alice' })
        expect(r).toEqual({ name: 'Alice' })
        expect(r).not.toHaveProperty('id')
    })

    it('non-autoIncrement PK is required in insert', () => {
        const E = Sqlite.entity({
            name: 't', adapter: db,
            columns: { id: lite.int().primaryKey(), label: lite.text().notNull() },
            options(ctx) { ctx.primaryKey(['id']) },
        })
        const schema = E.toInsertSchema()
        expect(() => schema.parse({ label: 'x' })).toThrow()
        expect(schema.parse({ id: 1, label: 'x' })).toEqual({ id: 1, label: 'x' })
    })

    it('makes nullable columns accept undefined', () => {
        const E = Sqlite.entity({
            name: 't', adapter: db,
            columns: { id: lite.int().primaryKey(), bio: lite.text() },
            options(ctx) { ctx.primaryKey(['id']) },
        })
        const schema = E.toInsertSchema()
        const r = schema.parse({ id: 1 })
        expect(r).toEqual({ id: 1 })
    })

    it('notNull columns without default are required', () => {
        const E = Sqlite.entity({
            name: 't', adapter: db,
            columns: { id: lite.int().primaryKey(), name: lite.text().notNull() },
            options(ctx) { ctx.primaryKey(['id']) },
        })
        const schema = E.toInsertSchema()
        expect(() => schema.parse({ id: 1 })).toThrow()
    })
})

describe('Sqlite.entity — toUpdateSchema', () => {
    it('all columns are optional', () => {
        const E = Sqlite.entity({
            name: 't', adapter: db,
            columns: { id: lite.int().primaryKey(), name: lite.text().notNull() },
            options(ctx) { ctx.primaryKey(['id']) },
        })
        const schema = E.toUpdateSchema()
        expect(schema.parse({ id: 1 }).id).toBe(1)
        expect(schema.parse({ name: 'x' }).name).toBe('x')
        expect(schema.parse({})).toEqual({})
    })

    it('preserves nullability — nullable column accepts null', () => {
        const E = Sqlite.entity({
            name: 't', adapter: db,
            columns: { id: lite.int().primaryKey(), bio: lite.text() },
            options(ctx) { ctx.primaryKey(['id']) },
        })
        const schema = E.toUpdateSchema()
        expect(schema.parse({ bio: null }).bio).toBe(null)
    })

    it('rejects wrong types', () => {
        const E = Sqlite.entity({
            name: 't', adapter: db,
            columns: { name: lite.text().notNull() },
            options(ctx) {},
        })
        const schema = E.toUpdateSchema()
        expect(() => schema.parse({ name: 42 })).toThrow()
    })
})

describe('Sqlite.entity — $infer types', () => {
    it('$inferSelect matches select schema type', () => {
        const User = Sqlite.entity({
            name: 'users', adapter: db,
            columns: {
                id: lite.int().primaryKey().autoIncrement(),
                name: lite.text().notNull(),
                age: lite.int(),
            },
            options(ctx) { ctx.primaryKey(['id']) },
        })
        type S = typeof User.$inferSelect
        const selectSchema = User.toSelectSchema()
        type Select = typeof selectSchema.$infer
        expectTypeOf<S>().toEqualTypeOf<Select>()
    })

    it('$inferInsert matches insert schema type', () => {
        const User = Sqlite.entity({
            name: 'users', adapter: db,
            columns: {
                id: lite.int().primaryKey().autoIncrement(),
                name: lite.text().notNull(),
                age: lite.int(),
            },
            options(ctx) { ctx.primaryKey(['id']) },
        })
        type I = typeof User.$inferInsert
        const insertSchema = User.toInsertSchema()
        type Insert = typeof insertSchema.$infer
        expectTypeOf<I>().toEqualTypeOf<Insert>()
    })

    it('$inferUpdate matches update schema type', () => {
        const User = Sqlite.entity({
            name: 'users', adapter: db,
            columns: {
                id: lite.int().primaryKey().autoIncrement(),
                name: lite.text().notNull(),
                age: lite.int(),
            },
            options(ctx) { ctx.primaryKey(['id']) },
        })
        type U = typeof User.$inferUpdate
        const updateSchema = User.toUpdateSchema()
        type Update = typeof updateSchema.$infer
        expectTypeOf<U>().toEqualTypeOf<Update>()
    })
})

describe('Sqlite.entity — complex entity', () => {
    it('User entity with all column types and constraints', () => {
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

        // Runtime state
        expect(User.state.name).toBe('users')
        expect(User.state.columns.id.primaryKey).toBe(true)
        expect(User.state.columns.id.autoIncrement).toBe(true)
        expect(User.state.columns.id.notNull).toBe(true)
        expect(User.state.columns.name.unique).toBe(true)
        expect(User.state.columns.email.uniqueConflict).toBe('conflict:ignore')
        expect(User.state.columns.age.default).toBe(0)
        expect(User.state.columns.avatar.notNull).toBe(true)
        expect(User.state.primaryKey).toEqual([{ cols: ['id'] }])
        expect(User.state.unique).toEqual([{ cols: ['email'], conflict: 'conflict:ignore' }])

        // Select schema
        const select = User.toSelectSchema()
        const row = select.parse({
            id: 1, name: 'Alice', email: 'a@b.com',
            age: null, score: null, bio: null, avatar: new Uint8Array(), role: 'user',
        })
        expect(row.name).toBe('Alice')

        // Insert schema — autoIncrement excluded, blob column required
        const insert = User.toInsertSchema()
        const ins = insert.parse({ name: 'Bob', email: 'b@c.com', avatar: new Uint8Array([1]), role: 'admin' })
        expect(ins).not.toHaveProperty('id')
        expect(ins.name).toBe('Bob')
        expect(ins.avatar).toEqual(new Uint8Array([1]))

        // $infer types
        type S = typeof User.$inferSelect
        type I = typeof User.$inferInsert
        type U = typeof User.$inferUpdate
        // Just type-level checks — no runtime assertion needed
        expectTypeOf<S>().toBeObject()
        expectTypeOf<I>().toBeObject()
        expectTypeOf<U>().toBeObject()
    })

    it('PostTag join table with withoutRowId', () => {
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
        expect(PostTag.state.withoutRowId).toBe(true)
        expect(PostTag.state.uniqueIndex).toEqual([{ cols: ['postId', 'tagId'] }])

        // Insert: no autoIncrement, both columns required
        const insert = PostTag.toInsertSchema()
        expect(insert.parse({ postId: 1, tagId: 2 })).toEqual({ postId: 1, tagId: 2 })
        expect(() => insert.parse({ postId: 1 })).toThrow()
    })
})

describe('Sqlite.entity — pipes on entity columns', () => {
    const toArray = ax.operator((v: string) => v.split(',').map(s => s.trim()))

    it('pipe transforms select schema output type', () => {
        const HasLabels = Sqlite.entity({
            name: 'has_labels',
            adapter: db,
            columns: {
                id: lite.int().primaryKey().autoIncrement(),
                labels: lite.text().notNull().pipe(toArray),
            },
            options(ctx) { ctx.primaryKey(['id']) },
        })
        const select = HasLabels.toSelectSchema()
        const row = select.parse({ id: 1, labels: 'a,b,c' })
        expect(row.labels).toEqual(['a', 'b', 'c'])
        type Row = typeof select.$infer
        expectTypeOf<Row>().toHaveProperty('labels')
        expectTypeOf<Row['labels']>().toEqualTypeOf<string[]>()
    })

    it('insert schema with pipe — input is raw column type', () => {
        const HasLabels = Sqlite.entity({
            name: 'has_labels',
            adapter: db,
            columns: {
                id: lite.int().primaryKey().autoIncrement(),
                labels: lite.text().notNull().pipe(toArray),
            },
            options(ctx) { ctx.primaryKey(['id']) },
        })
        const insert = HasLabels.toInsertSchema()
        const row = insert.parse({ labels: 'x,y,z' })
        expect(row.labels).toEqual(['x', 'y', 'z'])
    })
})

describe('Sqlite.entity — edge cases', () => {
    it('entity with no options is valid', () => {
        const E = Sqlite.entity({
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
        const E = Sqlite.entity({
            name: 't', adapter: db,
            columns: { a: lite.int(), b: lite.text(), c: lite.real() },
            options() {},
        })
        const select = E.toSelectSchema()
        expect(select.parse({ a: null, b: null, c: null })).toEqual({ a: null, b: null, c: null })
        expect(select.parse({ a: 1, b: 'x', c: 0.5 })).toEqual({ a: 1, b: 'x', c: 0.5 })
    })

    it('entity with blob column', () => {
        const E = Sqlite.entity({
            name: 't', adapter: db,
            columns: { data: lite.blob().notNull() },
            options() {},
        })
        const buf = new Uint8Array([1, 2, 3])
        const r = E.toSelectSchema().parse({ data: buf })
        expect(r.data).toBe(buf)
    })

    it('references between entities via col()', () => {
        const User = Sqlite.entity({
            name: 'users', adapter: db,
            columns: { id: lite.int().primaryKey(), name: lite.text().notNull() },
            options(ctx) { ctx.primaryKey(['id']) },
        })
        const Post = Sqlite.entity({
            name: 'posts', adapter: db,
            columns: {
                id: lite.int().primaryKey().autoIncrement(),
                userId: lite.int().notNull().references(User.col('id')),
            },
            options(ctx) { ctx.primaryKey(['id']) },
        })
        expect(Post.state.columns.userId.references!.col.columnName).toBe('id')
        expect(Post.state.columns.userId.references!.col.entityName).toBe('users')
    })
})
