import { TableModel } from '../types/chain'
import { Column } from './column'
import { Table } from './table'

export const lite = {
      int() {
            return Column.create('int')
      },

      real() {
            return Column.create('real')
      },

      text() {
            return Column.create('text')
      },

      blob() {
            return Column.create('blob')
      },

      table<Model extends TableModel>(model: Model) {
            return new Table(model)
      },
}
