import { OperatorRecord } from "./entity.builder"

export type Chain<Col extends string, Methods extends OperatorRecord> = {
    [Key in keyof Methods]: (...args: Parameters<Methods[Key]>) => Chain<Col, Methods>
}

export class Builder<
    TextOps extends OperatorRecord,
    IntOps extends OperatorRecord,
    RealOps extends OperatorRecord,
    BlobOps extends OperatorRecord
> {
    constructor(
        private textOps: TextOps,
        private intOps: IntOps,
        private realOps: RealOps,
        private blobOps: BlobOps,
    ) { }

    private make(col: string, ops: Record<string, Function>) {
        const result: any = { col }
        for (const key in ops) result[key] = () => result
        return result
    }

    text<const Col extends string>(col: Col): Chain<Col, TextOps> {
        return this.make(col, this.textOps) as any
    }
    int<const Col extends string>(col: Col): Chain<Col, IntOps> {
        return this.make(col, this.intOps) as any
    }
    real<const Col extends string>(col: Col): Chain<Col, RealOps> {
        return this.make(col, this.realOps) as any
    }
    blob<const Col extends string>(col: Col): Chain<Col, BlobOps> {
        return this.make(col, this.blobOps) as any
    }
}