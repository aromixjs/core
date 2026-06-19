import { ax } from '@aromix/validator'
import { SqliteEntityBuilder } from './entity.builder'
import { Operator } from './ddl.chain'

const sqlite = SqliteEntityBuilder({
  async adapter(sql) {
    return sql
  },


  Text: {
    roles: Operator.Text((role: 'admin') => {
      return {
        all: ax.literal('creator')

      }
    })
  },
  Int: {
    min: Operator.Int((minValue: number) => {
      return {
        select: ax.never()
      }
    })
  }
})





sqlite.entity({
  name: 'users',
  model: (builder) => [
    builder.text('uuid').roles('admin'),
    builder.int('age').min(10)
  ]
})