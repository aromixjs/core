export interface LiteAdapter {
    query: (sql: string) => Promise<unknown>
}

export interface LiteEntityInput {
    name: string
    adapter: LiteAdapter
    // fields: (builder: Builder) => Array<any>
}

export function LiteEntity(input: LiteEntityInput) {
    return {
        col(colName: string) {
            return {
                colName,
                tableName: input.name,
                // tableState: input.fields(builder).map((m) => m.state),
            }
        },
    }
}
