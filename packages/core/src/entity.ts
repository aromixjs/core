import type { StandardSchemaV1 } from '@standard-schema/spec'
import { Storage } from "./storage"

export interface EntityConfig<Schema extends StandardSchemaV1> {
  name: string
  storage: Storage.KV
  guards?: any[]
  effects?: any[]
  model: Schema
}

type Infer<S extends StandardSchemaV1> = NonNullable<S['~standard']['types']>['output']


interface KvCan<T> {
  read(fields: (keyof T)[]): void
  write(fields: (keyof T)[]): void
}


export interface AromixRoles {}

export function entity<Schema extends StandardSchemaV1>(config: EntityConfig<Schema>) {



  type T = Infer<Schema>

  return {


    access(map: { [K in keyof AromixRoles]: (fields: T, can: KvCan<T>) => void }) { }





  }
}