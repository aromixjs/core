import { SqliteAdapter } from './sqlite/adapter'
import { lite } from './sqlite/ddl/lite'
import { SqliteEntity } from './sqlite/entity'

const entity = SqliteEntity({
    name: 'test',
    adapter: '' as unknown as SqliteAdapter,
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
    options(c) {
        c.primaryKey(['id'])
    },
})

type EntityType = typeof entity.$inferSelect
type entityInsert = typeof entity.$inferInsert
const axInsert = entity.toInsertSchema()

type Test = typeof axInsert.$infer
