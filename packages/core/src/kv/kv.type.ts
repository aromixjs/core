import { Optional, PrettifyObj } from "../utils";
import { $meta } from "./kv.def";

/**
 * Type of data that a kv schema is allowed to store
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
 * A 1:1 Type mapping between the type of value a kv allowed to store and there type representation in typescript
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
   default: Optional<TypeMap[FieldType]>;
   readable: boolean,
   writable: boolean,
   defaultFn: Optional<() => TypeMap[FieldType]>;
   fields: Optional<Record<string, Meta>>;
   item: Optional<Meta>;
}

export type KvField = { [$meta]: Meta; $infer: any };
export type KvShape = Record<string, KvField>;
export type InferShape<S extends KvShape> = PrettifyObj<{ [K in keyof S]: S[K]["$infer"] }>;

