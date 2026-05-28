import type { StandardSchemaV1 } from '@standard-schema/spec';
import { Storage } from "./../storage";
import { Entity } from './entity.def';
import { liteKit } from '../ddl/lite.kit';

export type SchemaInput<Schema extends StandardSchemaV1> = NonNullable<Schema['~standard']['types']>['input']
export type SchemaOutput<Schema extends StandardSchemaV1> = NonNullable<Schema['~standard']['types']>['output']



// kv
export interface EntityKvConfig<Schema extends StandardSchemaV1> {
      name: string
      storage: Storage.KvAdapter
      guards?: any[]
      effects?: any[]
      model: Schema
}


export interface EntityKV<Schema extends StandardSchemaV1> {
      get(key: string): Promise<SchemaOutput<Schema>>
      set(key: string, value: SchemaInput<Schema>): Promise<void>
      delete(key: string): Promise<void>
      has(key: string): Promise<boolean>
      [Entity.$meta]: {
            name: string
            adapter: Storage.KvAdapter
            model: Schema
      }
}


export type LiteModel = Record<string, { [liteKit.$meta]: liteKit.Meta }>
export interface EntitySQLiteConfig {
      name: string
      storage: Storage.SQLiteAdapter
      model: LiteModel
}



export interface EntitySQLite {
      [Entity.$meta]: {
            name: string
            adapter: Storage.SQLiteAdapter
            model: LiteModel
      }
}