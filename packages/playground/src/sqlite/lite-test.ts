//@ts-nocheck
import { Entity } from '@aromix/core'
import { lite } from '@aromix/lite'

export const subscriptionTable = lite
    .table({
        id: lite.int().primaryKey().autoIncrement(),
        name: lite.text().notNull().unique(),
        email: lite.text().notNull().unique(),
        age: lite.int().default(0),
        score: lite.real().default(0.0),
        bio: lite.text().default(''),
        avatar: lite.blob(),
    })
    .with((ctx) => {
        ctx.index(['age', 'email'])
    })

export const UserTable = lite.table({
    name: 'test',
    columns: {
        id: lite.int().primaryKey().autoIncrement(),
        name: lite.text().notNull().unique(),
        email: lite.text().notNull().unique(),
        age: lite.int().default(0),
        score: lite.real().default(0.0),
        bio: lite.text().default(''),
        avatar: lite.blob(),
        subscriptionId: lite.text().references(subscriptionTable.col('id')),
    },
    options() {},
})

Entity.sqlite({
    name: 'test',
    columns: {
        id: lite.int().primaryKey().autoIncrement(),
        name: lite.text().notNull().unique(),
        email: lite.text().notNull().unique(),
        age: lite.int().default(0),
        score: lite.real().default(0.0),
        bio: lite.text().default(''),
        avatar: lite.blob(),
        subscriptionId: lite.text().references(subscriptionTable.col('id')),
    },
    options() {
        // with option
    },
})
