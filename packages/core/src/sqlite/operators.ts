import { AnySchema } from "@aromix/validator"
import { ColumnState, ColumnType } from "./states"


export interface OperatorCtx<Type extends ColumnType> {
    readonly state: ColumnState & {
        colType: Type
    },
    set(meta: Record<string, unknown>): void
}


export interface SchemaShape {
    select?: AnySchema
    insert?: AnySchema,
    update?: AnySchema
}

export type OperatorFn<Type extends ColumnType, Args extends any[] = any[], Schema extends SchemaShape | void = SchemaShape | void> = (ctx: OperatorCtx<Type>, ...args: Args) => Schema

export function Operator<
    const Type extends Partial<{
        Text: OperatorFn<"Text", any[], any>
        Int: OperatorFn<"Int", any[], any>
        Real: OperatorFn<"Real", any[], any>
        Blob: OperatorFn<"Blob", any[], any>
    }>
>(def: Type): Type {
    return def
}


export type AnyOperator = ReturnType<typeof Operator>
export type OperatorRecord = Record<string, AnyOperator>


