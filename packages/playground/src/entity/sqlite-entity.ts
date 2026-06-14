import { createSqliteAdapter, lite, SqliteEntity } from "@aromix/core";

const db = createSqliteAdapter({
   async query(sql) {
      return sql
   },
})


SqliteEntity({



name:'watchList',
adapter: db,
columns:{
id: lite.int()
},
options(ctx) {},


})