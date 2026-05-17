import * as v from "valibot";
import { KvFieldMeta, KvSchemaMeta, Schema } from "./kv.types";

class KvFieldBuilder {
   private meta: KvFieldMeta;

   constructor(meta: KvFieldMeta) {
      this.meta = meta;
   }
}

export class KvBuilder {
   private schema: KvSchemaMeta;

   constructor(key: string) {
      this.schema = { key, fields: [] };
   }

   getSchema(): KvSchemaMeta {
      return this.schema;
   }

   private add(name: string, schema: Schema): KvFieldBuilder {
      const meta: KvFieldMeta = { name, schema };
      this.schema.fields.push(meta);
      return new KvFieldBuilder(meta);
   }

   string(name: string) {
      return this.add(name, v.string());
   }
   number(name: string) {
      return this.add(name, v.number());
   }
   boolean(name: string) {
      return this.add(name, v.boolean());
   }
   binary(name: string) {
      return this.add(name, v.instance(Uint8Array));
   }

   object(name: string, shape: Record<string, Schema>) {
      return this.add(name, v.object(shape));
   }

   array(name: string, item: Schema) {
      return this.add(name, v.array(item));
   }
}
