import { Column } from './column'

export * from './types'
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
