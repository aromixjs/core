import { describe, it, expect } from 'vitest'
import { ax, ValidationError } from '@aromix/validator'
import { lite, SqliteEntity } from '../src'

const db = {
    async query(sql: string) {
        return sql
    },
}

function makeEntity<C extends Record<string, any>>(columns: C, options?: (ctx: any) => void) {
    return SqliteEntity<C>({
        name: 't',
        adapter: db,
        columns,
        options: options ?? (() => {}),
    })
}

describe('entity schema — int', () => {
    it('converts int to number schema', () => {
        const s = makeEntity({ val: lite.int().notNull() }).toSelectSchema()
        expect(s.parse({ val: 42 }).val).toBe(42)
        expect(s.parse({ val: 0 }).val).toBe(0)
        expect(s.parse({ val: -10 }).val).toBe(-10)
    })

    it('nullable int accepts null', () => {
        const s = makeEntity({ val: lite.int() }).toSelectSchema()
        expect(s.parse({ val: null }).val).toBe(null)
    })

    it('notNull int rejects null', () => {
        const s = makeEntity({ val: lite.int().notNull() }).toSelectSchema()
        expect(() => s.parse({ val: null })).toThrow(ValidationError)
    })

    it('primaryKey int rejects null', () => {
        const s = makeEntity({ val: lite.int().primaryKey() }).toSelectSchema()
        expect(() => s.parse({ val: null })).toThrow(ValidationError)
    })

    it('rejects non-numbers', () => {
        const s = makeEntity({ val: lite.int() }).toSelectSchema()
        for (const val of ['x', true, {}, []] as const) {
            expect(() => s.parse({ val })).toThrow(ValidationError)
        }
    })
})

describe('entity schema — real', () => {
    it('converts real to number schema', () => {
        const s = makeEntity({ val: lite.real().notNull() }).toSelectSchema()
        expect(s.parse({ val: 3.14 }).val).toBe(3.14)
        expect(s.parse({ val: -0.5 }).val).toBe(-0.5)
        expect(s.parse({ val: Infinity }).val).toBe(Infinity)
    })

    it('nullable real accepts null', () => {
        expect(makeEntity({ val: lite.real() }).toSelectSchema().parse({ val: null }).val).toBe(null)
    })

    it('notNull real rejects null', () => {
        expect(() => makeEntity({ val: lite.real().notNull() }).toSelectSchema().parse({ val: null })).toThrow(ValidationError)
    })
})

describe('entity schema — text', () => {
    it('converts text to string schema', () => {
        const s = makeEntity({ val: lite.text().notNull() }).toSelectSchema()
        expect(s.parse({ val: 'hello' }).val).toBe('hello')
        expect(s.parse({ val: '' }).val).toBe('')
    })

    it('nullable text accepts null', () => {
        expect(makeEntity({ val: lite.text() }).toSelectSchema().parse({ val: null }).val).toBe(null)
    })

    it('notNull text rejects null', () => {
        expect(() => makeEntity({ val: lite.text().notNull() }).toSelectSchema().parse({ val: null })).toThrow(ValidationError)
    })

    it('rejects non-strings', () => {
        const s = makeEntity({ val: lite.text() }).toSelectSchema()
        for (const val of [42, true, {}, []] as const) {
            expect(() => s.parse({ val })).toThrow(ValidationError)
        }
    })
})

describe('entity schema — blob', () => {
    it('converts blob to Uint8Array schema', () => {
        const s = makeEntity({ val: lite.blob().notNull() }).toSelectSchema()
        const buf = new Uint8Array([1, 2, 3])
        expect(s.parse({ val: buf }).val).toBe(buf)
    })

    it('nullable blob accepts null', () => {
        expect(makeEntity({ val: lite.blob() }).toSelectSchema().parse({ val: null }).val).toBe(null)
    })

    it('notNull blob rejects null', () => {
        expect(() => makeEntity({ val: lite.blob().notNull() }).toSelectSchema().parse({ val: null })).toThrow(ValidationError)
    })

    it('rejects non-Uint8Array', () => {
        const s = makeEntity({ val: lite.blob() }).toSelectSchema()
        for (const val of [42, 'str', true, {}, []] as const) {
            expect(() => s.parse({ val })).toThrow(ValidationError)
        }
    })
})

describe('entity schema — check constraints', () => {
    it('gt rejects values <= threshold', () => {
        const s = makeEntity({ val: lite.int().notNull().gt(0) }).toSelectSchema()
        expect(s.parse({ val: 1 }).val).toBe(1)
        expect(s.parse({ val: 100 }).val).toBe(100)
        expect(() => s.parse({ val: 0 })).toThrow(ValidationError)
        expect(() => s.parse({ val: -1 })).toThrow(ValidationError)
    })

    it('gte rejects values < threshold', () => {
        const s = makeEntity({ val: lite.int().notNull().gte(18) }).toSelectSchema()
        expect(s.parse({ val: 18 }).val).toBe(18)
        expect(s.parse({ val: 21 }).val).toBe(21)
        expect(() => s.parse({ val: 17 })).toThrow(ValidationError)
    })

    it('lt rejects values >= threshold', () => {
        const s = makeEntity({ val: lite.int().notNull().lt(100) }).toSelectSchema()
        expect(s.parse({ val: 99 }).val).toBe(99)
        expect(s.parse({ val: 0 }).val).toBe(0)
        expect(() => s.parse({ val: 100 })).toThrow(ValidationError)
        expect(() => s.parse({ val: 101 })).toThrow(ValidationError)
    })

    it('lte rejects values > threshold', () => {
        const s = makeEntity({ val: lite.int().notNull().lte(200) }).toSelectSchema()
        expect(s.parse({ val: 200 }).val).toBe(200)
        expect(s.parse({ val: 0 }).val).toBe(0)
        expect(() => s.parse({ val: 201 })).toThrow(ValidationError)
    })

    it('multiple checks compose — range validation', () => {
        const s = makeEntity({ val: lite.int().notNull().gt(0).lt(100) }).toSelectSchema()
        expect(s.parse({ val: 50 }).val).toBe(50)
        expect(() => s.parse({ val: 0 })).toThrow(ValidationError)
        expect(() => s.parse({ val: 100 })).toThrow(ValidationError)
    })

    it('minLength on text', () => {
        const s = makeEntity({ val: lite.text().notNull().minLength(3) }).toSelectSchema()
        expect(s.parse({ val: 'abc' }).val).toBe('abc')
        expect(() => s.parse({ val: 'ab' })).toThrow(ValidationError)
    })

    it('maxLength on text', () => {
        const s = makeEntity({ val: lite.text().notNull().maxLength(5) }).toSelectSchema()
        expect(s.parse({ val: 'hello' }).val).toBe('hello')
        expect(() => s.parse({ val: 'hello!' })).toThrow(ValidationError)
    })
})

describe('entity insert schema — defaults', () => {
    it('static default is used when value omitted in insert', () => {
        const s = makeEntity({ val: lite.int().notNull().default(42) }).toInsertSchema()
        expect(s.parse({}).val).toBe(42)
    })

    it('default is not used when value is explicitly provided', () => {
        const s = makeEntity({ val: lite.int().notNull().default(42) }).toInsertSchema()
        expect(s.parse({ val: 99 }).val).toBe(99)
    })

    it('defaultFn provides lazy default on insert', () => {
        let counter = 0
        const s = makeEntity({
            val: lite
                .int()
                .notNull()
                .defaultFn(() => ++counter),
        }).toInsertSchema()
        expect(s.parse({}).val).toBe(1)
        expect(s.parse({}).val).toBe(2)
    })

    it('default on nullable column still uses default on insert', () => {
        const s = makeEntity({ val: lite.int().default(0) }).toInsertSchema()
        expect(s.parse({}).val).toBe(0)
        expect(s.parse({ val: null }).val).toBe(null)
    })

    it('safeParse works with defaults on insert schema', () => {
        const s = makeEntity({ val: lite.text().notNull().default('anon') }).toInsertSchema()
        const r = s.safeParse({})
        expect(r.success).toBe(true)
        if (r.success) expect(r.data.val).toBe('anon')
    })
})

describe('entity schema — select schema behavior', () => {
    it('select schema applies defaults when value is undefined', () => {
        const s = makeEntity({ val: lite.int().notNull().default(42) }).toSelectSchema()
        expect(s.parse({ val: undefined }).val).toBe(42)
    })

    it('select schema rejects missing required columns', () => {
        const s = makeEntity({ val: lite.int().notNull() }).toSelectSchema()
        expect(() => s.parse({})).toThrow(ValidationError)
    })
})

describe('entity schema — pipes (transformations)', () => {
    const toArray = ax.operator((v: string) => v.split(',').map((s) => s.trim()))

    it('pipe transforms output in select schema', () => {
        const s = makeEntity({ val: lite.text().notNull().pipe(toArray) }).toSelectSchema()
        expect(s.parse({ val: 'a,b,c' }).val).toEqual(['a', 'b', 'c'])
    })

    it('pipe with check constraint — runs check before transform', () => {
        const toUpper = ax.operator((v: string) => v.toUpperCase())
        const s = makeEntity({ val: lite.text().notNull().minLength(3).pipe(toUpper) }).toSelectSchema()
        expect(s.parse({ val: 'hello' }).val).toBe('HELLO')
        expect(() => s.parse({ val: 'ab' })).toThrow(ValidationError)
    })

    it('pipe with default — default runs through pipe on insert', () => {
        const toUpper = ax.operator((v: string) => v.toUpperCase())
        const s = makeEntity({ val: lite.text().notNull().default('anon').pipe(toUpper) }).toInsertSchema()
        expect(s.parse({}).val).toBe('ANON')
    })

    it('nullable column with pipe still accepts null', () => {
        const toUpper = ax.operator((v: string) => v.toUpperCase())
        const s = makeEntity({ val: lite.text().pipe(toUpper) }).toSelectSchema()
        expect(s.parse({ val: null }).val).toBe(null)
    })
})

describe('entity schema — edge cases', () => {
    it('safeParse never throws', () => {
        const s = makeEntity({ val: lite.int().notNull().gt(0) }).toSelectSchema()
        expect(() => s.safeParse({ val: 'bad' })).not.toThrow()
        expect(() => s.safeParse({ val: null })).not.toThrow()
        expect(() => s.safeParse({})).not.toThrow()
    })

    it('safeParse returns success with correct data', () => {
        const s = makeEntity({ val: lite.text().notNull() }).toSelectSchema()
        const r = s.safeParse({ val: 'ok' })
        expect(r.success).toBe(true)
        if (r.success) expect(r.data.val).toBe('ok')
    })

    it('safeParse returns failure with errors', () => {
        const s = makeEntity({ val: lite.text().notNull() }).toSelectSchema()
        const r = s.safeParse({ val: 42 })
        expect(r.success).toBe(false)
        if (!r.success) expect(r.errors[0]).toContain('string')
    })

    it('nullable column rejects undefined in select schema', () => {
        const s = makeEntity({ val: lite.int() }).toSelectSchema()
        expect(() => s.parse({ val: undefined })).toThrow(ValidationError)
    })
})
