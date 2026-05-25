import { describe, expect, it, expectTypeOf } from 'vitest'
import { Internals } from '../src/utils'

describe('Obj.crushKeys()', () => {
  it('returns top-level keys for a flat object', () => {
    const obj = new Internals.Obj({ a: 1, b: 2, c: 3 })
    const result = obj.crushKeys()
    expect(result.sort()).toEqual(['a', 'b', 'c'].sort())
  })

  it('returns nested dot-joined keys', () => {
    const obj = new Internals.Obj({ a: { b: 1, c: 2 }, d: 3 })
    const result = obj.crushKeys()
    expect(result.sort()).toEqual(['a', 'a.b', 'a.c', 'd'].sort())
  })

  it('handles deeply nested objects', () => {
    const obj = new Internals.Obj({ a: { b: { c: { d: 1 } } } })
    const result = obj.crushKeys()
    expect(result.sort()).toEqual(['a', 'a.b', 'a.b.c', 'a.b.c.d'].sort())
  })

  it('does not recurse into arrays', () => {
    const obj = new Internals.Obj({ a: [1, 2], b: { c: 3 } })
    const result = obj.crushKeys()
    expect(result.sort()).toEqual(['a', 'b', 'b.c'].sort())
  })

  it('handles empty object', () => {
    const obj = new Internals.Obj({})
    const result = obj.crushKeys()
    expect(result).toEqual([])
  })
})

describe('CrushKeys type inference', () => {
  it('infers union of top-level keys', () => {
    type Result = Internals.CrushKeys<{ a: number; b: string }>
    expectTypeOf<Result>().toEqualTypeOf<'a' | 'b'>()
  })

  it('infers nested dot-joined keys', () => {
    type Result = Internals.CrushKeys<{ a: { b: number; c: string }; d: boolean }>
    expectTypeOf<Result>().toEqualTypeOf<'a' | 'a.b' | 'a.c' | 'd'>()
  })

  it('infers deeply nested keys', () => {
    type Result = Internals.CrushKeys<{ a: { b: { c: { d: number } } } }>
    expectTypeOf<Result>().toEqualTypeOf<'a' | 'a.b' | 'a.b.c' | 'a.b.c.d'>()
  })

  it('does not recurse into arrays', () => {
    type Result = Internals.CrushKeys<{ a: number[]; b: { c: string } }>
    expectTypeOf<Result>().toEqualTypeOf<'a' | 'b' | 'b.c'>()
  })

  it('Obj.crushKeys() returns CrushKeys<T>[]', () => {
    const obj = new Internals.Obj({ a: { b: 1 }, c: 2 })
    const result = obj.crushKeys()
    expectTypeOf(result).toEqualTypeOf<('a' | 'a.b' | 'c')[]>()
  })
})
