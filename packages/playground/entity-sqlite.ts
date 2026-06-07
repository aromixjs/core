//@ts-nocheck

Entity.sqlite({
      name: 'liscons',
      storage: SqliteAdapter,
      table: lite
            .table({
                  id: lite.integer().primaryKey().autoIncrement(),
                  userId: lite.integer().notNull().references(userEntity.col('id'), ['delete:cascade']),
                  slug: lite.text().notNull().collate('nocase').uniqueWith(['userId']),
                  title: lite.text().notNull(),
                  body: lite.text(),
                  status: lite.text().in(['draft', 'published', 'archived']).notNull().default('draft'),
                  score: lite.real().gte(0),
                  createdAt: lite.integer().default(() => Date.now()),
                  updatedAt: lite
                        .integer()
                        .default(() => Date.now())
                        .onUpdate(() => Date.now()),
            })
            .options({
                  withOutRowId: false,
                  primaryKey: ['id', 'slug'],
            }),
      effects: [sendEmail],
})
