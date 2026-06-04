import { Ddl } from './ddl'
import type { DateFormat } from './types'

export const lite = {
  int() {
    return Ddl.int()
  },

  real() {
    return Ddl.real()
  },

  text() {
    return Ddl.text()
  },

  blob() {
    return Ddl.blob()
  },

  bool() {
    return Ddl.bool()
  },

  bigint() {
    return Ddl.bigint()
  },

  date(format: DateFormat) {
    return Ddl.date(format)
  },
}
