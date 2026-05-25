export namespace Adapter {
      export interface KV {
            get(key: string): Promise<unknown>
            set(key: string, value: unknown): Promise<void>
            delete(key: string): Promise<void>
            has(key: string): Promise<boolean>
      }
}

export namespace Storage {
      // Types
      export interface KV {
            readonly type: 'kv'
            readonly adapter: Adapter.KV
      }

      // Factories
      export function kv(adapter: Adapter.KV): KV {
            return {
                  type: 'kv',
                  adapter,
            }
      }
}
