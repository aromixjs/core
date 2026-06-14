import { createSqliteAdapter, lite, SqliteEntity } from '@aromix/core'
import { Database } from 'bun:sqlite'

const bunDb = Database.open(':memory:')

bunDb.run('PRAGMA foreign_keys = ON')

export const adapter = createSqliteAdapter({
    async query(sql: string) {
        return bunDb.query(sql).all()
    },
})

export const UserEntity = SqliteEntity({
    name: 'users',
    adapter,
    columns: {
        id: lite.int().primaryKey().autoIncrement(),
        name: lite.text().notNull(),
        email: lite.text().notNull().unique('conflict:error'),
        createdAt: lite.int().defaultFn(() => Date.now()),
    },
    options() { },
})

export const PostEntity = SqliteEntity({
    name: 'posts',
    adapter,
    columns: {
        id: lite.int().primaryKey().autoIncrement(),
        title: lite.text().notNull().minLength(1).maxLength(255),
        body: lite.text().notNull(),
        authorId: lite.int().notNull().references(UserEntity.col('id'), ['delete:cascade']),
        status: lite.text().notNull().default('draft').in(['draft', 'published', 'archived']),
        createdAt: lite.int().defaultFn(() => Date.now()),
        updatedAt: lite.int().defaultFn(() => Date.now()).onUpdate(() => Date.now()),
    },
    options(ctx) {
        ctx.index({ name: 'idx_posts_author', cols: ['authorId'] })
        ctx.index({ name: 'idx_posts_status', cols: ['status'] })
    },
})

export const CommentEntity = SqliteEntity({
    name: 'comments',
    adapter,
    columns: {
        id: lite.int().primaryKey().autoIncrement(),
        postId: lite.int().notNull().references(PostEntity.col('id'), ['delete:cascade']),
        authorId: lite.int().notNull().references(UserEntity.col('id'), ['delete:cascade']),
        content: lite.text().notNull().minLength(1),
        createdAt: lite.int().defaultFn(() => Date.now()),
    },
    options(ctx) {
        ctx.index({ name: 'idx_comments_post', cols: ['postId'] })
        ctx.index({ name: 'idx_comments_author', cols: ['authorId'] })
    },
})

// Create all tables
for (const sql of [UserEntity.toSql(), PostEntity.toSql(), CommentEntity.toSql()]) {
    for (const stmt of sql.split(';').filter(Boolean)) {
        bunDb.run(stmt.trim() + ';')
    }
}
