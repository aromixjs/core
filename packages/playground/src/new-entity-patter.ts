import { lite, Sqlite } from '@aromix/core'

const db = Sqlite.adapter({
    async query(sql) {
        return sql
    },
})

Sqlite.entity({
    name: 'test',
    adapter: db,
    columns: {
        id: lite.int().primaryKey().autoIncrement(),
        name: lite.text().notNull().unique(),
        email: lite.text().notNull().unique(),
        age: lite.int().default(0),
        score: lite.real().default(0.0),
        bio: lite.text().default(''),
        avatar: lite.blob(),
    },
    options(ctx) {
        ctx.gt('id', 'email')
    },
})
