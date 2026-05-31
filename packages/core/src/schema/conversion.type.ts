import { LiteModel, Meta } from "../ddl/lite.type"
import { Kit } from "../global/kit"
import * as v from 'valibot'

type BaseSchema<T extends Meta['type']> =
   T extends 'int' | 'real' ? v.NumberSchema<undefined>
   : T extends 'text' ? v.StringSchema<undefined>
   : T extends 'boolean' ? v.BooleanSchema<undefined>
   : T extends 'blob' ? v.GenericSchema<Uint8Array>
   : T extends 'bigint' ? v.BigintSchema<undefined>
   : T extends 'date' ? v.DateSchema<undefined>
   : v.AnySchema

type ApplySelect<M extends Meta> =
   M['notNull'] extends true
   ? BaseSchema<M['type']>
   : v.NullableSchema<BaseSchema<M['type']>, undefined>

type ApplyInsert<M extends Meta> =
   M['primaryKey'] extends true
   ? v.OptionalSchema<BaseSchema<M['type']>, undefined>
   : M['notNull'] extends true
   ? BaseSchema<M['type']>
   : v.OptionalSchema<BaseSchema<M['type']>, undefined>

type ApplyUpdate<M extends Meta> =
   v.OptionalSchema<BaseSchema<M['type']>, undefined>

type ExtractMeta<T> =
   T extends { readonly [K in typeof Kit.$meta]: infer M extends Meta } ? M : never

export type ToShape<TModel extends LiteModel, TContext extends 'select' | 'insert' | 'update'> = {
   readonly [K in keyof TModel]:
   TContext extends 'select' ? ApplySelect<ExtractMeta<TModel[K]>>
   : TContext extends 'insert' ? ApplyInsert<ExtractMeta<TModel[K]>>
   : ApplyUpdate<ExtractMeta<TModel[K]>>
}

export type SelectSchema<TModel extends LiteModel> = v.ObjectSchema<ToShape<TModel, 'select'>, undefined>
export type InsertSchema<TModel extends LiteModel> = v.ObjectSchema<ToShape<TModel, 'insert'>, undefined>
export type UpdateSchema<TModel extends LiteModel> = v.ObjectSchema<ToShape<TModel, 'update'>, undefined>