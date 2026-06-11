import { Schema } from "@aromix/validator"
import { Chain } from "../lite"

type ChainNotNull<C extends Chain<any, any, boolean, boolean, any>> =
    C extends Chain<any, any, infer N, any, any> ? N : false

type ChainOutput<C extends Chain<any, any, boolean, boolean, any>> =
    C extends Chain<any, any, any, any, infer O> ? O : never

export type LiteToAxOutput<C extends Chain<any, any, boolean, boolean, any>> =
    ChainNotNull<C> extends true ? ChainOutput<C> : ChainOutput<C> | null

export type LiteToAx<C extends Chain<any, any, boolean, boolean, any>> =
    Schema<LiteToAxOutput<C>>
