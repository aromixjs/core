import { Ddl } from './ddl'
import { ColTypeMap } from './types'

export class Statement<Model extends Record<string, Ddl>> {
  constructor(private model: Model) {}

  select(): string {
    const cols = Object.keys(this.model).join(', ')
    return `SELECT ${cols} FROM table`
  }

  insert(): string {
    const cols = Object.keys(this.model).join(', ')
    const vals = Object.keys(this.model).map(k => `?`).join(', ')
    return `INSERT INTO table (${cols}) VALUES (${vals})`
  }

  update(): string {
    const sets = Object.keys(this.model).map(k => `${k} = ?`).join(', ')
    return `UPDATE table SET ${sets}`
  }

  createTable(name: string): string {
    const cols = Object.entries(this.model).map(([name, col]) => {
      const parts: string[] = [name, this.sqlType(col.state)]
      if (col.state.primaryKey) parts.push('PRIMARY KEY')
      if (col.state.autoIncrement) parts.push('AUTOINCREMENT')
      if (col.state.notNull) parts.push('NOT NULL')
      if (col.state.unique) parts.push('UNIQUE')
      if (col.state.default !== undefined) parts.push(`DEFAULT ${JSON.stringify(col.state.default)}`)
      return parts.join(' ')
    })
    return `CREATE TABLE IF NOT EXISTS ${name} (\n  ${cols.join(',\n  ')}\n)`
  }

  dropTable(name: string): string {
    return `DROP TABLE IF EXISTS ${name}`
  }

  private sqlType(state: Ddl['state']): string {
    switch (state.type) {
      case 'int': return 'INTEGER'
      case 'real': return 'REAL'
      case 'text': return 'TEXT'
      case 'blob': return 'BLOB'
      case 'boolean': return 'INTEGER'
      case 'bigint': return 'INTEGER'
      case 'date': return 'TEXT'
    }
  }
}
