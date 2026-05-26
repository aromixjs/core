import type { StandardSchemaV1 } from '@standard-schema/spec'
import type { Storage } from '../storage'
import type { CrushKeys } from '../utils'

export type SchemaInput<Schema extends StandardSchemaV1> = NonNullable<Schema['~standard']['types']>['input']
export type SchemaOutput<Schema extends StandardSchemaV1> = NonNullable<Schema['~standard']['types']>['output']

export interface EntityConfig<Schema extends StandardSchemaV1> {
   name: string
   storage: Storage.KV
   guards?: any[]
   effects?: any[]
   model: Schema
   access: (can: PermissionSet<SchemaOutput<Schema>>) => void
}

export interface Operation<Model> {
   (fields: CrushKeys<Model>[]): void
   omit(fields: CrushKeys<Model>[]): void
}

export interface PermissionSet<Model> {
   read: Operation<Model>
   write: Operation<Model>
}
