import { ax } from '@aromix/validator'
import type { Schema } from '@aromix/validator'
import { ColumnState } from '../lite'
import type { LiteToAx } from './types'
import type { Chain } from '../lite'

export function liteToAx<C extends Chain<any, any, boolean, boolean, any>>(chain: C): LiteToAx<C>
export function liteToAx(state: ColumnState): Schema<unknown>

export function liteToAx(arg: any): any {
    const state: ColumnState = arg.state ?? arg
    let schema: any

    switch (state.colType) {
        case 'text':
            schema = ax.string()
            break
        case 'int':
        case 'real':
            schema = ax.number()
            break
        case 'blob':
            schema = ax.instance(Uint8Array)
            break
    }

    for (const check of state.checks) {
        switch (check.op) {
            case 'gt':
                schema = schema.pipe(ax.operator((v: number) => {
                    if (!(v > check.val)) throw new Error(`must be > ${check.val}`)
                    return v
                }))
                break
            case 'gte':
                schema = schema.pipe(ax.operator((v: number) => {
                    if (!(v >= check.val)) throw new Error(`must be >= ${check.val}`)
                    return v
                }))
                break
            case 'lt':
                schema = schema.pipe(ax.operator((v: number) => {
                    if (!(v < check.val)) throw new Error(`must be < ${check.val}`)
                    return v
                }))
                break
            case 'lte':
                schema = schema.pipe(ax.operator((v: number) => {
                    if (!(v <= check.val)) throw new Error(`must be <= ${check.val}`)
                    return v
                }))
                break
            case 'minLength':
                schema = schema.pipe(ax.operator((v: string) => {
                    if (v.length < check.val) throw new Error(`must have length >= ${check.val}`)
                    return v
                }))
                break
            case 'maxLength':
                schema = schema.pipe(ax.operator((v: string) => {
                    if (v.length > check.val) throw new Error(`must have length <= ${check.val}`)
                    return v
                }))
                break
        }
    }

    for (const op of state.pipes) {
        schema = schema.pipe(op)
    }

    if (!state.notNull) {
        schema = ax.union([schema, ax.null()])
    }

    if (state.default !== undefined) {
        schema = schema.default(state.default)
    } else if (state.defaultFn) {
        schema = schema.defaultFn(state.defaultFn)
    }

    return schema
}
