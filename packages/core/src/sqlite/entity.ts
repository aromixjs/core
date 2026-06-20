import { BlobModifier } from "./columns/blob"
import { IntModifier } from "./columns/int"
import { RealModifier } from "./columns/real"
import { TextModifier } from "./columns/text"

export interface LiteAdapter {
    query: (sql: string) => Promise<unknown>
}



export interface Builder {
    text<const Col extends string>(col: Col): TextModifier<Col>
    int<const Col extends string>(col: Col): IntModifier<Col>
    real<const Col extends string>(col: Col): RealModifier<Col>
    blob<const Col extends string>(col: Col): BlobModifier<Col>
}


export interface LiteEntityInput {
    name: string
    adapter: LiteAdapter
    fields: (builder: Builder) => Array<any>
}

export function LiteEntity(input: LiteEntityInput) {


    const builder: Builder = {

        text(col) {
            return new TextModifier(col)
        },
        int(col) {
            return new IntModifier(col)
        },

        real(col) {
            return new RealModifier(col)
        },
        blob(col) {
            return new BlobModifier(col)
        },
    }



    input.fields(builder)



    return {
        col(colName: string) {
            return {
                colName,
                tableName: input.name,
                tableState: input.fields(builder).map((m) => m.state),
            }
        },
    }
}
