import type { StandardSchemaV1 } from '@standard-schema/spec'
import type { Internals } from '../utils'
import type { EntityConfig, InferSchema, Operation } from './entity.types'

function createOperation<Model>(): Operation<Model> {
  const state: Record<string, boolean> = {}

  const handler = (fields: Internals.CrushKeys<Model>[]) => {
    for (const field of fields) {
      state[field] = true
    }
  }

  handler.omit = (fields: Internals.CrushKeys<Model>[]) => {
    for (const field of fields) {
      state[field] = false
    }
  }

  return Object.assign(handler, { omit: handler.omit, state })
}

export function entity<Schema extends StandardSchemaV1>(configuration: EntityConfig<Schema>) {
  const readOperation = createOperation<InferSchema<Schema>>()
  const writeOperation = createOperation<InferSchema<Schema>>()

  configuration.access({ read: readOperation, write: writeOperation })
}
