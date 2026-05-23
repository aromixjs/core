import { returnsAsync } from "valibot";
import { Obj } from "../utils";

export namespace KvField {
   /**
    * Type of data that a kvField is allowed to store
    * This mimics typescript type to give good type inference
    */
   export type Type =
      | "string"
      | "number"
      | "bigint"
      | "boolean"
      | "date"
      | "buffer"
      | "object"
      | "array"
      | "any";

   /**
    * A 1:1 Type mapping between the type of value a kvField allowed to store and there type representation in typescript
    */
   export interface TypeMap {
      string: string;
      number: number;
      bigint: bigint;
      boolean: boolean;
      date: Date;
      buffer: Buffer;
      object: Record<string, unknown>;
      array: unknown[];
      any: any;
   }





   /**
    * This is the type for the underlying meta data object that all the kv field chains generates.
    * This is the main source of the truth it will hold all the necessary information that will derive the sdk generation,
    * type generation, validation schema generation and all other necessary work
    */
   export interface Meta<FieldType extends Type = Type> {
      type: FieldType;
      default: KvField.TypeMap[FieldType] | undefined | (()=> KvField.TypeMap[FieldType]) ;
      readable: boolean,
      writable: boolean
   }

   /**
    * Represents Any Type of Field
    * This Broader Type Used For getting the field meta only
    */
   // export type Any = { [$meta]: Meta<Type> }

   export const $def = Symbol('KV:Field:Meta:Definition')
   export function modifier<FieldType extends Type>(type: FieldType) {

      const meta: Meta<FieldType> = {
         type,
         default: undefined,
         readable: false,
         writable: false
      };

      const modifiers = {
         default(data: TypeMap[FieldType] | (()=> TypeMap[FieldType])) {
            meta.default = data;
            return new Obj(this).omit(["default"]);
         },

         readable() {
            meta.readable = true;
            return new Obj(this).omit(['readable', 'public'])
         },

         writable() {
            meta.writable = true
            return new Obj(this).omit(['writable', 'public'])
         },


         public() {
            meta.writable = true
            meta.readable = true
            return new Obj(this).omit(['public', 'readable', 'writable'])
         },

         get [KvField.$def]() {
            return meta
         }
      };

      return modifiers
   }
}
