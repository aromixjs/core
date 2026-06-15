import { Column } from './column'

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



const data = {
    id: lite.int().primaryKey().autoIncrement(),
    name: lite.text().defaultFn(() => 'test'),
    admin: lite.int().in([1, 0])
}