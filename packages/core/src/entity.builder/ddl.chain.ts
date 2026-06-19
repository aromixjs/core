import { AnySchema } from '@aromix/validator'

export interface DdlTypeMap {
    Text: string
    Int: number
    Real: number
    Blob: Uint8Array
}
export type DdlType = keyof DdlTypeMap

export type OperatorDef = (...args: any[]) => Partial<{
    all: AnySchema
    select: AnySchema
    insert: AnySchema
    update: AnySchema
}>


export const Operator = {
   Text<const Fn extends OperatorDef>(fn: Fn): Fn { return fn },
   Int<const Fn extends OperatorDef>(fn: Fn): Fn { return fn },
   Real<const Fn extends OperatorDef>(fn: Fn): Fn { return fn },
   Blob<const Fn extends OperatorDef>(fn: Fn): Fn { return fn },
}