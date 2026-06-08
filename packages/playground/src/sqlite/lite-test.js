import { lite } from '@aromix/lite'
import { createServer } from 'node:http'

export const UserTable = lite
      .table({
            id: lite.int().primaryKey().autoIncrement(),
            name: lite.text().notNull().unique(),
            email: lite.text().notNull().unique(),
            age: lite.int().default(0),
            score: lite.real().default(0.0),
            bio: lite.text().default(''),
            avatar: lite.blob(),
      })
      .with((ctx, cols) => {
            ctx.checks([ctx.gt(cols.age, cols.avatar)])
      })
