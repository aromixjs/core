import { kv, KvField, Model, Storage } from "@aromix/core";

const redis = Storage.kv({
   async get(key) {
      return "datya";
   },
   async set(key, value) { },

   async has(k) {
      return true;
   },
   async delete(key) { },
});




const md = Model.kv({

   base: kv.object({
      name: kv.string()
   })


})


