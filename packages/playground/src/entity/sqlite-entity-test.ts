import { Adapter, Entity, Kit } from '@aromix/core'
import { Ddl } from '@aromix/sqlite'

const demoAdapter: Adapter.SQLite = {
      async query(sql: string) {
            console.log('[SQL]', sql)
            return []
      },
      foreignKeys: true,
      wal: true,
      busyTimeout: 5000,
}

const userModel = {
      id: Ddl.int().primaryKey().autoIncrement(),
      name: Ddl.text().notNull(),
      email: Ddl.text().notNull().unique(),
      age: Ddl.int().notNull().min(0).max(150),
      score: Ddl.real().default(0),
      isActive: Ddl.bool().default(true),
      createdAt: Ddl.date('iso').notNull().defaultFn(() => new Date()),
      bio: Ddl.text().maxLength(500),
      role: Ddl.text().in(['admin', 'user', 'guest']),
}

const userEntity = Entity.sqlite({
      name: 'users',
      storage: demoAdapter,
      model: userModel,
})

const userMeta = userEntity[Kit.$meta]
console.log('Entity name:', userMeta.name)
console.log('Adapter type:', typeof userMeta.adapter.query)
console.log('Foreign keys:', userMeta.adapter.foreignKeys)
console.log('WAL mode:', userMeta.adapter.wal)

