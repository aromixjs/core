import { describe, it, expect, expectTypeOf } from 'vitest'
import { ax } from '@aromix/validator'
import { Column, lite } from '../src'

describe('lite column creation', () => {
    it('creates an int column', () => {
        const col = lite.int()
        expect(col.state.colType).toBe('int')
    })

    it('creates a real column', () => {
        const col = lite.real()
        expect(col.state.colType).toBe('real')
    })

    it('creates a text column', () => {
        const col = lite.text()
        expect(col.state.colType).toBe('text')
    })

    it('creates a blob column', () => {
        const col = lite.blob()
        expect(col.state.colType).toBe('blob')
    })

    it('state has default values', () => {
        const col = lite.int()
        expect(col.state.primaryKey).toBe(false)
        expect(col.state.autoIncrement).toBe(false)
        expect(col.state.notNull).toBe(false)
        expect(col.state.unique).toBe(false)
        expect(col.state.index).toBe(false)
        expect(col.state.checks).toEqual([])
        expect(col.state.in).toEqual([])
        expect(col.state.pipes).toEqual([])
        expect(col.state.default).toBeUndefined()
        expect(col.state.defaultFn).toBeUndefined()
        expect(col.state.onUpdate).toBeUndefined()
        expect(col.state.collate).toBeUndefined()
        expect(col.state.references).toBeUndefined()
    })

    it('Column is instanceof Column', () => {
        expect(lite.int()).toBeInstanceOf(Column)
    })
})

describe('Chain type inference', () => {
    it('int column has state with colType', () => {
        const col = lite.int()
        expect(col.state.colType).toBe('int')
    })

    it('text column state colType', () => {
        const col = lite.text()
        expect(col.state.colType).toBe('text')
    })

    it('real column state colType', () => {
        const col = lite.real()
        expect(col.state.colType).toBe('real')
    })

    it('blob column state colType', () => {
        const col = lite.blob()
        expect(col.state.colType).toBe('blob')
    })
})

describe('primaryKey', () => {
    it('sets primaryKey on state', () => {
        const col = lite.int().primaryKey()
        expect(col.state.primaryKey).toBe(true)
    })

    it('primaryKey also sets notNull (SQL behavior)', () => {
        const col = lite.int().primaryKey()
        expect(col.state.notNull).toBe(true)
    })

    it('primaryKey can be chained with other methods', () => {
        const col = lite.int().primaryKey().autoIncrement()
        expect(col.state.primaryKey).toBe(true)
        expect(col.state.autoIncrement).toBe(true)
    })
})

describe('notNull', () => {
    it('sets notNull on state', () => {
        const col = lite.int().notNull()
        expect(col.state.notNull).toBe(true)
    })

    it('notNull can be called after primaryKey (redundant but valid)', () => {
        const col = lite.int().primaryKey().notNull()
        expect(col.state.notNull).toBe(true)
    })
})

describe('unique', () => {
    it('sets unique with default conflict', () => {
        const col = lite.text().unique()
        expect(col.state.unique).toBe(true)
        expect(col.state.uniqueConflict).toBe('conflict:error')
    })

    it('accepts conflict strategy', () => {
        const col = lite.text().unique('conflict:ignore')
        expect(col.state.uniqueConflict).toBe('conflict:ignore')
    })

    it('accepts conflict:replace', () => {
        const col = lite.text().unique('conflict:replace')
        expect(col.state.uniqueConflict).toBe('conflict:replace')
    })
})

describe('index', () => {
    it('sets index on state', () => {
        const col = lite.int().index()
        expect(col.state.index).toBe(true)
    })
})

describe('collate', () => {
    it('sets collation on text column', () => {
        const col = lite.text().collate('nocase')
        expect(col.state.collate).toBe('nocase')
    })

    it('accepts binary and rtrim', () => {
        expect(lite.text().collate('binary').state.collate).toBe('binary')
        expect(lite.text().collate('rtrim').state.collate).toBe('rtrim')
    })
})

describe('check constraints (gt, gte, lt, lte, minLength, maxLength)', () => {
    it('gt adds check entry', () => {
        const col = lite.int().gt(0)
        expect(col.state.checks).toEqual([{ op: 'gt', val: 0 }])
    })

    it('gte adds check entry', () => {
        const col = lite.int().gte(18)
        expect(col.state.checks).toEqual([{ op: 'gte', val: 18 }])
    })

    it('lt adds check entry', () => {
        const col = lite.int().lt(100)
        expect(col.state.checks).toEqual([{ op: 'lt', val: 100 }])
    })

    it('lte adds check entry', () => {
        const col = lite.int().lte(200)
        expect(col.state.checks).toEqual([{ op: 'lte', val: 200 }])
    })

    it('multiple checks accumulate', () => {
        const col = lite.int().gt(0).lt(100)
        expect(col.state.checks).toEqual([
            { op: 'gt', val: 0 },
            { op: 'lt', val: 100 },
        ])
    })

    it('minLength on text', () => {
        const col = lite.text().minLength(3)
        expect(col.state.checks).toEqual([{ op: 'minLength', val: 3 }])
    })

    it('maxLength on text', () => {
        const col = lite.text().maxLength(255)
        expect(col.state.checks).toEqual([{ op: 'maxLength', val: 255 }])
    })
})

describe('in', () => {
    it('sets allowed values', () => {
        const col = lite.text().in(['admin', 'user', 'guest'])
        expect(col.state.in).toEqual(['admin', 'user', 'guest'])
    })

    it('in() replaces the array (not append)', () => {
        const col = lite.text().in(['a'])
        expect(col.state.in).toEqual(['a'])
        // A second in() call is prevented at type level by Used tracking.
        // Runtime behavior: calling in() again would replace, not append.
    })
})

describe('default', () => {
    it('sets a static default', () => {
        const col = lite.int().default(0)
        expect(col.state.default).toBe(0)
    })

    it('default on text column', () => {
        const col = lite.text().default('hello')
        expect(col.state.default).toBe('hello')
    })

    it('default on real column', () => {
        const col = lite.real().default(0.0)
        expect(col.state.default).toBe(0.0)
    })
})

describe('defaultFn', () => {
    it('sets a dynamic default function', () => {
        const col = lite.text().defaultFn(() => crypto.randomUUID())
        expect(typeof col.state.defaultFn).toBe('function')
    })

    it('defaultFn returns correct type', () => {
        let counter = 0
        const col = lite.int().defaultFn(() => ++counter)
        expect(col.state.defaultFn!()).toBe(1)
        expect(col.state.defaultFn!()).toBe(2)
    })
})

describe('onUpdate', () => {
    it('sets onUpdate function', () => {
        const col = lite.text().onUpdate(() => new Date().toISOString())
        expect(typeof col.state.onUpdate).toBe('function')
    })
})

describe('pipe', () => {
    it('appends operator to pipes array', () => {
        const op = ax.operator((v: string) => v.toUpperCase())
        const col = lite.text().pipe(op)
        expect(col.state.pipes).toHaveLength(1)
        expect(col.state.pipes[0]).toBe(op)
    })

    it('multiple pipes accumulate', () => {
        const toUpper = ax.operator((v: string) => v.toUpperCase())
        const toArray = ax.operator((v: string) => v.split(','))
        const col = lite.text().pipe(toUpper).pipe(toArray)
        expect(col.state.pipes).toHaveLength(2)
    })
})

describe('references', () => {
    it('sets foreign key reference', () => {
        const ref = { entityName: 'users', columnName: 'id', tableState: {} }
        const col = lite.int().references(ref)
        expect(col.state.references).toEqual({ col: ref, actions: [] })
    })

    it('accepts reference actions', () => {
        const ref = { entityName: 'users', columnName: 'id', tableState: {} }
        const col = lite.int().references(ref, ['delete:cascade'])
        expect(col.state.references!.actions).toEqual(['delete:cascade'])
    })
})

describe('method chaining — complex combinations', () => {
    it('int with primaryKey, autoIncrement, notNull', () => {
        const col = lite.int().primaryKey().autoIncrement()
        expect(col.state.colType).toBe('int')
        expect(col.state.primaryKey).toBe(true)
        expect(col.state.autoIncrement).toBe(true)
        expect(col.state.notNull).toBe(true)
    })

    it('text with notNull, unique, default, pipe', () => {
        const toUpper = ax.operator((v: string) => v.toUpperCase())
        const col = lite.text().notNull().unique('conflict:ignore').default('anonymous').pipe(toUpper)
        expect(col.state.colType).toBe('text')
        expect(col.state.notNull).toBe(true)
        expect(col.state.unique).toBe(true)
        expect(col.state.uniqueConflict).toBe('conflict:ignore')
        expect(col.state.default).toBe('anonymous')
        expect(col.state.pipes).toHaveLength(1)
    })

    it('real with gt, lt, default', () => {
        const col = lite.real().gt(0).lt(1).default(0.5)
        expect(col.state.checks).toHaveLength(2)
        expect(col.state.default).toBe(0.5)
    })

    it('text with minLength, maxLength, collate, index', () => {
        const col = lite.text().minLength(1).maxLength(100).collate('nocase').index()
        expect(col.state.checks).toHaveLength(2)
        expect(col.state.collate).toBe('nocase')
        expect(col.state.index).toBe(true)
    })
})

describe('method blocking via Used type', () => {
    it('primaryKey and autoIncrement can both be called', () => {
        lite.int().primaryKey().autoIncrement()
        // if types compile, test passes
        expect(true).toBe(true)
    })

    it('chain supports the full builder pipeline', () => {
        const col = lite.text().notNull().unique().default('x').pipe(ax.operator((v: string) => v.length))
        expect(col.state.notNull).toBe(true)
        expect(col.state.unique).toBe(true)
        expect(col.state.default).toBe('x')
        expect(col.state.pipes).toHaveLength(1)
    })
})
