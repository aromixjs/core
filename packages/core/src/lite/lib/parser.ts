import type { TableModel } from '../types/chain'
import type { TableState } from '../types/table'

export function toSql<Model extends TableModel>(name: string, state: TableState<Model>) {
    const sql = {
        value: `CREATE TABLE IF NOT EXIST ${name} (\n`,
        entries: [] as string[],

        entry(line: string) {
            this.entries.push(`  ${line}`)
        },

        close() {
            this.value += this.entries.join(',\n')
            this.value += '\n)'
        },

        append(line: string) {
            this.value += `\n${line}`
        },
    }

    for (const [colName, colState] of Object.entries(state.columns)) {
        const parts: string[] = []
        parts.push(colName)

        switch (colState.colType) {
            case 'int':
                parts.push('INTEGER')
                break
            case 'real':
                parts.push('REAL')
                break
            case 'text':
                parts.push('TEXT')
                break
            case 'blob':
                parts.push('BLOB')
                break
        }

        if (colState.primaryKey) parts.push('PRIMARY KEY')
        if (colState.autoIncrement) parts.push('AUTOINCREMENT')
        if (colState.notNull) parts.push('NOT NULL')

        if (colState.unique) {
            switch (colState.uniqueConflict) {
                case 'conflict:replace':
                    parts.push('UNIQUE ON CONFLICT REPLACE')
                    break
                case 'conflict:ignore':
                    parts.push('UNIQUE ON CONFLICT IGNORE')
                    break
                case 'conflict:error':
                    parts.push('UNIQUE')
                    break
            }
        }

        if (colState.collate !== undefined) {
            switch (colState.collate) {
                case 'nocase':
                    parts.push('COLLATE NOCASE')
                    break
                case 'rtrim':
                    parts.push('COLLATE RTRIM')
                    break
                case 'binary':
                    parts.push('COLLATE BINARY')
                    break
            }
        }

        if (colState.in !== undefined && colState.in.length > 0) {
            const values = colState.in.map((value) => `'${value}'`).join(', ')
            parts.push(`CHECK (${colName} IN (${values}))`)
        }

        for (const check of colState.checks) {
            switch (check.op) {
                case 'gt':
                    parts.push(`CHECK (${colName} > ${check.val})`)
                    break
                case 'gte':
                    parts.push(`CHECK (${colName} >= ${check.val})`)
                    break
                case 'lt':
                    parts.push(`CHECK (${colName} < ${check.val})`)
                    break
                case 'lte':
                    parts.push(`CHECK (${colName} <= ${check.val})`)
                    break
                case 'minLength':
                    parts.push(`CHECK (length(${colName}) >= ${check.val})`)
                    break
                case 'maxLength':
                    parts.push(`CHECK (length(${colName}) <= ${check.val})`)
                    break
            }
        }
    }
}
