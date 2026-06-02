import { Adapter } from '../adapter'
import { type LiteModel } from '@aromix/sqlite'
import { Kit } from '../global/kit'

export interface SQLiteEntityInput {
      name: string
      storage: Adapter.SQLite
      model: LiteModel
}

export interface SQLiteEntityOutput {
      [Kit.$meta]: {
            name: string
            adapter: Adapter.SQLite
            model: LiteModel
      }
}

export function sqlite(configuration: SQLiteEntityInput): SQLiteEntityOutput {
      return {
            [Kit.$meta]: {
                  name: configuration.name,
                  model: configuration.model,
                  adapter: configuration.storage,
            },
      }
}
