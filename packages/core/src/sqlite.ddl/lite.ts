import { Column } from './column'

export const lite = {
    int() {
        return new Column('int.nullable')
    },
    real() {
        return new Column('real.nullable')
    },
    text() {
        return new Column('text.nullable')
    },
    blob() {
        return new Column('blob.nullable')
    },
}





const schema = {
    id: lite.int().primaryKey().autoIncrement(),
    name: lite.text().notNull(),
    bio: lite.text(),
    score: lite.real().default(0),
    avatar: lite.blob().notNull(),
    createdAt: lite.int().notNull().default(0),
}

type SchemaSelect = {
    [K in keyof typeof schema]: (typeof schema)[K]['$type']['select']
}

type SchemaInsert = {
    [K in keyof typeof schema]: (typeof schema)[K]['$type']['insert']
}

type SchemaUpdate = {
    [K in keyof typeof schema]: (typeof schema)[K]['$type']['update']
}
