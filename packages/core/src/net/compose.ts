import { KvEntityOutput } from "../kv/entity";
import { SqliteEntityOutput } from "../sqlite/entity.types";

export interface ComposeInput {
    entities: Array<KvEntityOutput<any> | SqliteEntityOutput<any>>
    child?: ComposeInput
}

export interface ComposeOutput {
    kv: KvEntityOutput<any>[]
    sqlite: SqliteEntityOutput<any>[]
}

export function compose(input: ComposeInput): ComposeOutput {
    const kv: KvEntityOutput<any>[] = []
    const sqlite: SqliteEntityOutput<any>[] = []

    for (const entity of input.entities) {
        if ('get' in entity) {
            kv.push(entity as KvEntityOutput<any>)
        } else {
            sqlite.push(entity as SqliteEntityOutput<any>)
        }
    }

    if (input.child) {
        const child = compose(input.child)
        kv.push(...child.kv)
        sqlite.push(...child.sqlite)
    }

    const dedup = <T extends { state: { name: string } }>(arr: T[]) =>
        arr.filter((e, i, a) => a.findIndex(x => x.state.name === e.state.name) === i)

    return { kv: dedup(kv), sqlite: dedup(sqlite) }
}
