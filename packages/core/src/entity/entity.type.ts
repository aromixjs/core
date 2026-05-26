import type { StandardSchemaV1 } from '@standard-schema/spec'
import { Adapter } from '../storage/adapter'
import { Entity } from './entity.def'
import { Type } from '../global/type'

export type SchemaInput<Schema extends StandardSchemaV1> = NonNullable<Schema['~standard']['types']>['input']
export type SchemaOutput<Schema extends StandardSchemaV1> = NonNullable<Schema['~standard']['types']>['output']

export interface EntityConfig<Schema extends StandardSchemaV1> {
      name: string
      storage: Adapter.kv
      guards?: any[]
      effects?: any[]
      model: Schema
      access: (can: PermissionSet<SchemaOutput<Schema>>) => void
}

export interface Operation<Model> {
      (fields: Type.CrushKeys<Model>[]): void
      omit(fields: Type.CrushKeys<Model>[]): void
}

export interface PermissionSet<Model> {
      read: Operation<Model>
      write: Operation<Model>
}

export interface EntityKV<Schema extends StandardSchemaV1> {
      get(key: string): Promise<SchemaOutput<Schema>>
      set(key: string, value: SchemaInput<Schema>): Promise<void>
      delete(key: string): Promise<void>
      [Entity.$meta]: {
            adapter: Adapter.kv
            model: Schema
            readAccess: Record<string, boolean>
            writeAccess: Record<string, boolean>
      }
}
