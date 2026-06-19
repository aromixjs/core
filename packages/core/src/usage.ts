import { ax } from "@aromix/validator";
import { EntityBuilder, Operator } from "./sqlite";

const notNull = Operator({

   Text(ctx) {
      ctx.set({ notNull: true })
   },
})


const defaultFn = Operator({
   Text(ctx, defaultFn: string) {


      return {
         select: ax.string(),
         insert: ax.string()
      }

   },

   Blob(){


   }

})


const db = EntityBuilder({
   async adapter(sql) {
      return sql
   },
   operators: {
      notNull,
      defaultFn
   }
})


