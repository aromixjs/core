import type { StandardSchemaV1 } from '@standard-schema/spec'
import type { EntityKV } from '../entity/entity.type'

export interface ComposeConfig {
      entities: EntityKV<StandardSchemaV1>[]
}



export interface ResolvedModule {
      entities: EntityKV<StandardSchemaV1>[]



}