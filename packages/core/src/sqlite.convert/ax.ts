import { AnySchema, ax, Operator, Schema } from '@aromix/validator'
import { ColumnState } from '../sqlite.ddl/column'

export namespace AxConverter {
    export function gt(minValue: number): Operator<number, number> {
        return ax.operator((value: number) => {
            if (value <= minValue) {
                throw new Error(`Must be greater than ${minValue}.`)
            }

            return value
        })
    }

    export function gte(minValue: number): Operator<number, number> {
        return ax.operator((value: number) => {
            if (value < minValue) {
                throw new Error(`Must be at least ${minValue}.`)
            }

            return value
        })
    }

    export function lt(maxValue: number): Operator<number, number> {
        return ax.operator((value: number) => {
            if (value >= maxValue) {
                throw new Error(`Must be less than ${maxValue}.`)
            }

            return value
        })
    }

    export function lte(maxValue: number): Operator<number, number> {
        return ax.operator((value: number) => {
            if (value > maxValue) {
                throw new Error(`Must be at most ${maxValue}.`)
            }

            return value
        })
    }

    export function minLength(length: number): Operator<string, string> {
        return ax.operator((value: string) => {
            if (value.length < length) {
                throw new Error(`Must contain at least ${length} characters.`)
            }

            return value
        })
    }

    export function maxLength(length: number): Operator<string, string> {
        return ax.operator((value: string) => {
            if (value.length > length) {
                throw new Error(`Must contain no more than ${length} characters.`)
            }

            return value
        })
    }

    export function column(state: ColumnState): Schema<unknown> {
        let schema: any

        switch (state.colType) {
            case 'text': {
                schema = ax.string()
                break
            }

            case 'int':
            case 'real': {
                schema = ax.number()
                break
            }

            case 'blob': {
                schema = ax.instance(Uint8Array)
                break
            }

            default: {
                throw new Error(`Unsupported column type "${state.colType}".`)
            }
        }

        for (const check of state.checks) {
            switch (check.op) {
                case 'gt': {
                    schema = schema.pipe(gt(check.val))
                    break
                }

                case 'gte': {
                    schema = schema.pipe(gte(check.val))
                    break
                }

                case 'lt': {
                    schema = schema.pipe(lt(check.val))
                    break
                }

                case 'lte': {
                    schema = schema.pipe(lte(check.val))
                    break
                }

                case 'minLength': {
                    schema = schema.pipe(minLength(check.val))
                    break
                }

                case 'maxLength': {
                    schema = schema.pipe(maxLength(check.val))
                    break
                }

                default: {
                    throw new Error(`Unsupported validation rule "${check.op}".`)
                }
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

    export function select(cols: Record<string, ColumnState>): any {
        const shape: Record<string, AnySchema> = {}
        for (const [key, col] of Object.entries(cols)) {
            shape[key] = column(col)
        }
        return ax.object(shape)
    }

    export function insert(cols: Record<string, ColumnState>): any {
        const shape: Record<string, AnySchema> = {}

        for (const [key, col] of Object.entries(cols)) {
            if (col.autoIncrement) {
                continue
            }
            let schema: any = column(col)

            if (!col.notNull || col.default !== undefined || col.defaultFn) {
                schema = ax.union([schema, ax.undefined()])
            }
            shape[key] = schema
        }
        return ax.object(shape)
    }

    export function update(cols: Record<string, ColumnState>): any {
        const shape: Record<string, AnySchema> = {}

        for (const [key, col] of Object.entries(cols)) {
            shape[key] = ax.union([column(col), ax.undefined()])
        }
        return ax.object(shape)
    }
}
