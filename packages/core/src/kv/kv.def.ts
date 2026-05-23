import { Type, TypeMap, Meta } from "./kv.type";
import { Obj, Optional } from "../utils";

export const $meta = Symbol('kv:meta')

export class kv<FieldType extends Type = Type> {

   [$meta]: Meta<FieldType>;

   private constructor(config: {
      type: FieldType;
      shape?: Record<string, { [$meta]: Meta }>;
      item?: { [$meta]: Meta };
   }) {

      let fields: Optional<Record<string, Meta>>;

      if (config.shape) {
         fields = {}

         for (const key of Object.keys(config.shape)) {
            fields[key] = config.shape[key][$meta]
         }
      }

      this[$meta] = {
         type: config.type,
         default: undefined,
         readable: false,
         writable: false,
         defaultFn: undefined,
         fields,
         item: config.item?.[$meta],
      };
   }

   // Modifier methods
   default(data: TypeMap[FieldType]) {
      this[$meta].default = data;

      return new Obj(this).omit(["default", "defaultFn"]);
   }

   defaultFn(fn: () => TypeMap[FieldType]) {
      this[$meta].defaultFn = fn;

      return new Obj(this).omit(["default", "defaultFn"]);
   }

   readable() {
      this[$meta].readable = true;

      return new Obj(this).omit(["readable"]);
   }

   writable() {
      this[$meta].writable = true;

      return new Obj(this).omit(["writable"]);
   }

   public() {
      this[$meta].writable = true;
      this[$meta].readable = true;

      return new Obj(this).omit(["readable", "writable"]);
   }


   // Entry Point Methods
   static string() {
      return new kv({ type: "string" });
   }

   static number() {
      return new kv({ type: "number" });
   }

   static bigint() {
      return new kv({ type: "bigint" });
   }

   static boolean() {
      return new kv({ type: "boolean" });
   }

   static date() {
      return new kv({ type: "date" });
   }

   static buffer() {
      return new kv({ type: "buffer" });
   }

   static object(shape: Record<string, { [$meta]: Meta }>) {
      return new kv({ type: "object", shape });
   }

   static array(item: { [$meta]: Meta }) {
      return new kv({ type: "array", item });
   }

   static any() {
      return new kv({ type: "any" });
   }
}
