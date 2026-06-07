import { Adapter, Entity, Kit } from '@aromix/core'
import { lite } from '@aromix/lite'

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
      id: lite.int().primaryKey().autoIncrement(),
      name: lite.text().notNull(),
      email: lite.text().notNull().unique(),
      age: lite.int().notNull(),
      score: lite.real().default(0),
      isActive: lite.bool().default(true),
      createdAt: lite.date('iso').notNull(),
      bio: lite.text(),
      role: lite.text(),
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
