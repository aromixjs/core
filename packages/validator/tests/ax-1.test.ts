import { describe, it, expect } from 'vitest'
import { ValidationError, ax } from "./../src/index";
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

describe('ax.string', () => {
  it('passes a string', () => pass(ax.string(), 'hello'))
  it('passes empty string', () => pass(ax.string(), ''))
  it('fails number',  () => fail(ax.string(), 42))
  it('fails boolean', () => fail(ax.string(), true))
  it('fails null',    () => fail(ax.string(), null))
  it('fails undefined', () => fail(ax.string(), undefined))
  it('returns the value', () => expect(ax.string().parse('hi')).toBe('hi'))
  it('issue has correct message', () => {
    expect(issues(ax.string(), 42)[0].message).toBe('Expected string, got number')
  })
  it('issue has received value', () => {
    expect(issues(ax.string(), 42)[0].received).toBe(42)
  })
})

// --- number ---

describe('ax.number', () => {
  it('passes integer',  () => pass(ax.number(), 42))
  it('passes float',    () => pass(ax.number(), 3.14))
  it('passes negative', () => pass(ax.number(), -1))
  it('passes zero',     () => pass(ax.number(), 0))
  it('fails NaN',       () => fail(ax.number(), NaN))
  it('fails string',    () => fail(ax.number(), '42'))
  it('fails null',      () => fail(ax.number(), null))
  it('returns the value', () => expect(ax.number().parse(7)).toBe(7))
})

// --- boolean ---

describe('ax.boolean', () => {
  it('passes true',  () => pass(ax.boolean(), true))
  it('passes false', () => pass(ax.boolean(), false))
  it('fails 0',      () => fail(ax.boolean(), 0))
  it('fails 1',      () => fail(ax.boolean(), 1))
  it('fails string', () => fail(ax.boolean(), 'true'))
})

// --- bigint ---

describe('ax.bigint', () => {
  it('passes bigint', () => pass(ax.bigint(), 1n))
  it('fails number',  () => fail(ax.bigint(), 1))
  it('fails string',  () => fail(ax.bigint(), '1'))
})

// --- symbol ---

describe('ax.symbol', () => {
  it('passes symbol', () => pass(ax.symbol(), Symbol('x')))
  it('fails string',  () => fail(ax.symbol(), 'x'))
})

// --- null ---

describe('ax.null', () => {
  it('passes null',      () => pass(ax.null(), null))
  it('fails undefined',  () => fail(ax.null(), undefined))
  it('fails string',     () => fail(ax.null(), 'null'))
})

// --- undefined ---

describe('ax.undefined', () => {
  it('passes undefined', () => pass(ax.undefined(), undefined))
  it('fails null',       () => fail(ax.undefined(), null))
  it('fails string',     () => fail(ax.undefined(), 'undefined'))
})

// --- unknown ---

describe('ax.unknown', () => {
  it('passes string',    () => pass(ax.unknown(), 'anything'))
  it('passes number',    () => pass(ax.unknown(), 42))
  it('passes null',      () => pass(ax.unknown(), null))
  it('passes undefined', () => pass(ax.unknown(), undefined))
  it('passes object',    () => pass(ax.unknown(), {}))
})

// --- never ---

describe('ax.never', () => {
  it('fails string',    () => fail(ax.never(), 'x'))
  it('fails number',    () => fail(ax.never(), 0))
  it('fails null',      () => fail(ax.never(), null))
  it('fails undefined', () => fail(ax.never(), undefined))
})

// --- union (replaces optional/nullable) ---

describe('ax.union with undefined', () => {
  it('passes undefined',    () => pass(ax.union([ax.string(), ax.undefined()]), undefined))
  it('still passes string', () => pass(ax.union([ax.string(), ax.undefined()]), 'hello'))
  it('still fails number',  () => fail(ax.union([ax.string(), ax.undefined()]), 42))
  it('still fails null',    () => fail(ax.union([ax.string(), ax.undefined()]), null))
  it('infers string | undefined', () => {
    const schema = ax.union([ax.string(), ax.undefined()])
    const val: typeof schema.$infer = undefined
    expect(val).toBeUndefined()
  })
})

describe('ax.union with null', () => {
  it('passes null',         () => pass(ax.union([ax.string(), ax.null()]), null))
  it('still passes string', () => pass(ax.union([ax.string(), ax.null()]), 'hello'))
  it('still fails number',  () => fail(ax.union([ax.string(), ax.null()]), 42))
  it('still fails undefined', () => fail(ax.union([ax.string(), ax.null()]), undefined))
  it('infers string | null', () => {
    const schema = ax.union([ax.string(), ax.null()])
    const val: typeof schema.$infer = null
    expect(val).toBeNull()
  })
})

// --- ValidationError ---

describe('ValidationError', () => {
  it('is instance of Error', () => {
    try { ax.string().parse(1) } catch (e) {
      expect(e).toBeInstanceOf(Error)
      expect(e).toBeInstanceOf(ValidationError)
    }
  })
  it('has issues array', () => {
    try { ax.string().parse(1) } catch (e) {
      if (e instanceof ValidationError) expect(e.issues).toHaveLength(1)
    }
  })
})

// --- meta ---

describe('.meta()', () => {
  it('returns correct type',     () => expect(ax.string().meta().type).toBe('string'))
  it('meta is a deep clone',    () => {
    const schema = ax.string()
    const m = schema.meta()
    ;(m as any).type = 'number'
    expect(schema.meta().type).toBe('string')
  })
})