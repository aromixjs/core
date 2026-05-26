import { Adapter } from './adapter'

export namespace Storage {
      // Factories
      export function kv(adapter: Adapter.kv) {
            return adapter
      }
}
