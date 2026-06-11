import { describe, it, expect, expectTypeOf } from 'vitest'
import { ax, ValidationError } from '@aromix/validator'
import { lite, liteToAx } from '../src'

describe('liteToAx — int', () => {
    it('converts int to number schema', () => {
        const s = liteToAx(lite.int())
        expect(s.parse(42)).toBe(42)
        expect(s.parse(0)).toBe(0)
        expect(s.parse(-10)).toBe(-10)
    })

    it('nullable int accepts null', () => {
        const s = liteToAx(lite.int())
        expect(s.parse(null)).toBe(null)
    })

    it('notNull int rejects null', () => {
        const s = liteToAx(lite.int().notNull())
        expect(() => s.parse(null)).toThrow(ValidationError)
    })

    it('primaryKey int rejects null', () => {
        const s = liteToAx(lite.int().primaryKey())
        expect(() => s.parse(null)).toThrow(ValidationError)
    })

    it('rejects non-numbers', () => {
        const s = liteToAx(lite.int())
        for (const val of ['x', true, {}, []] as const) {
            expect(() => s.parse(val)).toThrow(ValidationError)
        }
    })

    it('type inference: notNull int → number', () => {
        const s = liteToAx(lite.int().notNull())
        type T = typeof s.$infer
        expectTypeOf<T>().toEqualTypeOf<number>()
    })

    it('type inference: nullable int → number | null', () => {
        const s = liteToAx(lite.int())
        type T = typeof s.$infer
        expectTypeOf<T>().toEqualTypeOf<number | null>()
    })

    it('type inference: primaryKey int → number (not null)', () => {
        const s = liteToAx(lite.int().primaryKey())
        type T = typeof s.$infer
        expectTypeOf<T>().toEqualTypeOf<number>()
    })
})

describe('liteToAx — real', () => {
    it('converts real to number schema', () => {
        const s = liteToAx(lite.real())
        expect(s.parse(3.14)).toBe(3.14)
        expect(s.parse(-0.5)).toBe(-0.5)
        expect(s.parse(Infinity)).toBe(Infinity)
    })

    it('nullable real accepts null', () => {
        expect(liteToAx(lite.real()).parse(null)).toBe(null)
    })

    it('notNull real rejects null', () => {
        expect(() => liteToAx(lite.real().notNull()).parse(null)).toThrow(ValidationError)
    })

    it('type inference: real → number | null', () => {
        const s = liteToAx(lite.real())
        type T = typeof s.$infer
        expectTypeOf<T>().toEqualTypeOf<number | null>()
    })

    it('type inference: real notNull → number', () => {
        const s = liteToAx(lite.real().notNull())
        type T = typeof s.$infer
        expectTypeOf<T>().toEqualTypeOf<number>()
    })
})

describe('liteToAx — text', () => {
    it('converts text to string schema', () => {
        const s = liteToAx(lite.text())
        expect(s.parse('hello')).toBe('hello')
        expect(s.parse('')).toBe('')
    })

    it('nullable text accepts null', () => {
        expect(liteToAx(lite.text()).parse(null)).toBe(null)
    })

    it('notNull text rejects null', () => {
        expect(() => liteToAx(lite.text().notNull()).parse(null)).toThrow(ValidationError)
    })

    it('rejects non-strings', () => {
        const s = liteToAx(lite.text())
        for (const val of [42, true, {}, []] as const) {
            expect(() => s.parse(val)).toThrow(ValidationError)
        }
    })

    it('type inference: text notNull → string', () => {
        const s = liteToAx(lite.text().notNull())
        type T = typeof s.$infer
        expectTypeOf<T>().toEqualTypeOf<string>()
    })

    it('type inference: text → string | null', () => {
        const s = liteToAx(lite.text())
        type T = typeof s.$infer
        expectTypeOf<T>().toEqualTypeOf<string | null>()
    })
})

describe('liteToAx — blob', () => {
    it('converts blob to Uint8Array schema', () => {
        const s = liteToAx(lite.blob())
        const buf = new Uint8Array([1, 2, 3])
        expect(s.parse(buf)).toBe(buf)
    })

    it('nullable blob accepts null', () => {
        expect(liteToAx(lite.blob()).parse(null)).toBe(null)
    })

    it('notNull blob rejects null', () => {
        expect(() => liteToAx(lite.blob().notNull()).parse(null)).toThrow(ValidationError)
    })

    it('rejects non-Uint8Array', () => {
        const s = liteToAx(lite.blob())
        for (const val of [42, 'str', true, {}, []] as const) {
            expect(() => s.parse(val)).toThrow(ValidationError)
        }
    })

    it('type inference: blob notNull → Uint8Array', () => {
        const s = liteToAx(lite.blob().notNull())
        type T = typeof s.$infer
        expectTypeOf<T>().toEqualTypeOf<Uint8Array>()
    })

    it('type inference: blob → Uint8Array | null', () => {
        const s = liteToAx(lite.blob())
        type T = typeof s.$infer
        expectTypeOf<T>().toEqualTypeOf<Uint8Array | null>()
    })
})

describe('liteToAx — check constraints', () => {
    it('gt rejects values <= threshold', () => {
        const s = liteToAx(lite.int().gt(0))
        expect(s.parse(1)).toBe(1)
        expect(s.parse(100)).toBe(100)
        expect(() => s.parse(0)).toThrow(ValidationError)
        expect(() => s.parse(-1)).toThrow(ValidationError)
    })

    it('gte rejects values < threshold', () => {
        const s = liteToAx(lite.int().gte(18))
        expect(s.parse(18)).toBe(18)
        expect(s.parse(21)).toBe(21)
        expect(() => s.parse(17)).toThrow(ValidationError)
    })

    it('lt rejects values >= threshold', () => {
        const s = liteToAx(lite.int().lt(100))
        expect(s.parse(99)).toBe(99)
        expect(s.parse(0)).toBe(0)
        expect(() => s.parse(100)).toThrow(ValidationError)
        expect(() => s.parse(101)).toThrow(ValidationError)
    })

    it('lte rejects values > threshold', () => {
        const s = liteToAx(lite.int().lte(200))
        expect(s.parse(200)).toBe(200)
        expect(s.parse(0)).toBe(0)
        expect(() => s.parse(201)).toThrow(ValidationError)
    })

    it('multiple checks compose — range validation', () => {
        const s = liteToAx(lite.int().gt(0).lt(100))
        expect(s.parse(50)).toBe(50)
        expect(() => s.parse(0)).toThrow(ValidationError)
        expect(() => s.parse(100)).toThrow(ValidationError)
    })

    it('minLength on text', () => {
        const s = liteToAx(lite.text().notNull().minLength(3))
        expect(s.parse('abc')).toBe('abc')
        expect(() => s.parse('ab')).toThrow(ValidationError)
    })

    it('maxLength on text', () => {
        const s = liteToAx(lite.text().notNull().maxLength(5))
        expect(s.parse('hello')).toBe('hello')
        expect(() => s.parse('hello!')).toThrow(ValidationError)
    })
})

describe('liteToAx — defaults', () => {
    it('static default is used when input is undefined', () => {
        const s = liteToAx(lite.int().notNull().default(42))
        expect(s.parse(undefined)).toBe(42)
    })

    it('default is not used when value is explicitly provided', () => {
        const s = liteToAx(lite.int().notNull().default(42))
        expect(s.parse(99)).toBe(99)
    })

    it('defaultFn provides lazy default', () => {
        let counter = 0
        const s = liteToAx(
            lite
                .int()
                .notNull()
                .defaultFn(() => ++counter),
        )
        expect(s.parse(undefined)).toBe(1)
        expect(s.parse(undefined)).toBe(2)
    })

    it('default on nullable column still uses default', () => {
        const s = liteToAx(lite.int().default(0))
        expect(s.parse(undefined)).toBe(0)
        expect(s.parse(null)).toBe(null)
    })

    it('safeParse works with defaults', () => {
        const s = liteToAx(lite.text().notNull().default('anon'))
        const r = s.safeParse(undefined)
        expect(r.success).toBe(true)
        if (r.success) expect(r.data).toBe('anon')
    })
})

describe('liteToAx — pipes (transformations)', () => {
    const toUpper = ax.operator((v: string) => v.toUpperCase())
    const toArray = ax.operator((v: string) => v.split(',').map((s) => s.trim()))

    it('pipe transforms output', () => {
        const s = liteToAx(lite.text().notNull().pipe(toUpper))
        expect(s.parse('hello')).toBe('HELLO')
    })

    it('pipe changes type (string → string[])', () => {
        const s = liteToAx(lite.text().notNull().pipe(toArray))
        expect(s.parse('a,b,c')).toEqual(['a', 'b', 'c'])
        type T = typeof s.$infer
        expectTypeOf<T>().toEqualTypeOf<string[]>()
    })

    it('multiple pipes compose left to right', () => {
        const s = liteToAx(lite.text().notNull().pipe(toUpper).pipe(toArray))
        expect(s.parse('a,b')).toEqual(['A', 'B'])
    })

    it('pipe with check constraint — runs check before transform', () => {
        const s = liteToAx(lite.text().notNull().minLength(3).pipe(toUpper))
        expect(s.parse('hello')).toBe('HELLO')
        expect(() => s.parse('ab')).toThrow(ValidationError)
    })

    it('pipe with default — default runs through pipe', () => {
        const s = liteToAx(lite.text().notNull().default('anon').pipe(toUpper))
        expect(s.parse(undefined)).toBe('ANON')
    })

    it('nullable column with pipe still accepts null', () => {
        const s = liteToAx(lite.text().pipe(toUpper))
        expect(s.parse(null)).toBe(null)
    })
})

describe('liteToAx — edge cases', () => {
    it('safeParse never throws', () => {
        const s = liteToAx(lite.int().notNull().gt(0))
        expect(() => s.safeParse('bad')).not.toThrow()
        expect(() => s.safeParse(null)).not.toThrow()
        expect(() => s.safeParse(undefined)).not.toThrow()
    })

    it('safeParse returns success with correct data', () => {
        const s = liteToAx(lite.text().notNull())
        const r = s.safeParse('ok')
        expect(r.success).toBe(true)
        if (r.success) expect(r.data).toBe('ok')
    })

    it('safeParse returns failure with errors', () => {
        const s = liteToAx(lite.text().notNull())
        const r = s.safeParse(42)
        expect(r.success).toBe(false)
        if (!r.success) expect(r.errors[0]).toContain('string')
    })

    it('union(null) schema correctly rejects undefined for nullable column', () => {
        const s = liteToAx(lite.int())
        expect(() => s.parse(undefined)).toThrow(ValidationError)
    })
})
