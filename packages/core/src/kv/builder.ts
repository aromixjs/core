import { KvField } from "./field";

export namespace kv {

   export function string() {
      return new KvField.Builder("string");
   }

   export function number() {
      return new KvField.Builder("number");
   }

   export function bigint() {
      return new KvField.Builder("bigint");
   }

   export function boolean() {
      return new KvField.Builder("boolean");
   }

   export function date() {
      return new KvField.Builder("date");
   }

   export function buffer() {
      return new KvField.Builder("buffer");
   }

   export function object<Shape extends Record<string, KvField.Any>>(
      shapeSchema: Shape,
   ) {
      const entries = Object.entries(shapeSchema).map(([k, v]) => [k, v[KvField.$meta]])
      const metaShape = Object.fromEntries(entries)
      return new KvField.Builder('object', metaShape)

   }

   export function array<Shape extends KvField.Any>(shapeSchema: Shape) {
      return new KvField.Builder("array", shapeSchema[KvField.$meta]);
   }

   export function any() {
      return new KvField.Builder("any");
   }
}
