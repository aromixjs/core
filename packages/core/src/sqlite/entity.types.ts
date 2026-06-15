import { Column } from '../sqlite.ddl/column'
import { ColumnType } from '../sqlite.ddl/column.builder.types'
import { TableColumns, TableState } from '../sqlite.ddl/table.types'
import { SqliteAdapter } from './adapter'

export interface CheckExpression {
    left: string
    op: 'gt' | 'gte' | 'lt' | 'lte'
    right: string
}

export interface SqliteEntityInput<Cols extends TableColumns> {
    name: string
    adapter: SqliteAdapter
    table: TableState<Cols>
}

type Prettify<T> = { [K in keyof T]: T[K] } & {}

// Extract the inferred output type for a column — refine() narrows this.
type ColOutput<C> = C extends Column<ColumnType, infer Output> ? Output : never
