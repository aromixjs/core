import { ColumnState } from "../ddl/types/column"


export namespace Sqlite {
    export interface Adapter {
        query(sql: string): Promise<unknown>
    }

    export function adapter(adapter: Sqlite.Adapter) {
        return adapter
    }

    export interface EntityInput {
        name: string
        adapter: Sqlite.Adapter
        columns: Record<string, {
            readonly state: ColumnState
        }>
    }

    export interface EntityOutput {
        state: {
            name: string
            adapter: Sqlite.Adapter
        }
    }

    export function entity(input: Sqlite.EntityInput): Sqlite.EntityOutput {
        return {
            state: {
                name: input.name,
                adapter: input.adapter,
            },
        }
    }
}
