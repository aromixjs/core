import { KvBuilder } from "./kv/kv.builder";
import { KvEntity } from "./kv/kv.entity";
import { EntityOptions } from "./types";
export function entity(options: EntityOptions) {
   const builder = new KvBuilder(options.name);
   options.schema(builder);
   const schema = builder.getSchema();
   return new KvEntity(options.storage, schema);
}
