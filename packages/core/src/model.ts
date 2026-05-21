import { KvField } from "./kv/builder";

export namespace model {

   interface KvInput {
      base: KvField.Builder<'any'>


   }

   export function kv(input: KvInput) { }


}

