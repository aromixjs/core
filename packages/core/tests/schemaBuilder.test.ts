import { describe, it, expect, expectTypeOf } from 'vitest'
import * as v from 'valibot'
import { lite, SchemaBuilder } from '../src'

// ─── helpers ───────────────────────────────────────────────────────────────

function build<T extends Record<string, lite>>(model: T) {
   return new SchemaBuilder(model)
}

function accepts(schema: v.GenericSchema, value: unknown) {
   return v.safeParse(schema, value).success
}

function rejects(schema: v.GenericSchema, value: unknown) {
   return !v.safeParse(schema, value).success
}

// ─── base types ────────────────────────────────────────────────────────────

describe('base types — select', () => {

   it('int resolves to number', () => {
      const s = build({ age: lite.int() }).select()
      expect(accepts(s, { age: 42 })).toBe(true)
      expect(rejects(s, { age: 'hello' })).toBe(true)
   })

   it('real resolves to number', () => {
      const s = build({ score: lite.real() }).select()
      expect(accepts(s, { score: 3.14 })).toBe(true)
      expect(rejects(s, { score: true })).toBe(true)
   })

   it('text resolves to string', () => {
      const s = build({ name: lite.text() }).select()
      expect(accepts(s, { name: 'alice' })).toBe(true)
      expect(rejects(s, { name: 123 })).toBe(true)
   })

   it('boolean resolves to boolean', () => {
      const s = build({ active: lite.bool() }).select()
      expect(accepts(s, { active: true })).toBe(true)
      expect(rejects(s, { active: 1 })).toBe(true)
   })

   it('blob resolves to Uint8Array', () => {
      const s = build({ data: lite.blob() }).select()
      expect(accepts(s, { data: new Uint8Array([1, 2]) })).toBe(true)
      expect(rejects(s, { data: 'bytes' })).toBe(true)
   })

   it('bigint resolves to bigint', () => {
      const s = build({ large: lite.bigint() }).select()
      expect(accepts(s, { large: 9999999999999999n })).toBe(true)
      expect(rejects(s, { large: 9999999999 })).toBe(true)
   })

   it('date resolves to Date', () => {
      const s = build({ createdAt: lite.date('iso') }).select()
      expect(accepts(s, { createdAt: new Date() })).toBe(true)
      expect(rejects(s, { createdAt: '2026-01-01' })).toBe(true)
   })

})

// ─── base types — type level ────────────────────────────────────────────────

describe('base types — inferred types', () => {

   it('int infers as number | null on select', () => {
      const s = build({ age: lite.int() }).select()
      type Row = v.InferOutput<typeof s>
      expectTypeOf<Row['age']>().toEqualTypeOf<number | null>()
   })

   it('int notNull infers as number on select', () => {
      const s = build({ age: lite.int().notNull() }).select()
      type Row = v.InferOutput<typeof s>
      expectTypeOf<Row['age']>().toEqualTypeOf<number>()
   })

   it('real infers as number | null on select', () => {
      const s = build({ score: lite.real() }).select()
      type Row = v.InferOutput<typeof s>
      expectTypeOf<Row['score']>().toEqualTypeOf<number | null>()
   })

   it('text infers as string | null on select', () => {
      const s = build({ name: lite.text() }).select()
      type Row = v.InferOutput<typeof s>
      expectTypeOf<Row['name']>().toEqualTypeOf<string | null>()
   })

   it('text notNull infers as string on select', () => {
      const s = build({ name: lite.text().notNull() }).select()
      type Row = v.InferOutput<typeof s>
      expectTypeOf<Row['name']>().toEqualTypeOf<string>()
   })

   it('boolean infers as boolean | null on select', () => {
      const s = build({ active: lite.bool() }).select()
      type Row = v.InferOutput<typeof s>
      expectTypeOf<Row['active']>().toEqualTypeOf<boolean | null>()
   })

   it('boolean notNull infers as boolean on select', () => {
      const s = build({ active: lite.bool().notNull() }).select()
      type Row = v.InferOutput<typeof s>
      expectTypeOf<Row['active']>().toEqualTypeOf<boolean>()
   })

   it('bigint infers as bigint | null on select', () => {
      const s = build({ large: lite.bigint() }).select()
      type Row = v.InferOutput<typeof s>
      expectTypeOf<Row['large']>().toEqualTypeOf<bigint | null>()
   })

   it('date infers as Date | null on select', () => {
      const s = build({ createdAt: lite.date('iso') }).select()
      type Row = v.InferOutput<typeof s>
      expectTypeOf<Row['createdAt']>().toEqualTypeOf<Date | null>()
   })

   it('date notNull infers as Date on select', () => {
      const s = build({ createdAt: lite.date('iso').notNull() }).select()
      type Row = v.InferOutput<typeof s>
      expectTypeOf<Row['createdAt']>().toEqualTypeOf<Date>()
   })

})

// ─── nullability ───────────────────────────────────────────────────────────

describe('nullability', () => {

   it('select — bare column accepts null', () => {
      const s = build({ name: lite.text() }).select()
      expect(accepts(s, { name: null })).toBe(true)
   })

   it('select — notNull rejects null', () => {
      const s = build({ name: lite.text().notNull() }).select()
      expect(rejects(s, { name: null })).toBe(true)
   })

   it('insert — bare column is optional', () => {
      const s = build({ name: lite.text() }).insert()
      expect(accepts(s, {})).toBe(true)
   })

   it('insert — notNull without default is required', () => {
      const s = build({ name: lite.text().notNull() }).insert()
      expect(rejects(s, {})).toBe(true)
      expect(accepts(s, { name: 'alice' })).toBe(true)
   })

   it('insert — notNull with default is optional', () => {
      const s = build({ role: lite.text().notNull().default('user') }).insert()
      expect(accepts(s, {})).toBe(true)
   })

   it('insert — notNull with defaultFn is optional', () => {
      const s = build({ id: lite.text().notNull().defaultFn(() => 'uuid') }).insert()
      expect(accepts(s, {})).toBe(true)
   })

   it('insert — primaryKey is optional', () => {
      const s = build({ id: lite.int().primaryKey().autoIncrement() }).insert()
      expect(accepts(s, {})).toBe(true)
   })

   it('update — all columns optional', () => {
      const s = build({
         id:   lite.int().primaryKey(),
         name: lite.text().notNull(),
      }).update()
      expect(accepts(s, {})).toBe(true)
      expect(accepts(s, { name: 'bob' })).toBe(true)
   })

})

// ─── nullability — type level ───────────────────────────────────────────────

describe('nullability — inferred types', () => {

   it('select — bare column type includes null', () => {
      const s = build({ name: lite.text() }).select()
      type Row = v.InferOutput<typeof s>
      expectTypeOf<Row['name']>().toEqualTypeOf<string | null>()
   })

   it('select — notNull column type excludes null', () => {
      const s = build({ name: lite.text().notNull() }).select()
      type Row = v.InferOutput<typeof s>
      expectTypeOf<Row['name']>().toEqualTypeOf<string>()
      expectTypeOf<Row['name']>().not.toEqualTypeOf<string | null>()
   })

   it('insert — bare column type is optional', () => {
      const s = build({ name: lite.text() }).insert()
      type Row = v.InferOutput<typeof s>
      expectTypeOf<Row['name']>().toEqualTypeOf<string | null | undefined>()
   })

   it('insert — notNull required column type is string', () => {
      const s = build({ name: lite.text().notNull() }).insert()
      type Row = v.InferOutput<typeof s>
      expectTypeOf<Row['name']>().toEqualTypeOf<string>()
   })

   it('insert — primaryKey column type is optional', () => {
      const s = build({ id: lite.int().primaryKey() }).insert()
      type Row = v.InferOutput<typeof s>
      expectTypeOf<Row['id']>().toEqualTypeOf<number | undefined>()
   })

   it('update — notNull column type becomes optional', () => {
      const s = build({ name: lite.text().notNull() }).update()
      type Row = v.InferOutput<typeof s>
      expectTypeOf<Row['name']>().toEqualTypeOf<string | undefined>()
   })

   it('update — nullable column type is optional and nullable', () => {
      const s = build({ name: lite.text() }).update()
      type Row = v.InferOutput<typeof s>
      expectTypeOf<Row['name']>().toEqualTypeOf<string | null | undefined>()
   })

})

// ─── constraints ───────────────────────────────────────────────────────────

describe('constraints', () => {

   it('min rejects below threshold', () => {
      const s = build({ age: lite.int().notNull().min(0) }).insert()
      expect(rejects(s, { age: -1 })).toBe(true)
      expect(accepts(s, { age: 0 })).toBe(true)
   })

   it('max rejects above threshold', () => {
      const s = build({ age: lite.int().notNull().max(150) }).insert()
      expect(rejects(s, { age: 151 })).toBe(true)
      expect(accepts(s, { age: 150 })).toBe(true)
   })

   it('min and max together', () => {
      const s = build({ age: lite.int().notNull().min(0).max(150) }).insert()
      expect(rejects(s, { age: -1 })).toBe(true)
      expect(rejects(s, { age: 151 })).toBe(true)
      expect(accepts(s, { age: 25 })).toBe(true)
   })

   it('minLength rejects short strings', () => {
      const s = build({ name: lite.text().notNull().minLength(2) }).insert()
      expect(rejects(s, { name: 'a' })).toBe(true)
      expect(accepts(s, { name: 'ab' })).toBe(true)
   })

   it('maxLength rejects long strings', () => {
      const s = build({ bio: lite.text().notNull().maxLength(10) }).insert()
      expect(rejects(s, { bio: 'a'.repeat(11) })).toBe(true)
      expect(accepts(s, { bio: 'a'.repeat(10) })).toBe(true)
   })

   it('minLength and maxLength together', () => {
      const s = build({ name: lite.text().notNull().minLength(2).maxLength(50) }).insert()
      expect(rejects(s, { name: 'a' })).toBe(true)
      expect(rejects(s, { name: 'a'.repeat(51) })).toBe(true)
      expect(accepts(s, { name: 'alice' })).toBe(true)
   })

   it('in rejects unlisted value', () => {
      const s = build({ role: lite.text().notNull().in(['admin', 'user']) }).insert()
      expect(rejects(s, { role: 'moderator' })).toBe(true)
      expect(accepts(s, { role: 'admin' })).toBe(true)
      expect(accepts(s, { role: 'user' })).toBe(true)
   })

   it('in with default is optional on insert', () => {
      const s = build({ role: lite.text().notNull().in(['admin', 'user']).default('user') }).insert()
      expect(accepts(s, {})).toBe(true)
   })

})

// ─── complex models ────────────────────────────────────────────────────────

describe('complex model', () => {

   const userModel = {
      id:        lite.int().primaryKey().autoIncrement(),
      publicId:  lite.text().notNull().defaultFn(() => crypto.randomUUID()),
      name:      lite.text().notNull().minLength(1).maxLength(100),
      email:     lite.text().notNull(),
      role:      lite.text().notNull().in(['admin', 'user', 'moderator']).default('user'),
      age:       lite.int().min(0).max(150),
      active:    lite.bool().notNull().default(true),
      score:     lite.real().min(0),
      createdAt: lite.date('iso').notNull().defaultFn(() => new Date()),
      updatedAt: lite.date('iso').notNull().defaultFn(() => new Date()).onUpdate(() => new Date()),
   }

   const schema = build(userModel)

   // ── runtime ──────────────────────────────────────────────────────────────

   describe('select — runtime', () => {

      it('accepts full valid row', () => {
         expect(accepts(schema.select(), {
            id:        1,
            publicId:  'abc-123',
            name:      'Alice',
            email:     'alice@example.com',
            role:      'admin',
            age:       30,
            active:    true,
            score:     99.5,
            createdAt: new Date(),
            updatedAt: new Date(),
         })).toBe(true)
      })

      it('accepts null on nullable columns', () => {
         expect(accepts(schema.select(), {
            id:        1,
            publicId:  'abc-123',
            name:      'Alice',
            email:     'alice@example.com',
            role:      'user',
            age:       null,
            active:    true,
            score:     null,
            createdAt: new Date(),
            updatedAt: new Date(),
         })).toBe(true)
      })

      it('rejects null on notNull columns', () => {
         expect(rejects(schema.select(), {
            id:        1,
            publicId:  'abc-123',
            name:      null,
            email:     'alice@example.com',
            role:      'user',
            age:       null,
            active:    true,
            score:     null,
            createdAt: new Date(),
            updatedAt: new Date(),
         })).toBe(true)
      })

   })

   describe('select — types', () => {

      type SelectRow = v.InferOutput<ReturnType<typeof schema.select>>

      it('notNull columns are non-nullable', () => {
         expectTypeOf<SelectRow['name']>().toEqualTypeOf<string>()
         expectTypeOf<SelectRow['email']>().toEqualTypeOf<string>()
         expectTypeOf<SelectRow['active']>().toEqualTypeOf<boolean>()
         expectTypeOf<SelectRow['createdAt']>().toEqualTypeOf<Date>()
         expectTypeOf<SelectRow['updatedAt']>().toEqualTypeOf<Date>()
      })

      it('nullable columns include null', () => {
         expectTypeOf<SelectRow['age']>().toEqualTypeOf<number | null>()
         expectTypeOf<SelectRow['score']>().toEqualTypeOf<number | null>()
      })

      it('id is number', () => {
         expectTypeOf<SelectRow['id']>().toEqualTypeOf<number>()
      })

   })

   describe('insert — runtime', () => {

      it('accepts minimal valid insert', () => {
         expect(accepts(schema.insert(), {
            name:  'Alice',
            email: 'alice@example.com',
         })).toBe(true)
      })

      it('rejects missing required fields', () => {
         expect(rejects(schema.insert(), {
            email: 'alice@example.com',
         })).toBe(true)
      })

      it('rejects invalid role on insert', () => {
         expect(rejects(schema.insert(), {
            name:  'Alice',
            email: 'alice@example.com',
            role:  'superadmin',
         })).toBe(true)
      })

      it('rejects age out of range', () => {
         expect(rejects(schema.insert(), {
            name:  'Alice',
            email: 'alice@example.com',
            age:   200,
         })).toBe(true)
      })

      it('rejects name too short', () => {
         expect(rejects(schema.insert(), {
            name:  '',
            email: 'alice@example.com',
         })).toBe(true)
      })

   })

   describe('insert — types', () => {

      type InsertRow = v.InferOutput<ReturnType<typeof schema.insert>>

      it('required fields are not optional', () => {
         expectTypeOf<InsertRow['name']>().toEqualTypeOf<string>()
         expectTypeOf<InsertRow['email']>().toEqualTypeOf<string>()
      })

      it('primaryKey is optional', () => {
         expectTypeOf<InsertRow['id']>().toEqualTypeOf<number | undefined>()
      })

      it('nullable fields are optional', () => {
         expectTypeOf<InsertRow['age']>().toEqualTypeOf<number | null | undefined>()
         expectTypeOf<InsertRow['score']>().toEqualTypeOf<number | null | undefined>()
      })

   })

   describe('update — runtime', () => {

      it('accepts empty update', () => {
         expect(accepts(schema.update(), {})).toBe(true)
      })

      it('accepts partial update', () => {
         expect(accepts(schema.update(), { name: 'Bob' })).toBe(true)
      })

      it('still validates constraints on provided fields', () => {
         expect(rejects(schema.update(), { role: 'superadmin' })).toBe(true)
         expect(rejects(schema.update(), { age: -5 })).toBe(true)
         expect(rejects(schema.update(), { name: '' })).toBe(true)
      })

   })

   describe('update — types', () => {

      type UpdateRow = v.InferOutput<ReturnType<typeof schema.update>>

      it('all fields are optional', () => {
         expectTypeOf<UpdateRow['name']>().toEqualTypeOf<string | undefined>()
         expectTypeOf<UpdateRow['email']>().toEqualTypeOf<string | undefined>()
         expectTypeOf<UpdateRow['id']>().toEqualTypeOf<number | undefined>()
         expectTypeOf<UpdateRow['active']>().toEqualTypeOf<boolean | undefined>()
      })

      it('nullable fields are optional and nullable', () => {
         expectTypeOf<UpdateRow['age']>().toEqualTypeOf<number | null | undefined>()
         expectTypeOf<UpdateRow['score']>().toEqualTypeOf<number | null | undefined>()
      })

   })

})

// ─── edge cases ────────────────────────────────────────────────────────────

describe('edge cases', () => {

   it('empty model produces empty object schema', () => {
      const s = build({}).select()
      expect(accepts(s, {})).toBe(true)
   })

   it('empty model infers as empty object', () => {
      const s = build({}).select()
      type Row = v.InferOutput<typeof s>
      expectTypeOf<Row>().toEqualTypeOf<{}>()
   })

   it('all nullable model accepts all nulls on select', () => {
      const s = build({
         a: lite.int(),
         b: lite.text(),
         c: lite.bool(),
      }).select()
      expect(accepts(s, { a: null, b: null, c: null })).toBe(true)
   })

   it('all nullable model infers all nullable on select', () => {
      const s = build({
         a: lite.int(),
         b: lite.text(),
         c: lite.bool(),
      }).select()
      type Row = v.InferOutput<typeof s>
      expectTypeOf<Row['a']>().toEqualTypeOf<number | null>()
      expectTypeOf<Row['b']>().toEqualTypeOf<string | null>()
      expectTypeOf<Row['c']>().toEqualTypeOf<boolean | null>()
   })

   it('all optional model accepts empty object on insert', () => {
      const s = build({
         a: lite.int().default(0),
         b: lite.text().default(''),
         c: lite.bool().default(false),
      }).insert()
      expect(accepts(s, {})).toBe(true)
   })

   it('real accepts integer values', () => {
      const s = build({ score: lite.real().notNull() }).insert()
      expect(accepts(s, { score: 100 })).toBe(true)
   })

   it('score min 0 rejects negative real', () => {
      const s = build({ score: lite.real().notNull().min(0) }).insert()
      expect(rejects(s, { score: -0.1 })).toBe(true)
      expect(accepts(s, { score: 0 })).toBe(true)
   })

})