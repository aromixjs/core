import { $meta, kv } from "@aromix/core";

const schema = {
   id: kv.bigint().public(),

   name: kv.string().default("test").public(),


   metadata: kv.object({
      theme: kv.string().default("dark").public(),
      language: kv.string().default("en").public(),
      nested: kv.object({
         key: kv.string().public(),
         deeper: kv.object({
            value: kv.number().public(),
         }).public(),
      }).public(),
   }).public(),

   // Array of objects — items is a single Any builder
   tags: kv.array(
      kv.object({
         label: kv.string().public(),
         value: kv.string().public(),
      }).public(),
   ).readable(),

   // Array of primitives
   scores: kv.array(kv.number().public()).readable(),

   createdAt: kv.date().defaultFn(() => new Date()).readable(),
   role: kv.string().default("user").readable(),

   password: kv.string().writable(),

   passwordHash: kv.string(),
   sdkKey: kv.string().defaultFn(() => crypto.randomUUID()),
};






const sessions = kv.object({
   name: kv.string().default('user').public(),
   age: kv.number().readable()
})






function resolveMeta(meta: any): any {
   const result: any = {
      type: meta.type,
      readable: meta.readable,
      writable: meta.writable,
      default: meta.default ?? meta.defaultFn?.() ?? undefined,
   }

   if (meta.fields) {
      result.fields = {}

      for (const key of Object.keys(meta.fields)) {
         result.fields[key] = resolveMeta(meta.fields[key])
      }
   }

   if (meta.item) {
      result.item = resolveMeta(meta.item)
   }

   return result
}

function resolve() {
   const resolved: any = {}

   for (const key in schema) {
      //@ts-ignore
      resolved[key] = resolveMeta(schema[key][$meta])
   }

   console.log(JSON.stringify(resolved, null, 2))
}

resolve()
