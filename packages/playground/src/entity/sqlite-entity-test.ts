import { Entity, Adapter } from '@aromix/core'
import { Kit } from '@aromix/core'

const demoAdapter: Adapter.SQLite = {
      async query(sql: string) {
            console.log('[SQL]', sql)
            return []
      },
      foreignKeys: true,
      wal: true,
      busyTimeout: 5000,
}

const meta = Entity.sqlite({
      name: 'users',
      storage: demoAdapter,
})

const userMeta = meta[Kit.$meta]
console.log('Entity name:', userMeta.name)
console.log('Adapter type:', typeof userMeta.adapter.query)
console.log('Foreign keys:', userMeta.adapter.foreignKeys)
console.log('WAL mode:', userMeta.adapter.wal)

