import { object } from "../utils";

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
      default: KvField.TypeMap[FieldType] | undefined;
      shape: Meta | Record<string, Meta> | undefined
   }


   /**
    * Represents Any Type of Field
    * This Broader Type Used For getting the field meta only 
    */
   export type Any = { [$meta]: Meta<Type> }




   export const $meta = Symbol("KV:Field:Meta");



   export class Builder<FieldType extends Type> {
      [$meta]: Meta<FieldType>;

      constructor(type: FieldType, shape?: Meta['shape']) {
         this[$meta] = {
            type,
            default: undefined,
            shape
         };
      }

      default(data: TypeMap[FieldType]) {
         this[$meta].default = data;
         return object<Builder<FieldType>>(this).omit(["default"]);
      }
   }
}
