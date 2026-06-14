export interface SqliteAdapter {
    query(sql: string): Promise<any>
}

export function createSqliteAdapter(adapter: SqliteAdapter) {
    return adapter
}
