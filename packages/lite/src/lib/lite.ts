import { TableDefinition, TableModel } from './chain.type'
import { DDL } from './ddl'
import { DDLState } from './state.type'

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

      table<Model extends TableModel>(model: Model): TableDefinition<Model> {
            const states = {} as { [Key in keyof Model]: DDLState }

            for (const key of Object.keys(model)) {
                  states[key as keyof Model] = model[key].state
            }

            return { model, states }
      },
}




const table = lite.table({
  name: lite.text().notNull().primaryKey().autoIncrement().unique().index().collate('rtrim')
})