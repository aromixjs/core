import { describe, it, expect, expectTypeOf } from 'vitest'
import { ax, ValidationError } from '@aromix/validator'
import { lite } from '../src'

// ---------------------------------------------------------------------------
// Column-level type inference
// ---------------------------------------------------------------------------
describe('column type inference — base types', () => {
    it('int maps select→number|null, insert→number|undefined, update→number|undefined', () => {
        const col = lite.int()
        expectTypeOf<typeof col.$type.select>().toEqualTypeOf<number | null>()
        expectTypeOf<typeof col.$type.insert>().toEqualTypeOf<number | undefined>()
        expectTypeOf<typeof col.$type.update>().toEqualTypeOf<number | undefined>()
    })

    it('real maps select→number|null, insert→number|undefined, update→number|undefined', () => {
        const col = lite.real()
        expectTypeOf<typeof col.$type.select>().toEqualTypeOf<number | null>()
        expectTypeOf<typeof col.$type.insert>().toEqualTypeOf<number | undefined>()
        expectTypeOf<typeof col.$type.update>().toEqualTypeOf<number | undefined>()
    })

    it('text maps select→string|null, insert→string|undefined, update→string|undefined', () => {
        const col = lite.text()
        expectTypeOf<typeof col.$type.select>().toEqualTypeOf<string | null>()
        expectTypeOf<typeof col.$type.insert>().toEqualTypeOf<string | undefined>()
        expectTypeOf<typeof col.$type.update>().toEqualTypeOf<string | undefined>()
    })

    it('blob maps select→Uint8Array|null, insert→Uint8Array|undefined, update→Uint8Array|undefined', () => {
        const col = lite.blob()
        expectTypeOf<typeof col.$type.select>().toEqualTypeOf<Uint8Array | null>()
        expectTypeOf<typeof col.$type.insert>().toEqualTypeOf<Uint8Array | undefined>()
        expectTypeOf<typeof col.$type.update>().toEqualTypeOf<Uint8Array | undefined>()
    })
})

describe('column type inference — notNull', () => {
    it('notNull strips null from select, leaves insert/update unchanged', () => {
        const col = lite.int().notNull()
        expectTypeOf<typeof col.$type.select>().toEqualTypeOf<number>()
        expectTypeOf<typeof col.$type.insert>().toEqualTypeOf<number | undefined>()
        expectTypeOf<typeof col.$type.update>().toEqualTypeOf<number | undefined>()
    })

    it('notNull on text strips null from select', () => {
        const col = lite.text().notNull()
        expectTypeOf<typeof col.$type.select>().toEqualTypeOf<string>()
    })

    it('notNull on blob strips null from select', () => {
        const col = lite.blob().notNull()
        expectTypeOf<typeof col.$type.select>().toEqualTypeOf<Uint8Array>()
    })

    it('notNull on real strips null from select', () => {
        const col = lite.real().notNull()
        expectTypeOf<typeof col.$type.select>().toEqualTypeOf<number>()
    })
})

describe('column type inference — primaryKey', () => {
    it('primaryKey strips null from select and makes insert required', () => {
        const col = lite.int().primaryKey()
        expectTypeOf<typeof col.$type.select>().toEqualTypeOf<number>()
        expectTypeOf<typeof col.$type.insert>().toEqualTypeOf<number>()
        expectTypeOf<typeof col.$type.update>().toEqualTypeOf<number | undefined>()
    })

    it('primaryKey on text', () => {
        const col = lite.text().primaryKey()
        expectTypeOf<typeof col.$type.select>().toEqualTypeOf<string>()
        expectTypeOf<typeof col.$type.insert>().toEqualTypeOf<string>()
    })
})

describe('column type inference — autoIncrement', () => {
    it('autoIncrement sets insert to never, preserves select/update', () => {
        const col = lite.int().autoIncrement()
        expectTypeOf<typeof col.$type.select>().toEqualTypeOf<number | null>()
        expectTypeOf<typeof col.$type.insert>().toEqualTypeOf<never>()
        expectTypeOf<typeof col.$type.update>().toEqualTypeOf<number | undefined>()
    })

    it('primaryKey + autoIncrement: select non-null, insert never, update nullable', () => {
        const col = lite.int().primaryKey().autoIncrement()
        expectTypeOf<typeof col.$type.select>().toEqualTypeOf<number>()
        expectTypeOf<typeof col.$type.insert>().toEqualTypeOf<never>()
        expectTypeOf<typeof col.$type.update>().toEqualTypeOf<number | undefined>()
    })

    it('autoIncrement on text primary key', () => {
        const col = lite.text().primaryKey().autoIncrement()
        expectTypeOf<typeof col.$type.select>().toEqualTypeOf<string>()
        expectTypeOf<typeof col.$type.insert>().toEqualTypeOf<never>()
    })
})

describe('column type inference — default', () => {
    it('default makes select non-null, leaves insert/update unchanged', () => {
        const col = lite.int().default(0)
        expectTypeOf<typeof col.$type.select>().toEqualTypeOf<number>()
        expectTypeOf<typeof col.$type.insert>().toEqualTypeOf<number | undefined>()
        expectTypeOf<typeof col.$type.update>().toEqualTypeOf<number | undefined>()
    })

    it('default on text', () => {
        const col = lite.text().default('hello')
        expectTypeOf<typeof col.$type.select>().toEqualTypeOf<string>()
    })

    it('default on real', () => {
        const col = lite.real().default(3.14)
        expectTypeOf<typeof col.$type.select>().toEqualTypeOf<number>()
    })
})

describe('column type inference — defaultFn', () => {
    it('defaultFn makes select non-null, leaves insert/update unchanged', () => {
        const col = lite.int().defaultFn(() => 42)
        expectTypeOf<typeof col.$type.select>().toEqualTypeOf<number>()
        expectTypeOf<typeof col.$type.insert>().toEqualTypeOf<number | undefined>()
        expectTypeOf<typeof col.$type.update>().toEqualTypeOf<number | undefined>()
    })

    it('defaultFn on text', () => {
        const col = lite.text().defaultFn(() => 'anon')
        expectTypeOf<typeof col.$type.select>().toEqualTypeOf<string>()
    })
})

describe('column type inference — refine', () => {
    it('refine maps select type through the refinement function', () => {
        const col = lite.int().refine((v) => Math.abs(v))
        // RefinedOutput = number (since Math.abs returns number)
        expectTypeOf<typeof col.$type.select>().toEqualTypeOf<number>()
        expectTypeOf<typeof col.$type.insert>().toEqualTypeOf<number | undefined>()
        expectTypeOf<typeof col.$type.update>().toEqualTypeOf<number | undefined>()
    })

    it('refine with branded type', () => {
        type UserId = number & { readonly __brand: 'UserId' }
        const col = lite.int().refine((v) => v as UserId)
        expectTypeOf<typeof col.$type.select>().toEqualTypeOf<UserId>()
        expectTypeOf<typeof col.$type.insert>().toEqualTypeOf<UserId | undefined>()
    })

    it('notNull before refine preserves non-nullable select', () => {
        const col = lite
            .int()
            .notNull()
            .refine((v) => Math.abs(v))
        expectTypeOf<typeof col.$type.select>().toEqualTypeOf<number>()
    })

    it('refine on text with string transformation', () => {
        const col = lite.text().refine((v) => v.trim())
        expectTypeOf<typeof col.$type.select>().toEqualTypeOf<string>()
    })
})

describe('column type inference — index / unique / collate (no-op at type level)', () => {
    it('index does not change types', () => {
        const base = lite.int()
        const col = lite.int().index()
        expectTypeOf<typeof col.$type.select>().toEqualTypeOf<typeof base.$type.select>()
        expectTypeOf<typeof col.$type.insert>().toEqualTypeOf<typeof base.$type.insert>()
    })

    it('unique does not change types', () => {
        const base = lite.int()
        const col = lite.int().unique()
        expectTypeOf<typeof col.$type.select>().toEqualTypeOf<typeof base.$type.select>()
    })

    it('collate does not change types', () => {
        const base = lite.text()
        const col = lite.text().collate('nocase')
        expectTypeOf<typeof col.$type.select>().toEqualTypeOf<typeof base.$type.select>()
    })

    it('in does not change types', () => {
        const base = lite.text()
        const col = lite.text().in(['a', 'b'])
        expectTypeOf<typeof col.$type.select>().toEqualTypeOf<typeof base.$type.select>()
    })
})

describe('column type inference — complex chains', () => {
    it('notNull + default: select non-null, insert optional', () => {
        const col = lite.int().notNull().default(0)
        expectTypeOf<typeof col.$type.select>().toEqualTypeOf<number>()
        expectTypeOf<typeof col.$type.insert>().toEqualTypeOf<number | undefined>()
    })

    it('primaryKey + autoIncrement + notNull (redundant)', () => {
        const col = lite.int().notNull().primaryKey().autoIncrement()
        expectTypeOf<typeof col.$type.select>().toEqualTypeOf<number>()
        expectTypeOf<typeof col.$type.insert>().toEqualTypeOf<never>()
    })

    it('text + notNull + unique + default + collate', () => {
        const col = lite.text().notNull().unique('conflict:error').default('x').collate('nocase')
        expectTypeOf<typeof col.$type.select>().toEqualTypeOf<string>()
        expectTypeOf<typeof col.$type.insert>().toEqualTypeOf<string | undefined>()
    })

    it('int + notNull + gt + lt + default', () => {
        const col = lite.int().notNull().gt(0).lt(100).default(50)
        expectTypeOf<typeof col.$type.select>().toEqualTypeOf<number>()
    })

    it('text + notNull + minLength + maxLength + refine', () => {
        const col = lite
            .text()
            .notNull()
            .minLength(1)
            .maxLength(255)
            .refine((v) => v.trim())
        expectTypeOf<typeof col.$type.select>().toEqualTypeOf<string>()
    })
})

// ---------------------------------------------------------------------------
// Table-level type inference ($inferSelect / $inferInsert / $inferUpdate)
// ---------------------------------------------------------------------------
describe('table $inferSelect — type inference', () => {
    it('infers select shape from all column types', () => {
        const table = lite.table({
            columns: {
                id: lite.int().primaryKey().autoIncrement(),
                name: lite.text().notNull(),
                age: lite.int(),
                score: lite.real(),
                bio: lite.text().notNull().default(''),
            },
        })

        type S = typeof table.$inferSelect
        expectTypeOf<S>().toHaveProperty('id')
        expectTypeOf<S['id']>().toEqualTypeOf<number>()
        expectTypeOf<S['name']>().toEqualTypeOf<string>()
        expectTypeOf<S['age']>().toEqualTypeOf<number | null>()
        expectTypeOf<S['score']>().toEqualTypeOf<number | null>()
        expectTypeOf<S['bio']>().toEqualTypeOf<string>()
    })

    it('select shape matches toSelectSchema.$infer type', () => {
        const table = lite.table({
            columns: {
                id: lite.int().primaryKey().autoIncrement(),
                label: lite.text().notNull(),
            },
        })

        const schema = table.toSelectSchema()
        type S1 = typeof table.$inferSelect
        type S2 = typeof schema.$infer
        expectTypeOf<S1>().toEqualTypeOf<S2>()
    })

    it('blob in select', () => {
        const table = lite.table({ columns: { data: lite.blob().notNull() } })
        type S = typeof table.$inferSelect
        expectTypeOf<S['data']>().toEqualTypeOf<Uint8Array>()
    })
})

describe('table $inferInsert — type inference', () => {
    it('autoIncrement columns become never in insert', () => {
        const table = lite.table({
            columns: {
                id: lite.int().primaryKey().autoIncrement(),
                name: lite.text().notNull(),
            },
        })

        type I = typeof table.$inferInsert
        expectTypeOf<I['id']>().toEqualTypeOf<never>()
        expectTypeOf<I['name']>().toEqualTypeOf<string | undefined>()
    })

    it('notNull without default is required (non-undefined) in insert', () => {
        const table = lite.table({
            columns: {
                id: lite.int().primaryKey(),
                name: lite.text().notNull(),
            },
        })

        type I = typeof table.$inferInsert
        // primaryKey makes insert non-nullable and required
        expectTypeOf<I['id']>().toEqualTypeOf<number>()
        // notNull alone keeps insert as number|undefined
        expectTypeOf<I['name']>().toEqualTypeOf<string | undefined>()
    })

    it('nullable columns are undefined-optional in insert', () => {
        const table = lite.table({
            columns: { a: lite.int(), b: lite.text() },
        })

        type I = typeof table.$inferInsert
        expectTypeOf<I['a']>().toEqualTypeOf<number | undefined>()
        expectTypeOf<I['b']>().toEqualTypeOf<string | undefined>()
    })

    it('insert shape matches toInsertSchema.$infer', () => {
        const table = lite.table({
            columns: { id: lite.int().primaryKey().autoIncrement(), name: lite.text().notNull() },
        })

        const schema = table.toInsertSchema()
        type I1 = typeof table.$inferInsert
        type I2 = typeof schema.$infer
        expectTypeOf<I1>().toEqualTypeOf<I2>()
    })
})

describe('table $inferUpdate — type inference', () => {
    it('all columns are optional with undefined in update', () => {
        const table = lite.table({
            columns: {
                id: lite.int().primaryKey().autoIncrement(),
                name: lite.text().notNull(),
                age: lite.int(),
            },
        })

        type U = typeof table.$inferUpdate
        expectTypeOf<U['id']>().toEqualTypeOf<number | undefined>()
        expectTypeOf<U['name']>().toEqualTypeOf<string | undefined>()
        expectTypeOf<U['age']>().toEqualTypeOf<number | undefined | null>()
    })

    it('update shape matches toUpdateSchema.$infer', () => {
        const table = lite.table({
            columns: { id: lite.int().primaryKey(), name: lite.text().notNull() },
        })

        const schema = table.toUpdateSchema()
        type U1 = typeof table.$inferUpdate
        type U2 = typeof schema.$infer
        expectTypeOf<U1>().toEqualTypeOf<U2>()
    })
})

// ---------------------------------------------------------------------------
// Schema runtime — Select
// ---------------------------------------------------------------------------
describe('toSelectSchema → runtime validation', () => {
    it('parses valid int', () => {
        const s = lite.table({ columns: { val: lite.int().notNull() } }).toSelectSchema()
        expect(s.parse({ val: 42 }).val).toBe(42)
        expect(s.parse({ val: 0 }).val).toBe(0)
        expect(s.parse({ val: -1 }).val).toBe(-1)
    })

    it('parses valid real', () => {
        const s = lite.table({ columns: { val: lite.real().notNull() } }).toSelectSchema()
        expect(s.parse({ val: 3.14 }).val).toBe(3.14)
        expect(s.parse({ val: -0.5 }).val).toBe(-0.5)
        expect(s.parse({ val: Infinity }).val).toBe(Infinity)
    })

    it('parses valid text', () => {
        const s = lite.table({ columns: { val: lite.text().notNull() } }).toSelectSchema()
        expect(s.parse({ val: 'hello' }).val).toBe('hello')
        expect(s.parse({ val: '' }).val).toBe('')
    })

    it('parses valid blob (Uint8Array)', () => {
        const s = lite.table({ columns: { val: lite.blob().notNull() } }).toSelectSchema()
        const buf = new Uint8Array([1, 2, 3])
        expect(s.parse({ val: buf }).val).toBe(buf)
    })

    it('rejects wrong type for int', () => {
        const s = lite.table({ columns: { val: lite.int() } }).toSelectSchema()
        for (const val of ['x', true, {}, []] as const) {
            expect(() => s.parse({ val })).toThrow(ValidationError)
        }
    })

    it('rejects wrong type for text', () => {
        const s = lite.table({ columns: { val: lite.text() } }).toSelectSchema()
        for (const val of [42, true, {}, []] as const) {
            expect(() => s.parse({ val })).toThrow(ValidationError)
        }
    })

    it('rejects wrong type for blob', () => {
        const s = lite.table({ columns: { val: lite.blob() } }).toSelectSchema()
        for (const val of [42, 'str', true, {}, []] as const) {
            expect(() => s.parse({ val })).toThrow(ValidationError)
        }
    })

    it('nullable columns accept null', () => {
        const s = lite.table({ columns: { val: lite.int() } }).toSelectSchema()
        expect(s.parse({ val: null }).val).toBe(null)
    })

    it('notNull columns reject null', () => {
        const s = lite.table({ columns: { val: lite.int().notNull() } }).toSelectSchema()
        expect(() => s.parse({ val: null })).toThrow(ValidationError)
    })

    it('primaryKey (implies notNull) rejects null', () => {
        const s = lite.table({ columns: { val: lite.int().primaryKey() } }).toSelectSchema()
        expect(() => s.parse({ val: null })).toThrow(ValidationError)
    })

    it('nullable columns reject undefined', () => {
        const s = lite.table({ columns: { val: lite.int() } }).toSelectSchema()
        expect(() => s.parse({ val: undefined })).toThrow(ValidationError)
    })

    it('default is applied when value is undefined in select', () => {
        const s = lite.table({ columns: { val: lite.int().default(42) } }).toSelectSchema()
        expect(s.parse({ val: undefined }).val).toBe(42)
    })

    it('defaultFn is called when value is undefined in select', () => {
        let counter = 0
        const s = lite.table({ columns: { val: lite.int().defaultFn(() => ++counter) } }).toSelectSchema()
        expect(s.parse({ val: undefined }).val).toBe(1)
        expect(s.parse({ val: undefined }).val).toBe(2)
    })

    it('explicit null overrides default for nullable columns', () => {
        const s = lite.table({ columns: { val: lite.int().default(42) } }).toSelectSchema()
        expect(s.parse({ val: null }).val).toBe(null)
    })

    it('validates multiple columns simultaneously', () => {
        const s = lite
            .table({
                columns: {
                    id: lite.int().notNull(),
                    name: lite.text().notNull(),
                    age: lite.int(),
                },
            })
            .toSelectSchema()

        const row = s.parse({ id: 1, name: 'Alice', age: null })
        expect(row).toEqual({ id: 1, name: 'Alice', age: null })
    })

    it('rejects missing required columns', () => {
        const s = lite
            .table({
                columns: { id: lite.int().notNull(), name: lite.text().notNull() },
            })
            .toSelectSchema()

        expect(() => s.parse({ id: 1 })).toThrow(ValidationError)
        expect(() => s.parse({ name: 'x' })).toThrow(ValidationError)
    })

    it('strips extra properties', () => {
        const s = lite.table({ columns: { id: lite.int().notNull() } }).toSelectSchema()
        const r = s.parse({ id: 1, extra: true })
        expect(r).not.toHaveProperty('extra')
    })

    it('handles mixed nullable and notNull columns', () => {
        const s = lite
            .table({
                columns: {
                    a: lite.text(),
                    b: lite.text().notNull(),
                    c: lite.text().notNull().default('c'),
                },
            })
            .toSelectSchema()

        expect(s.parse({ a: null, b: 'x', c: undefined }).c).toBe('c')
        expect(s.parse({ a: null, b: 'y', c: 'z' }).c).toBe('z')
        expect(() => s.parse({ a: 'ok', b: null, c: 'z' })).toThrow(ValidationError)
    })
})

// ---------------------------------------------------------------------------
// Schema runtime — Insert
// ---------------------------------------------------------------------------
describe('toInsertSchema → runtime validation', () => {
    it('autoIncrement columns are excluded from insert', () => {
        const s = lite
            .table({
                columns: {
                    id: lite.int().primaryKey().autoIncrement(),
                    name: lite.text().notNull(),
                },
            })
            .toInsertSchema()

        const r = s.parse({ name: 'Alice' })
        expect(r).toEqual({ name: 'Alice' })
        expect(r).not.toHaveProperty('id')
    })

    it('non-autoIncrement PK is required in insert', () => {
        const s = lite
            .table({
                columns: { id: lite.int().primaryKey(), label: lite.text().notNull() },
            })
            .toInsertSchema()

        expect(() => s.parse({ label: 'x' })).toThrow(ValidationError)
        expect(s.parse({ id: 1, label: 'x' })).toEqual({ id: 1, label: 'x' })
    })

    it('nullable columns accept undefined in insert', () => {
        const s = lite
            .table({
                columns: { id: lite.int().primaryKey(), bio: lite.text() },
            })
            .toInsertSchema()

        const r = s.parse({ id: 1 })
        expect(r).toEqual({ id: 1 })
    })

    it('notNull columns without default are required in insert', () => {
        const s = lite
            .table({
                columns: { id: lite.int().primaryKey(), name: lite.text().notNull() },
            })
            .toInsertSchema()

        expect(() => s.parse({ id: 1 })).toThrow(ValidationError)
    })

    it('notNull columns with default accept undefined in insert', () => {
        const s = lite
            .table({
                columns: { name: lite.text().notNull().default('anon') },
            })
            .toInsertSchema()

        expect(s.parse({}).name).toBe('anon')
        expect(s.parse({ name: 'Bob' }).name).toBe('Bob')
    })

    it('static default is applied when omitted in insert', () => {
        const s = lite.table({ columns: { val: lite.int().default(42) } }).toInsertSchema()
        expect(s.parse({}).val).toBe(42)
    })

    it('defaultFn is called on insert when omitted', () => {
        let counter = 0
        const s = lite.table({ columns: { val: lite.int().defaultFn(() => ++counter) } }).toInsertSchema()
        expect(s.parse({}).val).toBe(1)
        expect(s.parse({}).val).toBe(2)
    })

    it('explicit value overrides default in insert', () => {
        const s = lite.table({ columns: { val: lite.int().default(42) } }).toInsertSchema()
        expect(s.parse({ val: 99 }).val).toBe(99)
    })

    it('nullable column with default accepts null explicitly in insert', () => {
        const s = lite.table({ columns: { val: lite.int().default(0) } }).toInsertSchema()
        expect(s.parse({}).val).toBe(0)
        expect(s.parse({ val: null }).val).toBe(null)
    })

    it('rejects wrong types in insert', () => {
        const s = lite.table({ columns: { name: lite.text().notNull() } }).toInsertSchema()
        expect(() => s.parse({ name: 42 })).toThrow(ValidationError)
    })
})

// ---------------------------------------------------------------------------
// Schema runtime — Update
// ---------------------------------------------------------------------------
describe('toUpdateSchema → runtime validation', () => {
    it('all columns are optional', () => {
        const s = lite
            .table({
                columns: {
                    id: lite.int().primaryKey(),
                    name: lite.text().notNull(),
                },
            })
            .toUpdateSchema()

        expect(s.parse({ id: 1 }).id).toBe(1)
        expect(s.parse({ name: 'x' }).name).toBe('x')
        expect(s.parse({})).toEqual({})
    })

    it('preserves nullability — nullable columns accept null', () => {
        const s = lite
            .table({
                columns: {
                    id: lite.int().primaryKey(),
                    bio: lite.text(),
                },
            })
            .toUpdateSchema()

        expect(s.parse({ bio: null }).bio).toBe(null)
    })

    it('rejects wrong types in update', () => {
        const s = lite.table({ columns: { name: lite.text().notNull() } }).toUpdateSchema()
        expect(() => s.parse({ name: 42 })).toThrow(ValidationError)
    })

    it('notNull columns accept undefined (omitted)', () => {
        const s = lite.table({ columns: { name: lite.text().notNull() } }).toUpdateSchema()
        const r = s.parse({})
        expect(r.name).toBeUndefined()
    })
})

// ---------------------------------------------------------------------------
// Check constraints at runtime (gt, gte, lt, lte, minLength, maxLength)
// ---------------------------------------------------------------------------
describe('check constraints — numeric', () => {
    it('gt rejects values <= threshold', () => {
        const s = lite.table({ columns: { val: lite.int().notNull().gt(0) } }).toSelectSchema()
        expect(s.parse({ val: 1 }).val).toBe(1)
        expect(s.parse({ val: 100 }).val).toBe(100)
        expect(() => s.parse({ val: 0 })).toThrow(ValidationError)
        expect(() => s.parse({ val: -1 })).toThrow(ValidationError)
    })

    it('gte rejects values < threshold', () => {
        const s = lite.table({ columns: { val: lite.int().notNull().gte(18) } }).toSelectSchema()
        expect(s.parse({ val: 18 }).val).toBe(18)
        expect(s.parse({ val: 21 }).val).toBe(21)
        expect(() => s.parse({ val: 17 })).toThrow(ValidationError)
    })

    it('lt rejects values >= threshold', () => {
        const s = lite.table({ columns: { val: lite.int().notNull().lt(100) } }).toSelectSchema()
        expect(s.parse({ val: 99 }).val).toBe(99)
        expect(s.parse({ val: 0 }).val).toBe(0)
        expect(() => s.parse({ val: 100 })).toThrow(ValidationError)
        expect(() => s.parse({ val: 101 })).toThrow(ValidationError)
    })

    it('lte rejects values > threshold', () => {
        const s = lite.table({ columns: { val: lite.int().notNull().lte(200) } }).toSelectSchema()
        expect(s.parse({ val: 200 }).val).toBe(200)
        expect(s.parse({ val: 0 }).val).toBe(0)
        expect(() => s.parse({ val: 201 })).toThrow(ValidationError)
    })

    it('multiple numeric checks compose (range validation)', () => {
        const s = lite.table({ columns: { val: lite.int().notNull().gt(0).lt(100) } }).toSelectSchema()
        expect(s.parse({ val: 50 }).val).toBe(50)
        expect(() => s.parse({ val: 0 })).toThrow(ValidationError)
        expect(() => s.parse({ val: 100 })).toThrow(ValidationError)
    })

    it('gt, gte, lt, lte on real', () => {
        const s = lite.table({ columns: { val: lite.real().notNull().gte(0).lte(1) } }).toSelectSchema()
        expect(s.parse({ val: 0.5 }).val).toBe(0.5)
        expect(s.parse({ val: 1 }).val).toBe(1)
        expect(s.parse({ val: 0 }).val).toBe(0)
        expect(() => s.parse({ val: -0.01 })).toThrow(ValidationError)
        expect(() => s.parse({ val: 1.01 })).toThrow(ValidationError)
    })

    it('checks with nullable column — passes for null', () => {
        const s = lite.table({ columns: { val: lite.int().gt(0) } }).toSelectSchema()
        expect(s.parse({ val: null }).val).toBe(null)
        expect(s.parse({ val: 5 }).val).toBe(5)
        expect(() => s.parse({ val: 0 })).toThrow(ValidationError)
    })
})

describe('check constraints — string', () => {
    it('minLength on text', () => {
        const s = lite.table({ columns: { val: lite.text().notNull().minLength(3) } }).toSelectSchema()
        expect(s.parse({ val: 'abc' }).val).toBe('abc')
        expect(() => s.parse({ val: 'ab' })).toThrow(ValidationError)
    })

    it('maxLength on text', () => {
        const s = lite.table({ columns: { val: lite.text().notNull().maxLength(5) } }).toSelectSchema()
        expect(s.parse({ val: 'hello' }).val).toBe('hello')
        expect(() => s.parse({ val: 'hello!' })).toThrow(ValidationError)
    })

    it('minLength + maxLength compose', () => {
        const s = lite.table({ columns: { val: lite.text().notNull().minLength(3).maxLength(10) } }).toSelectSchema()
        expect(s.parse({ val: 'hello' }).val).toBe('hello')
        expect(() => s.parse({ val: 'ab' })).toThrow(ValidationError)
        expect(() => s.parse({ val: 'a'.repeat(11) })).toThrow(ValidationError)
    })

    it('minLength with nullable text — null passes', () => {
        const s = lite.table({ columns: { val: lite.text().minLength(3) } }).toSelectSchema()
        expect(s.parse({ val: null }).val).toBe(null)
        expect(() => s.parse({ val: 'ab' })).toThrow(ValidationError)
    })
})

// ---------------------------------------------------------------------------
// safeParse
// ---------------------------------------------------------------------------
describe('safeParse', () => {
    it('never throws', () => {
        const s = lite.table({ columns: { val: lite.int().notNull().gt(0) } }).toSelectSchema()
        expect(() => s.safeParse({ val: 'bad' })).not.toThrow()
        expect(() => s.safeParse({ val: null })).not.toThrow()
        expect(() => s.safeParse({})).not.toThrow()
    })

    it('returns success with correct data', () => {
        const s = lite.table({ columns: { val: lite.text().notNull() } }).toSelectSchema()
        const r = s.safeParse({ val: 'ok' })
        expect(r.success).toBe(true)
        if (r.success) expect(r.data.val).toBe('ok')
    })

    it('returns failure with errors on wrong type', () => {
        const s = lite.table({ columns: { val: lite.text().notNull() } }).toSelectSchema()
        const r = s.safeParse({ val: 42 })
        expect(r.success).toBe(false)
        if (!r.success) expect(r.errors[0]).toContain('string')
    })

    it('returns failure on constraint violation', () => {
        const s = lite.table({ columns: { val: lite.int().notNull().gt(0) } }).toSelectSchema()
        const r = s.safeParse({ val: 0 })
        expect(r.success).toBe(false)
    })

    it('returns success on insert schema with default', () => {
        const s = lite.table({ columns: { val: lite.text().notNull().default('anon') } }).toInsertSchema()
        const r = s.safeParse({})
        expect(r.success).toBe(true)
        if (r.success) expect(r.data.val).toBe('anon')
    })
})

// ---------------------------------------------------------------------------
// Column state introspection
// ---------------------------------------------------------------------------
describe('column state — introspection', () => {
    it('state.colType reflects the correct type', () => {
        expect(lite.int().state.colType).toBe('int')
        expect(lite.real().state.colType).toBe('real')
        expect(lite.text().state.colType).toBe('text')
        expect(lite.blob().state.colType).toBe('blob')
    })

    it('state.colType remains after chaining', () => {
        expect(lite.int().notNull().primaryKey().autoIncrement().state.colType).toBe('int')
        expect(lite.text().notNull().unique('conflict:ignore').collate('nocase').state.colType).toBe('text')
    })

    it('state.default values', () => {
        expect(lite.int().default(42).state.default).toBe(42)
        expect(lite.text().default('x').state.default).toBe('x')
        expect(lite.real().default(1.5).state.default).toBe(1.5)
    })

    it('state.defaultFn is a function', () => {
        const col = lite.int().defaultFn(() => Date.now())
        expect(typeof col.state.defaultFn).toBe('function')
    })

    it('state.defaultFn is callable', () => {
        let n = 0
        expect(lite.int().defaultFn(() => ++n).state.defaultFn!()).toBe(1)
    })

    it('onUpdate sets state.onUpdate', () => {
        const fn = () => 'now'
        expect(lite.text().onUpdate(fn).state.onUpdate).toBe(fn)
    })

    it('in() sets state.in', () => {
        expect(lite.text().in(['a', 'b']).state.in).toEqual(['a', 'b'])
    })

    it('in() replaces previous value', () => {
        const col = lite.text().in(['x'])
        expect(col.state.in).toEqual(['x'])
        col.state.in.push('y') // state is mutable (by design)
    })

    it('collate sets state.collate', () => {
        expect(lite.text().collate('binary').state.collate).toBe('binary')
        expect(lite.text().collate('nocase').state.collate).toBe('nocase')
        expect(lite.text().collate('rtrim').state.collate).toBe('rtrim')
    })

    it('unique stores conflict strategy', () => {
        expect(lite.text().unique().state.uniqueConflict).toBe('conflict:error')
        expect(lite.text().unique('conflict:ignore').state.uniqueConflict).toBe('conflict:ignore')
        expect(lite.text().unique('conflict:replace').state.uniqueConflict).toBe('conflict:replace')
    })

    it('references sets state.references', () => {
        const ref = { entityName: 'users', columnName: 'id', tableState: {} }
        const col = lite.int().references(ref, ['delete:cascade'])
        expect(col.state.references).toEqual({ col: ref, actions: ['delete:cascade'] })
    })

    it('index sets state.index', () => {
        expect(lite.int().index().state.index).toBe(true)
    })
})

// ---------------------------------------------------------------------------
// Complex multi-column table with options
// ---------------------------------------------------------------------------
describe('table with options — state introspection', () => {
    it('stores primaryKey from options', () => {
        const table = lite.table({
            columns: { id: lite.int().primaryKey(), name: lite.text() },
            options(ctx) {
                ctx.primaryKey(['id'])
            },
        })

        expect(table.primaryKey).toEqual([{ cols: ['id'] }])
    })

    it('stores unique constraint from options', () => {
        const table = lite.table({
            columns: { email: lite.text().notNull() },
            options(ctx) {
                ctx.unique({ name: 'u_email', cols: ['email'], conflict: 'conflict:error' })
            },
        })

        expect(table.unique).toEqual([{ name: 'u_email', cols: ['email'], conflict: 'conflict:error' }])
    })

    it('stores unique with non-default conflict', () => {
        const table = lite.table({
            columns: { email: lite.text() },
            options(ctx) {
                ctx.unique({ name: 'u_email', cols: ['email'], conflict: 'conflict:ignore' })
            },
        })

        expect(table.unique).toEqual([{ name: 'u_email', cols: ['email'], conflict: 'conflict:ignore' }])
    })

    it('stores index from options', () => {
        const table = lite.table({
            columns: { name: lite.text(), role: lite.text() },
            options(ctx) {
                ctx.index({ name: 'idx_name_role', cols: ['name', 'role'] })
            },
        })

        expect(table.index).toEqual([{ name: 'idx_name_role', cols: ['name', 'role'] }])
    })

    it('stores uniqueIndex from options', () => {
        const table = lite.table({
            columns: { a: lite.int(), b: lite.int() },
            options(ctx) {
                ctx.uniqueIndex({ name: 'uidx_a_b', cols: ['a', 'b'] })
            },
        })

        expect(table.uniqueIndex).toEqual([{ name: 'uidx_a_b', cols: ['a', 'b'] }])
    })

    it('stores withoutRowId', () => {
        const table = lite.table({
            columns: { id: lite.int().primaryKey() },
            options(ctx) {
                ctx.primaryKey(['id'])
                ctx.withoutRowId()
            },
        })

        expect(table.withoutRowId).toBe(true)
    })

    it('stores table-level check expressions', () => {
        const table = lite.table({
            columns: { start: lite.int(), end: lite.int() },
            options(ctx) {
                ctx.checks([ctx.lt('start', 'end')])
            },
        })

        expect(table.checks).toEqual([{ left: 'start', op: 'lt', right: 'end' }])
    })

    it('stores all four comparison operators from ctx', () => {
        const table = lite.table({
            columns: { a: lite.int(), b: lite.int(), c: lite.int(), d: lite.int() },
            options(ctx) {
                ctx.checks([ctx.gt('a', 'b'), ctx.gte('b', 'c'), ctx.lt('c', 'd'), ctx.lte('a', 'd')])
            },
        })

        expect(table.checks).toHaveLength(4)
        expect(table.checks[0]).toEqual({ left: 'a', op: 'gt', right: 'b' })
        expect(table.checks[1]).toEqual({ left: 'b', op: 'gte', right: 'c' })
        expect(table.checks[2]).toEqual({ left: 'c', op: 'lt', right: 'd' })
        expect(table.checks[3]).toEqual({ left: 'a', op: 'lte', right: 'd' })
    })

    it('no options = empty constraint arrays', () => {
        const table = lite.table({ columns: { id: lite.int() } })
        expect(table.primaryKey).toEqual([])
        expect(table.unique).toEqual([])
        expect(table.index).toEqual([])
        expect(table.uniqueIndex).toEqual([])
        expect(table.checks).toEqual([])
        expect(table.withoutRowId).toBe(false)
    })

    it('rawColumns contains the column states', () => {
        const table = lite.table({ columns: { a: lite.int().notNull(), b: lite.text() } })
        expect(table.rawColumns.a.colType).toBe('int')
        expect(table.rawColumns.a.notNull).toBe(true)
        expect(table.rawColumns.b.colType).toBe('text')
        expect(table.rawColumns.b.notNull).toBe(false)
    })
})

// ---------------------------------------------------------------------------
// Type inference alignment: $inferSelect matches $inferSelect after
// various modifier combinations
// ---------------------------------------------------------------------------
describe('type inference — $infer correspondence with schema.$infer', () => {
    it('simple table select', () => {
        const t = lite.table({ columns: { id: lite.int().notNull() } })
        const s = t.toSelectSchema()
        type A = typeof t.$inferSelect
        type B = typeof s.$infer
        expectTypeOf<A>().toEqualTypeOf<B>()
    })

    it('table with all column types select', () => {
        const t = lite.table({
            columns: {
                a: lite.int().notNull(),
                b: lite.real(),
                c: lite.text().notNull().default(''),
                d: lite.blob(),
            },
        })
        const s = t.toSelectSchema()
        type A = typeof t.$inferSelect
        type B = typeof s.$infer
        expectTypeOf<A>().toEqualTypeOf<B>()
    })

    it('table with autoIncrement insert', () => {
        const t = lite.table({
            columns: {
                id: lite.int().primaryKey().autoIncrement(),
                name: lite.text().notNull(),
            },
        })
        const s = t.toInsertSchema()
        type A = typeof t.$inferInsert
        type B = typeof s.$infer
        expectTypeOf<A>().toEqualTypeOf<B>()
    })

    it('table with nullable insert', () => {
        const t = lite.table({ columns: { a: lite.int(), b: lite.text() } })
        const s = t.toInsertSchema()
        type A = typeof t.$inferInsert
        type B = typeof s.$infer
        expectTypeOf<A>().toEqualTypeOf<B>()
    })

    it('table update', () => {
        const t = lite.table({ columns: { id: lite.int().primaryKey(), name: lite.text().notNull() } })
        const s = t.toUpdateSchema()
        type A = typeof t.$inferUpdate
        type B = typeof s.$infer
        expectTypeOf<A>().toEqualTypeOf<B>()
    })
})

// ---------------------------------------------------------------------------
// Edge cases
// ---------------------------------------------------------------------------
describe('edge cases', () => {
    it('table with single nullable column', () => {
        const s = lite.table({ columns: { a: lite.int() } }).toSelectSchema()
        expect(s.parse({ a: null }).a).toBe(null)
        expect(s.parse({ a: 42 }).a).toBe(42)
    })

    it('table with all notNull columns', () => {
        const s = lite
            .table({
                columns: { a: lite.int().notNull(), b: lite.text().notNull() },
            })
            .toSelectSchema()
        expect(s.parse({ a: 1, b: 'x' })).toEqual({ a: 1, b: 'x' })
        expect(() => s.parse({ a: null, b: 'x' })).toThrow(ValidationError)
    })

    it('table with all columns having defaults', () => {
        const s = lite
            .table({
                columns: {
                    a: lite.int().notNull().default(0),
                    b: lite.text().notNull().default('x'),
                },
            })
            .toInsertSchema()
        expect(s.parse({}).a).toBe(0)
        expect(s.parse({}).b).toBe('x')
    })

    it('table with only autoIncrement column', () => {
        const s = lite
            .table({
                columns: { id: lite.int().primaryKey().autoIncrement() },
            })
            .toInsertSchema()

        const r = s.parse({})
        expect(r).toEqual({})
    })

    it('gt at boundary', () => {
        const s = lite.table({ columns: { val: lite.int().notNull().gt(0) } }).toSelectSchema()
        expect(() => s.parse({ val: 0 })).toThrow()
        expect(s.parse({ val: 1 }).val).toBe(1)
    })

    it('gte at boundary', () => {
        const s = lite.table({ columns: { val: lite.int().notNull().gte(0) } }).toSelectSchema()
        expect(s.parse({ val: 0 }).val).toBe(0)
        expect(() => s.parse({ val: -1 })).toThrow()
    })

    it('lt at boundary', () => {
        const s = lite.table({ columns: { val: lite.int().notNull().lt(10) } }).toSelectSchema()
        expect(s.parse({ val: 9 }).val).toBe(9)
        expect(() => s.parse({ val: 10 })).toThrow()
    })

    it('lte at boundary', () => {
        const s = lite.table({ columns: { val: lite.int().notNull().lte(10) } }).toSelectSchema()
        expect(s.parse({ val: 10 }).val).toBe(10)
        expect(() => s.parse({ val: 11 })).toThrow()
    })

    it('zero-length minLength', () => {
        const s = lite.table({ columns: { val: lite.text().notNull().minLength(0) } }).toSelectSchema()
        expect(s.parse({ val: '' }).val).toBe('')
        expect(s.parse({ val: 'a' }).val).toBe('a')
    })

    it('maxLength with exact boundary', () => {
        const s = lite.table({ columns: { val: lite.text().notNull().maxLength(3) } }).toSelectSchema()
        expect(s.parse({ val: 'abc' }).val).toBe('abc')
        expect(() => s.parse({ val: 'abcd' })).toThrow()
    })

    it('int with negative values', () => {
        const s = lite.table({ columns: { val: lite.int().notNull() } }).toSelectSchema()
        expect(s.parse({ val: -100 }).val).toBe(-100)
    })

    it('real with zero', () => {
        const s = lite.table({ columns: { val: lite.real().notNull() } }).toSelectSchema()
        expect(s.parse({ val: 0 }).val).toBe(0)
    })
})

// ---------------------------------------------------------------------------
// Column state: defaults for optional properties
// ---------------------------------------------------------------------------
describe('column state — default property values', () => {
    it('new column has all default values', () => {
        const col = lite.int()
        expect(col.state.primaryKey).toBe(false)
        expect(col.state.autoIncrement).toBe(false)
        expect(col.state.notNull).toBe(false)
        expect(col.state.unique).toBe(false)
        expect(col.state.uniqueConflict).toBe('conflict:error')
        expect(col.state.index).toBe(false)
        expect(col.state.checks).toEqual([])
        expect(col.state.in).toEqual([])
        expect(col.state.default).toBeUndefined()
        expect(col.state.defaultFn).toBeUndefined()
        expect(col.state.onUpdate).toBeUndefined()
        expect(col.state.collate).toBeUndefined()
        expect(col.state.references).toBeUndefined()
        expect(col.state.refine).toBeUndefined()
    })

    it('primaryKey implies notNull', () => {
        const col = lite.int().primaryKey()
        expect(col.state.primaryKey).toBe(true)
        expect(col.state.notNull).toBe(true)
    })

    it('autoIncrement sets autoIncrement flag', () => {
        expect(lite.int().autoIncrement().state.autoIncrement).toBe(true)
    })
})

// ---------------------------------------------------------------------------
// Type inference — ensure no regression in modifier ordering
// ---------------------------------------------------------------------------
describe('type inference — modifier ordering', () => {
    it('notNull + primaryKey + autoIncrement order 1', () => {
        const col = lite.int().notNull().primaryKey().autoIncrement()
        expectTypeOf<typeof col.$type.select>().toEqualTypeOf<number>()
        expectTypeOf<typeof col.$type.insert>().toEqualTypeOf<never>()
    })

    it('notNull + autoIncrement + primaryKey order 2', () => {
        const col = lite.int().notNull().autoIncrement().primaryKey()
        expectTypeOf<typeof col.$type.select>().toEqualTypeOf<number>()
        // primaryKey makes insert NonNullable, autoIncrement sets never
        expectTypeOf<typeof col.$type.insert>().toEqualTypeOf<never>()
    })

    it('primaryKey + notNull order 3', () => {
        const col = lite.int().primaryKey().notNull()
        expectTypeOf<typeof col.$type.select>().toEqualTypeOf<number>()
        expectTypeOf<typeof col.$type.insert>().toEqualTypeOf<number>()
    })

    it('default + notNull (default then notNull)', () => {
        const col = lite.int().default(0).notNull()
        // default makes select non-null, notNull is a no-op after that
        expectTypeOf<typeof col.$type.select>().toEqualTypeOf<number>()
    })

    it('defaultFn + primaryKey', () => {
        const col = lite
            .int()
            .defaultFn(() => 42)
            .primaryKey()
        expectTypeOf<typeof col.$type.select>().toEqualTypeOf<number>()
        expectTypeOf<typeof col.$type.insert>().toEqualTypeOf<number>()
    })
})
