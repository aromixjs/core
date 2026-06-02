export namespace Adapter {
      export interface KV {
            get(key: string): Promise<unknown>
            set(key: string, value: unknown): Promise<void>
            delete(key: string): Promise<void>
            has(key: string): Promise<boolean>
      }

      export function kv(adapter: KV) {
            return adapter
      }

      export interface SQLite {
            query(sql: string): Promise<any>
            foreignKeys?: boolean
            wal?: boolean
            busyTimeout?: number
      }

      export function sqlite(adapter: SQLite) {
            return adapter
      }
}
