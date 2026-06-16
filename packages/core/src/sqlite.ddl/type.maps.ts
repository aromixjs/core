export interface ColumnTypeMap {
    'int.notNull': {
        select: number
        insert: number
        update: number
    }
    'int.nullable': {
        select: number | null
        insert: number | null | undefined
        update: number | null
    }
    'int.default': {
        select: number
        insert: number | undefined
        update: number | undefined
    }
    'int.autoIncrement': {
        select: number
        insert: never
        update: never
    }

    'real.notNull': {
        select: number
        insert: number
        update: number
    }
    'real.nullable': {
        select: number | null
        insert: number | null | undefined
        update: number | null
    }
    'real.default': {
        select: number
        insert: number | undefined
        update: number | undefined
    }

    'text.notNull': {
        select: string
        insert: string
        update: string
    }
    'text.nullable': {
        select: string | null
        insert: string | null | undefined
        update: string | null
    }
    'text.default': {
        select: string
        insert: string | undefined
        update: string | undefined
    }

    'blob.notNull': {
        select: Uint8Array
        insert: Uint8Array
        update: Uint8Array
    }
    'blob.nullable': {
        select: Uint8Array | null
        insert: Uint8Array | null | undefined
        update: Uint8Array | null
    }
    'blob.default': {
        select: Uint8Array
        insert: Uint8Array | undefined
        update: Uint8Array | undefined
    }
}

export interface ColumnTransitionMap {
    notNull: {
        'int.notNull': 'int.notNull'
        'int.nullable': 'int.notNull'
        'int.default': 'int.notNull'
        'int.autoIncrement': 'int.notNull'

        'real.notNull': 'real.notNull'
        'real.nullable': 'real.notNull'
        'real.default': 'real.notNull'

        'text.notNull': 'text.notNull'
        'text.nullable': 'text.notNull'
        'text.default': 'text.notNull'

        'blob.notNull': 'blob.notNull'
        'blob.nullable': 'blob.notNull'
        'blob.default': 'blob.notNull'
    }
    default: {
        'int.notNull': 'int.default'
        'int.nullable': 'int.default'
        'int.default': 'int.default'
        'int.autoIncrement': 'int.default'
        'real.notNull': 'real.default'
        'real.nullable': 'real.default'
        'real.default': 'real.default'
        'text.notNull': 'text.default'
        'text.nullable': 'text.default'
        'text.default': 'text.default'
        'blob.notNull': 'blob.default'
        'blob.nullable': 'blob.default'
        'blob.default': 'blob.default'
    }
    autoIncrement: {
        'int.notNull': 'int.autoIncrement'
        'int.nullable': 'int.autoIncrement'
        'int.default': 'int.autoIncrement'
        'int.autoIncrement': 'int.autoIncrement'
        'real.notNull': never
        'real.nullable': never
        'real.default': never
        'text.notNull': never
        'text.nullable': never
        'text.default': never
        'blob.notNull': never
        'blob.nullable': never
        'blob.default': never
    }
}
export type ColumnType = keyof ColumnTypeMap
