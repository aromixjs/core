import type { StandardSchemaV1 } from '@standard-schema/spec'
import type { Internals } from '../utils'

export type InferSchema<Schema extends StandardSchemaV1> = NonNullable<Schema['~standard']['types']>['output']


export interface EntityConfig<Schema extends StandardSchemaV1> {
   name: string
   storage?: unknown
   guards?: any[]
   effects?: any[]
   model: Schema
   access: (can: PermissionSet<InferSchema<Schema>>) => void
}

export interface Operation<Model> {
   (fields: Internals.CrushKeys<Model>[]): void
   omit(fields: Internals.CrushKeys<Model>[]): void
}

export interface PermissionSet<Model> {
   read: Operation<Model>
   write: Operation<Model>
}