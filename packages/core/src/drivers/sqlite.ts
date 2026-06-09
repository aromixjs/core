import { TableOptionsCtx, TableState } from "../lite"



export namespace Sqlite {
    export interface Adapter {
        query(sql: string): Promise<unknown>
    }

    export function adapter(adapter: Sqlite.Adapter) {
        return adapter
    }

    export interface EntityInput<State extends TableState> {
        name: string
        adapter: Sqlite.Adapter
        columns: State
        options(ctx: TableOptionsCtx<State>): void
    }

    export interface EntityOutput {
        state: {
            name: string
            adapter: Sqlite.Adapter
        }
    }

    export function entity<State extends TableState>(input: Sqlite.EntityInput<State>): Sqlite.EntityOutput {
        return {
            state: {
                name: input.name,
                adapter: input.adapter,
            },
        }
    }
}
