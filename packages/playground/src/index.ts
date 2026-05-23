import { kv, KvField } from "@aromix/core";

const schema = {
   // Both directions — client can read and write (full public API)
   id: kv.bigint().public(),
   name: kv.string().public(),
   email: kv.string().public(),

   // Output only — client sees it but can't write
   createdAt: kv.date().default(() => new Date()).readable(),
   role: kv.string().default("user").readable(),

   // Input only — client provides it but never gets it back
   password: kv.string().writable(),
   confirmToken: kv.string().writable(),

   // Server only — not in any open SDK type
   passwordHash: kv.string(),
   sdkKey: kv.string().default(() => crypto.randomUUID()),
};



function resolve() {
   const resolvedMeta: any = {}

   for (const key in schema) {
      //@ts-ignore
      resolvedMeta[key] = schema[key][KvField.$def]
   }
}

resolve()