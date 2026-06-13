import { SqliteEntityState } from './entity.d'

export function toSql(state: SqliteEntityState) {
    const sql = {
        value: `CREATE TABLE IF NOT EXISTS ${state.name} (\n`,
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

    // handle the column states (states that were generated via lite builder)
    for (const [colName, colState] of Object.entries(state.columns)) {
        const parts: string[] = []

        parts.push(colName)

        switch (colState.colType) {
            case 'int': {
                parts.push('INTEGER')
                break
            }
            case 'real': {
                parts.push('REAL')
                break
            }
            case 'text': {
                parts.push('TEXT')
                break
            }
            case 'blob': {
                parts.push('BLOB')
                break
            }
        }

        if (colState.primaryKey) {
            parts.push('PRIMARY KEY')
        }

        if (colState.autoIncrement) {
            parts.push('AUTOINCREMENT')
        }
        if (colState.notNull) {
            parts.push('NOT NULL')
        }

        if (colState.unique) {
            switch (colState.uniqueConflict) {
                case 'conflict:error': {
                    parts.push('UNIQUE')
                    break
                }
                case 'conflict:ignore': {
                    parts.push('UNIQUE ON CONFLICT IGNORE')
                    break
                }
                case 'conflict:replace': {
                    parts.push('UNIQUE ON CONFLICT REPLACE')
                    break
                }
            }
        }

        if (colState.collate !== undefined) {
            switch (colState.collate) {
                case 'binary': {
                    parts.push('COLLATE BINARY')
                    break
                }
                case 'nocase': {
                    parts.push('COLLATE NOCASE')
                    break
                }
                case 'rtrim': {
                    parts.push('COLLATE RTRIM')
                    break
                }
            }
        }

        if (colState.in.length > 0) {
            const values = colState.in.map((value) => `'${value}'`).join(', ')
            parts.push(`CHECK (${colName} IN (${values}))`)
        }

        for (const check of colState.checks) {
            switch (check.op) {
                case 'gt': {
                    parts.push(`CHECK (${colName} > ${check.val})`)
                    break
                }
                case 'gte': {
                    parts.push(`CHECK (${colName} >= ${check.val})`)
                    break
                }
                case 'lt': {
                    parts.push(`CHECK (${colName} < ${check.val})`)
                    break
                }
                case 'lte': {
                    parts.push(`CHECK (${colName} <= ${check.val})`)
                    break
                }
                case 'minLength': {
                    parts.push(`CHECK (length(${colName}) >= ${check.val})`)
                    break
                }
                case 'maxLength': {
                    parts.push(`CHECK (length(${colName}) <= ${check.val})`)
                    break
                }
            }
        }

        if (colState.references !== undefined) {
            const refParts = [`REFERENCES ${colState.references.col.entityName}(${colState.references.col.columnName}) `]

            for (const action of colState.references.actions) {
                switch (action) {
                    case 'delete:noAction': {
                        refParts.push('ON DELETE NO ACTION')
                        break
                    }
                    case 'delete:restrict': {
                        refParts.push('ON DELETE RESTRICT')
                        break
                    }
                    case 'delete:cascade': {
                        refParts.push('ON DELETE CASCADE')
                        break
                    }
                    case 'delete:setNull': {
                        refParts.push('ON DELETE SET NULL')
                        break
                    }
                    case 'delete:setDefault': {
                        refParts.push('ON DELETE SET DEFAULT')
                        break
                    }
                    case 'update:noAction': {
                        refParts.push('ON UPDATE NO ACTION')
                        break
                    }
                    case 'update:restrict': {
                        refParts.push('ON UPDATE RESTRICT')
                        break
                    }
                    case 'update:cascade': {
                        refParts.push('ON UPDATE CASCADE')
                        break
                    }
                    case 'update:setNull': {
                        refParts.push('ON UPDATE SET NULL')
                        break
                    }
                    case 'update:setDefault': {
                        refParts.push('ON UPDATE SET DEFAULT')
                        break
                    }
                }
            }
            const referenceSql = refParts.join(' ')
            parts.push(referenceSql)
        }

        const columnSql = parts.join(' ')
        sql.entry(columnSql)
    }

    // handle the table level constrains ( states that were taken via options method)

    for (const entry of state.unique) {
        const parts = [`CONSTRAINT ${entry.name} UNIQUE (${entry.cols.join(', ')})`]
        switch (entry.conflict) {
            case 'conflict:error': {
                //question : isnt there any thing to express here ?
                break
            }
            case 'conflict:ignore': {
                parts.push('ON CONFLICT IGNORE')
                break
            }
            case 'conflict:replace': {
                parts.push('ON CONFLICT REPLACE')
                break
            }
        }
        const uniqueConstrain = parts.join(' ')
        sql.entry(uniqueConstrain)
    }

    for (const entry of state.primaryKey) {
        sql.entry(`PRIMARY KEY (${entry.cols.join(', ')})`)
    }

    for (const check of state.checks) {
        let op = ''
        switch (check.op) {
            case 'gt': {
                op = '>'
                break
            }
            case 'gte': {
                op = '>='
                break
            }
            case 'lt': {
                op = '<'
                break
            }
            case 'lte': {
                op = '<='
                break
            }
        }

        sql.entry(`CHECK (${check.left} ${op} ${check.right})`)
    }

    sql.close()
    // end of create  table

    if (state.withoutRowId) {
        sql.value += ' WITHOUT ROWID'
    }

    sql.value += ';'

    for (const entry of state.index) {
        sql.append(`CREATE UNIQUE INDEX IF NOT EXISTS ${entry.name} ON ${state.name} (${entry.cols.join(', ')});`)
    }

    for (const entry of state.uniqueIndex) {
        sql.append(`CREATE UNIQUE INDEX IF NOT EXISTS ${entry.name} ON ${state.name} (${entry.cols.join(', ')});`)
    }

    return sql.value
}
