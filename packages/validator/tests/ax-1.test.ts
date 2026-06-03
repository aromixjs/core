import { describe, it, expect } from 'vitest'
import { ValidationError, ax } from "./../src/index";

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

// --- string (coerces via String()) ---

describe('ax.string', () => {
  it('passes a string', () => pass(ax.string(), 'hello'))
  it('passes empty string', () => pass(ax.string(), ''))
  it('coerces number to string', () => expect(ax.string().parse(42)).toBe('42'))
  it('coerces boolean to string', () => expect(ax.string().parse(true)).toBe('true'))
  it('coerces null to string', () => expect(ax.string().parse(null)).toBe('null'))
  it('coerces undefined to string', () => expect(ax.string().parse(undefined)).toBe('undefined'))
  it('returns the value', () => expect(ax.string().parse('hi')).toBe('hi'))
})

// --- number (coerces via Number()) ---

describe('ax.number', () => {
  it('passes integer',  () => pass(ax.number(), 42))
  it('passes float',    () => pass(ax.number(), 3.14))
  it('passes negative', () => pass(ax.number(), -1))
  it('passes zero',     () => pass(ax.number(), 0))
  it('fails NaN',       () => fail(ax.number(), NaN))
  it('coerces numeric string', () => expect(ax.number().parse('42')).toBe(42))
  it('fails non-numeric string', () => fail(ax.number(), 'hello'))
  it('coerces null to 0', () => expect(ax.number().parse(null)).toBe(0))
  it('returns the value', () => expect(ax.number().parse(7)).toBe(7))
})

// --- boolean (coerces via Boolean() with smart string matching) ---

describe('ax.boolean', () => {
  it('passes true',  () => pass(ax.boolean(), true))
  it('passes false', () => pass(ax.boolean(), false))
  it('coerces 0 to false', () => expect(ax.boolean().parse(0)).toBe(false))
  it('coerces 1 to true', () => expect(ax.boolean().parse(1)).toBe(true))
  it('coerces "true" to true', () => expect(ax.boolean().parse('true')).toBe(true))
  it('coerces "false" to false', () => expect(ax.boolean().parse('false')).toBe(false))
  it('coerces "1" to true', () => expect(ax.boolean().parse('1')).toBe(true))
  it('coerces "0" to false', () => expect(ax.boolean().parse('0')).toBe(false))
  it('coerces "yes" to true', () => expect(ax.boolean().parse('yes')).toBe(true))
  it('coerces "no" to false', () => expect(ax.boolean().parse('no')).toBe(false))
})

// --- bigint (coerces via BigInt()) ---

describe('ax.bigint', () => {
  it('passes bigint', () => pass(ax.bigint(), 1n))
  it('coerces number to bigint', () => expect(ax.bigint().parse(1)).toBe(1n))
  it('coerces numeric string to bigint', () => expect(ax.bigint().parse('1')).toBe(1n))
  it('fails non-numeric string', () => fail(ax.bigint(), 'hello'))
})

// --- symbol (no coercion) ---

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

// --- date (coerces via new Date()) ---

describe('ax.date', () => {
  it('passes a Date', () => pass(ax.date(), new Date('2024-01-01')))
  it('coerces ISO string to Date', () => {
    const d = ax.date().parse('2024-01-01T00:00:00.000Z')
    expect(d).toBeInstanceOf(Date)
    expect(d.getTime()).toBe(1704067200000)
  })
  it('coerces timestamp to Date', () => {
    const d = ax.date().parse(1704067200000)
    expect(d).toBeInstanceOf(Date)
  })
  it('fails invalid date string', () => fail(ax.date(), 'not-a-date'))
  it('fails NaN timestamp', () => fail(ax.date(), NaN))
})

// --- union ---

describe('ax.union with undefined', () => {
  it('passes undefined',    () => pass(ax.union([ax.string(), ax.undefined()]), undefined))
  it('still passes string', () => pass(ax.union([ax.string(), ax.undefined()]), 'hello'))
  it('coerces number via string branch', () => pass(ax.union([ax.string(), ax.undefined()]), 42))
  it('infers string | undefined', () => {
    const schema = ax.union([ax.string(), ax.undefined()])
    const val: typeof schema.$infer = undefined
    expect(val).toBeUndefined()
  })
})

describe('ax.union with null', () => {
  it('passes null',         () => pass(ax.union([ax.string(), ax.null()]), null))
  it('still passes string', () => pass(ax.union([ax.string(), ax.null()]), 'hello'))
  it('coerces number via string branch', () => pass(ax.union([ax.string(), ax.null()]), 42))
  it('infers string | null', () => {
    const schema = ax.union([ax.string(), ax.null()])
    const val: typeof schema.$infer = null
    expect(val).toBeNull()
  })
})

// --- ValidationError ---

describe('ValidationError', () => {
  it('is instance of Error', () => {
    try { ax.symbol().parse(1) } catch (e) {
      expect(e).toBeInstanceOf(Error)
      expect(e).toBeInstanceOf(ValidationError)
    }
  })
  it('has issues array', () => {
    try { ax.symbol().parse(1) } catch (e) {
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

// --- default ---

describe('.default()', () => {
  it('returns default when value is undefined', () => {
    expect(ax.string().default('fallback').parse(undefined)).toBe('fallback')
  })
  it('passes through defined value', () => {
    expect(ax.string().default('fallback').parse('hello')).toBe('hello')
  })
  it('coerces then validates before default', () => {
    expect(ax.number().default(0).parse('42')).toBe(42)
  })
  it('still validates defined value', () => {
    expect(() => ax.never().default('x' as never).parse('anything')).toThrow(ValidationError)
  })
  it('meta includes default', () => {
    const m = ax.string().default('x').meta()
    expect(m.default).toEqual({ value: 'x' })
  })
})

// --- defaultFn ---

describe('.defaultFn()', () => {
  it('returns lazy default when value is undefined', () => {
    let calls = 0
    const fn = () => { calls++; return 'lazy' }
    expect(ax.string().defaultFn(fn).parse(undefined)).toBe('lazy')
    expect(calls).toBe(1)
  })
  it('calls fresh each time', () => {
    let calls = 0
    const fn = () => { calls++; return `call-${calls}` }
    const s = ax.string().defaultFn(fn)
    expect(s.parse(undefined)).toBe('call-1')
    expect(s.parse(undefined)).toBe('call-2')
  })
  it('passes through defined value', () => {
    const fn = () => 'fallback'
    expect(ax.string().defaultFn(fn).parse('hello')).toBe('hello')
  })
  it('last defaultFn wins', () => {
    const s = ax.string().defaultFn(() => 'first').defaultFn(() => 'second')
    expect(s.parse(undefined)).toBe('second')
  })
  it('defaultFn overrides default', () => {
    const s = ax.string().default('static').defaultFn(() => 'lazy')
    expect(s.parse(undefined)).toBe('lazy')
  })
  it('default overrides defaultFn', () => {
    const s = ax.string().defaultFn(() => 'lazy').default('static')
    expect(s.parse(undefined)).toBe('static')
  })
})