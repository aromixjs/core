export interface SqliteAdapter {
    query(sql: string): Promise<unknown>
}

export function createSqliteAdapter(adapter: SqliteAdapter) {
    return adapter
}
