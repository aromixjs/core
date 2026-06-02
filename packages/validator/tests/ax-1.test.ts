import { describe, it, expect } from 'vitest'
import { ValidationError, av } from "./../src/index";
// helpers
const pass = (schema: any, value: unknown) =>
  expect(() => schema.parse(value)).not.toThrow()

const fail = (schema: any, value: unknown) =>
  expect(() => schema.parse(value)).toThrow(ValidationError)

const issues = (schema: any, value: unknown) => {
  try { schema.parse(value) } catch (e) {
    if (e instanceof ValidationError) return e.issues
  }
  return []
}

// --- string ---

describe('av.string', () => {
  it('passes a string', () => pass(av.string(), 'hello'))
  it('passes empty string', () => pass(av.string(), ''))
  it('fails number',  () => fail(av.string(), 42))
  it('fails boolean', () => fail(av.string(), true))
  it('fails null',    () => fail(av.string(), null))
  it('fails undefined', () => fail(av.string(), undefined))
  it('returns the value', () => expect(av.string().parse('hi')).toBe('hi'))
  it('issue has correct message', () => {
    expect(issues(av.string(), 42)[0].message).toBe('Expected string, got number')
  })
  it('issue has received value', () => {
    expect(issues(av.string(), 42)[0].received).toBe(42)
  })
})

// --- number ---

describe('av.number', () => {
  it('passes integer',  () => pass(av.number(), 42))
  it('passes float',    () => pass(av.number(), 3.14))
  it('passes negative', () => pass(av.number(), -1))
  it('passes zero',     () => pass(av.number(), 0))
  it('fails NaN',       () => fail(av.number(), NaN))
  it('fails string',    () => fail(av.number(), '42'))
  it('fails null',      () => fail(av.number(), null))
  it('returns the value', () => expect(av.number().parse(7)).toBe(7))
})

// --- boolean ---

describe('av.boolean', () => {
  it('passes true',  () => pass(av.boolean(), true))
  it('passes false', () => pass(av.boolean(), false))
  it('fails 0',      () => fail(av.boolean(), 0))
  it('fails 1',      () => fail(av.boolean(), 1))
  it('fails string', () => fail(av.boolean(), 'true'))
})

// --- bigint ---

describe('av.bigint', () => {
  it('passes bigint', () => pass(av.bigint(), 1n))
  it('fails number',  () => fail(av.bigint(), 1))
  it('fails string',  () => fail(av.bigint(), '1'))
})

// --- symbol ---

describe('av.symbol', () => {
  it('passes symbol', () => pass(av.symbol(), Symbol('x')))
  it('fails string',  () => fail(av.symbol(), 'x'))
})

// --- null ---

describe('av.null', () => {
  it('passes null',      () => pass(av.null(), null))
  it('fails undefined',  () => fail(av.null(), undefined))
  it('fails string',     () => fail(av.null(), 'null'))
})

// --- undefined ---

describe('av.undefined', () => {
  it('passes undefined', () => pass(av.undefined(), undefined))
  it('fails null',       () => fail(av.undefined(), null))
  it('fails string',     () => fail(av.undefined(), 'undefined'))
})

// --- unknown ---

describe('av.unknown', () => {
  it('passes string',    () => pass(av.unknown(), 'anything'))
  it('passes number',    () => pass(av.unknown(), 42))
  it('passes null',      () => pass(av.unknown(), null))
  it('passes undefined', () => pass(av.unknown(), undefined))
  it('passes object',    () => pass(av.unknown(), {}))
})

// --- never ---

describe('av.never', () => {
  it('fails string',    () => fail(av.never(), 'x'))
  it('fails number',    () => fail(av.never(), 0))
  it('fails null',      () => fail(av.never(), null))
  it('fails undefined', () => fail(av.never(), undefined))
})

// --- union (replaces optional/nullable) ---

describe('av.union with undefined', () => {
  it('passes undefined',    () => pass(av.union([av.string(), av.undefined()]), undefined))
  it('still passes string', () => pass(av.union([av.string(), av.undefined()]), 'hello'))
  it('still fails number',  () => fail(av.union([av.string(), av.undefined()]), 42))
  it('still fails null',    () => fail(av.union([av.string(), av.undefined()]), null))
  it('infers string | undefined', () => {
    const schema = av.union([av.string(), av.undefined()])
    const val: typeof schema.$infer = undefined
    expect(val).toBeUndefined()
  })
})

describe('av.union with null', () => {
  it('passes null',         () => pass(av.union([av.string(), av.null()]), null))
  it('still passes string', () => pass(av.union([av.string(), av.null()]), 'hello'))
  it('still fails number',  () => fail(av.union([av.string(), av.null()]), 42))
  it('still fails undefined', () => fail(av.union([av.string(), av.null()]), undefined))
  it('infers string | null', () => {
    const schema = av.union([av.string(), av.null()])
    const val: typeof schema.$infer = null
    expect(val).toBeNull()
  })
})

// --- ValidationError ---

describe('ValidationError', () => {
  it('is instance of Error', () => {
    try { av.string().parse(1) } catch (e) {
      expect(e).toBeInstanceOf(Error)
      expect(e).toBeInstanceOf(ValidationError)
    }
  })
  it('has issues array', () => {
    try { av.string().parse(1) } catch (e) {
      if (e instanceof ValidationError) expect(e.issues).toHaveLength(1)
    }
  })
})

// --- meta ---

describe('.meta()', () => {
  it('returns correct type',     () => expect(av.string().meta().type).toBe('string'))
  it('meta is a deep clone',    () => {
    const schema = av.string()
    const m = schema.meta()
    ;(m as any).type = 'number'
    expect(schema.meta().type).toBe('string')
  })
})