import { Column } from './column'

export { Chain } from './types/chain.d'
export { TableState, TableOptionsCtx, CheckExpression, ColumnKey } from './types/context.d'
export { ColumnState, UniqueConflict, ColumnReference } from './types/column.d'
export { Column } from './column'
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
}
