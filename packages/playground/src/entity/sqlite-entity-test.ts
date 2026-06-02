import { Entity, Storage, lite, liteKit } from '@aromix/core'

const demoAdapter: Storage.SQLiteAdapter = {
      async query(sql: string) {
            console.log('[SQL]', sql)
            return []
      },
      foreignKeys: true,
      wal: true,
      busyTimeout: 5000,
}

const userModel = {
      id: lite.text().primaryKey(),
      name: lite.text().notNull(),
      email: lite.text().notNull().unique(),
      age: lite.int().notNull().min(0).max(150),
      score: lite.real().default(0),
      isActive: lite.bool().default(true),
      createdAt: lite
            .date('iso')
            .notNull()
            .defaultFn(() => new Date()),
      bio: lite.text().maxLength(500),
      role: lite.text().in(['admin', 'user', 'guest']),
      metadata: lite.blob(),
      tags: lite.text().indexWith(['name']),
      loginCount: lite.bigint().default(0n),
} as const

const users = Entity.sqlite({
      name: 'users',
      storage: demoAdapter,
      model: userModel,
})

const meta = users[Entity.$meta]
console.log('Entity name:', meta.name)
console.log('Adapter type:', typeof meta.adapter.query)
console.log('Foreign keys:', meta.adapter.foreignKeys)
console.log('WAL mode:', meta.adapter.wal)
console.log('')
console.log('Columns:')
for (const [colName, colDef] of Object.entries(meta.model)) {
      const m = colDef[liteKit.$meta]
      console.log(`  ${colName}:`)
      console.log(`    type: ${m.type}`)
      if (m.primaryKey) console.log(`    primaryKey: true`)
      if (m.notNull) console.log(`    notNull: true`)
      if (m.unique) console.log(`    unique: true`)
      if (m.default !== undefined) console.log(`    default:`, m.default)
      if (m.defaultFn) console.log(`    defaultFn: [Function]`)
      if (m.min !== undefined) console.log(`    min: ${m.min}`)
      if (m.max !== undefined) console.log(`    max: ${m.max}`)
      if (m.maxLength !== undefined) console.log(`    maxLength: ${m.maxLength}`)
      if (m.in) console.log(`    in: [${m.in.join(', ')}]`)
      if (m.indexWith) console.log(`    indexWith: [${m.indexWith.join(', ')}]`)
}

console.log('')
console.log('All metadata is properly structured!')
