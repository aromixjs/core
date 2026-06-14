import { Collation, ColumnState, ColumnType, ReferenceAction, UniqueConflict } from '../ddl/column'
import { SqliteEntityState } from '../entity.types'

const columnType: Record<ColumnType, string> = {
    int: 'INTEGER',
    real: 'REAL',
    text: 'TEXT',
    blob: 'BLOB',
}

const collation: Record<Collation, string> = {
    binary: 'COLLATE BINARY',
    nocase: 'COLLATE NOCASE',
    rtrim: 'COLLATE RTRIM',
}

const uniqueInline: Record<UniqueConflict, string> = {
    'conflict:error': 'UNIQUE',
    'conflict:ignore': 'UNIQUE ON CONFLICT IGNORE',
    'conflict:replace': 'UNIQUE ON CONFLICT REPLACE',
}

const uniqueConstraint: Record<Exclude<UniqueConflict, 'conflict:error'>, string> = {
    'conflict:ignore': 'ON CONFLICT IGNORE',
    'conflict:replace': 'ON CONFLICT REPLACE',
}

const refAction: Record<ReferenceAction, string> = {
    'delete:noAction': 'ON DELETE NO ACTION',
    'delete:restrict': 'ON DELETE RESTRICT',
    'delete:cascade': 'ON DELETE CASCADE',
    'delete:setNull': 'ON DELETE SET NULL',
    'delete:setDefault': 'ON DELETE SET DEFAULT',
    'update:noAction': 'ON UPDATE NO ACTION',
    'update:restrict': 'ON UPDATE RESTRICT',
    'update:cascade': 'ON UPDATE CASCADE',
    'update:setNull': 'ON UPDATE SET NULL',
    'update:setDefault': 'ON UPDATE SET DEFAULT',
}

const compareOp: Record<'gt' | 'gte' | 'lt' | 'lte', string> = {
    gt: '>',
    gte: '>=',
    lt: '<',
    lte: '<=',
}

class SqlBuilder {
    private tableName = ''
    private withoutRowId = false
    private tokens: string[] = []
    private entries: string[] = []
    private indexes: string[] = []

    init(tableName: string, withoutRowId: boolean) {
        this.tableName = tableName
        this.withoutRowId = withoutRowId
    }

    token(value: string) {
        this.tokens.push(value)
    }

    tokenIf(condition: boolean, value: string) {
        if (condition) this.token(value)
    }

    entry() {
        this.entries.push(`  ${this.tokens.join(' ')}`)
        this.tokens = []
    }

    index(value: string) {
        this.indexes.push(value)
    }

    finalize(): string {
        const body = this.entries.join(',\n')

        this.token(`CREATE TABLE IF NOT EXISTS ${this.tableName} (`)
        this.token(`\n${body}\n)`)
        this.tokenIf(this.withoutRowId, 'WITHOUT ROWID')
        this.token(';')

        const createTable = this.tokens.join('')
        this.tokens = []

        const statements = [createTable, ...this.indexes]
        return statements.join('\n')
    }
}

export class SqlConverter {
    constructor(private readonly state: SqliteEntityState) {}

    private buildColumn(name: string, colState: ColumnState, builder: SqlBuilder) {
        builder.token(name)
        builder.token(columnType[colState.colType])
        builder.tokenIf(colState.primaryKey, 'PRIMARY KEY')
        builder.tokenIf(colState.autoIncrement, 'AUTOINCREMENT')
        builder.tokenIf(colState.notNull, 'NOT NULL')
        builder.tokenIf(colState.unique, uniqueInline[colState.uniqueConflict])

        if (colState.collate) {
            builder.token(collation[colState.collate])
        }

        if (colState.in.length > 0) {
            const values = colState.in.map((value) => '"' + value + '"').join(', ')
            builder.token(`CHECK (${name} IN (${values}))`)
        }

        for (const check of colState.checks) {
            if (check.op === 'minLength') {
                builder.token(`CHECK (length(${name}) >= ${check.val})`)
            } else if (check.op === 'maxLength') {
                builder.token(`CHECK (length(${name}) <= ${check.val})`)
            } else {
                builder.token(`CHECK (${name} ${compareOp[check.op]} ${check.val})`)
            }
        }

        if (colState.references) {
            const { col, actions } = colState.references
            const refTokens = [`REFERENCES ${col.entityName}(${col.columnName})`]
            for (const action of actions) refTokens.push(refAction[action])
            builder.token(refTokens.join(' '))
        }

        builder.entry()
    }

    private buildUniqueConstraint(entry: SqliteEntityState['unique'][number], builder: SqlBuilder) {
        builder.token(`CONSTRAINT ${entry.name} UNIQUE (${entry.cols.join(', ')})`)

        if (entry.conflict !== 'conflict:error') {
            builder.token(uniqueConstraint[entry.conflict])
        }

        builder.entry()
    }

    private buildPrimaryKey(entry: SqliteEntityState['primaryKey'][number], builder: SqlBuilder) {
        builder.token(`PRIMARY KEY (${entry.cols.join(', ')})`)
        builder.entry()
    }

    private buildCheck(check: SqliteEntityState['checks'][number], builder: SqlBuilder) {
        builder.token(`CHECK (${check.left} ${compareOp[check.op]} ${check.right})`)
        builder.entry()
    }

    private buildIndex(entry: { name: string; cols: string[] }, unique: boolean, builder: SqlBuilder) {
        const keyword = unique ? 'CREATE UNIQUE INDEX IF NOT EXISTS' : 'CREATE INDEX IF NOT EXISTS'
        builder.index(`${keyword} ${entry.name} ON ${this.state.name} (${entry.cols.join(', ')});`)
    }

    toSql() {
        const builder = new SqlBuilder()
        builder.init(this.state.name, this.state.withoutRowId)

        for (const [name, colState] of Object.entries(this.state.columns)) {
            this.buildColumn(name, colState, builder)
        }

        for (const entry of this.state.unique) {
            this.buildUniqueConstraint(entry, builder)
        }

        for (const entry of this.state.primaryKey) {
            this.buildPrimaryKey(entry, builder)
        }

        for (const check of this.state.checks) {
            this.buildCheck(check, builder)
        }

        for (const entry of this.state.index) {
            this.buildIndex(entry, false, builder)
        }

        for (const entry of this.state.uniqueIndex) {
            this.buildIndex(entry, true, builder)
        }

        return builder.finalize()
    }
}
