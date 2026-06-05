import { Ddl } from './ddl'
import type { DateFormat } from './types'


export const lite = {
  int() {
    return new Ddl<'int'>({ type: 'int' })
  },

  real() {
    return new Ddl<'real'>({ type: 'real' })
  },

  text() {
    return new Ddl<'text'>({ type: 'text' })
  },

  blob() {
    return new Ddl<'blob'>({ type: 'blob' })
  },

  bool() {
    return new Ddl<'boolean'>({ type: 'boolean' })
  },

  bigint() {
    return new Ddl<'bigint'>({ type: 'bigint' })
  },

  date(format: DateFormat) {
    return new Ddl<'date'>({ type: 'date', dateFormat: format })
  },

  table(model: Record<string, Ddl>) {
    return { model }
  },
}