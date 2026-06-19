import { AnySchema } from "@aromix/validator"
import { ColumnState, ColumnType } from "./states"
export interface OperatorCtx<Type extends ColumnType> {
    readonly state: ColumnState<Type>
    set(meta: Record<string, unknown>): void
}

export interface SchemaShape {
    select?: AnySchema
    insert?: AnySchema,
    update?: AnySchema
}

export type OperatorFn<Type extends ColumnType, Args extends any[] = any[], Schema extends SchemaShape | void = SchemaShape | void> = (ctx: OperatorCtx<Type>, ...args: Args) => Schema

export type AnyOperator = Partial<{
    Text: OperatorFn<'Text'>
    Int: OperatorFn<'Int'>
    Real: OperatorFn<'Real'>
    Blob: OperatorFn<'Blob'>

}>
export type AnyOperatorRecord = Record<string, AnyOperator>




export type PrettifyObj<Type extends object> = { [Key in keyof Type]: Type[Key] } & {}


export function Operator<const Type extends AnyOperator>(def: Type): Type {
    return def
}




