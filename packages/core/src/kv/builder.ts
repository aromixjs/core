import { object } from "../utils";

export namespace KvField {

   export type Type = 'string' | 'number' | 'boolean' | 'any'

   export interface TypeMap {
      'string': string,
      'number': number,
      'boolean': boolean,
      'any': any
   }


   export interface Meta<FieldType extends KvField.Type> {
      type: FieldType,
      default: KvField.TypeMap[FieldType] | undefined
   }





   export class Builder<FieldType extends KvField.Type> {
      private meta: KvField.Meta<FieldType>;

      constructor(type: FieldType) {
         this.meta = {
            type,
            default: undefined
         }
      }

      default(data: KvField.TypeMap[FieldType]) {
         this.meta.default = data
         return object<Builder<FieldType>>(this).omit(['default'])
      }

   }

}







class KV {
   string() {
      return new KvField.Builder('string')
   }

   number() {
      return new KvField.Builder('number')
   }

   boolean() {
      return new KvField.Builder('boolean')
   }



}



export const kv = new KV();





