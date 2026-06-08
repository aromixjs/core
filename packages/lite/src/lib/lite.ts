import { TableModel } from '../types/chain'
import { DDL } from './ddl'
import { Table } from './table'

export const lite = {
      int() {
            return DDL.create('int')
      },

      real() {
            return DDL.create('real')
      },

      text() {
            return DDL.create('text')
      },

      blob() {
            return DDL.create('blob')
      },

      table<Model extends TableModel>(model: Model) {
            return new Table(model)
      },
}

