import { ax, Infer } from "@aromix/validator";

const name = ax.string()
const age = ax.number()
const active = ax.boolean()
const score = ax.bigint()
const tag = ax.symbol()
const empty = ax.null()
const missing = ax.undefined()
const anything = ax.unknown()
const impossible = ax.never()

type Name = typeof name.$infer      // string
type Age = typeof age.$infer       // number
type Active = typeof active.$infer    // boolean
type Score = typeof score.$infer     // bigint
type Tag = typeof tag.$infer       // symbol
type Empty = typeof empty.$infer     // null
type Missing = typeof missing.$infer   // undefined
type Anything = typeof anything.$infer // unknown

// --- union instead of optional/nullable ---

const optionalName = ax.union([ax.string(), ax.undefined()])
type OptionalName = typeof optionalName.$infer   // string | undefined

const nullableAge = ax.union([ax.number(), ax.null()])
type NullableAge = typeof nullableAge.$infer     // number | null

// --- parse ---

const parsedName = ax.string().parse('rifat')
//    ^? string

const parsedAge = ax.union([ax.number(), ax.null()]).parse(null)
//    ^? number | null

// --- meta ---

console.log(ax.string().meta())
// { type: 'string' }

console.log(ax.union([ax.string(), ax.undefined()]).meta())
// { type: 'union', schemas: [...] }

// --- Infer utility ---

const Schema = ax.union([ax.boolean(), ax.undefined()])
type SchemaOutput = Infer<typeof Schema>   // boolean | undefined

const schemaObj = ax.union([ax.object({
   name: ax.union([ax.string(), ax.null()]),
   age: ax.union([ax.number(), ax.undefined()])
}), ax.undefined()])

const data = schemaObj.parse({
   name: null,
   age: undefined
})

const sar = ax.array(schemaObj)

const parsedData = sar.parse([
   {
      name: 20,
      age: '20'
   }
])

const tpl = ax.tuple([ax.string(), ax.number()])

const dataTpl = tpl.parse(['hello', 42])

// --- literal ---

const hello = ax.literal('hello')
type Hello = typeof hello.$infer   // 'hello'

const fortyTwo = ax.literal(42)
type FortyTwo = typeof fortyTwo.$infer  // 42

const isTrue = ax.literal(true)
type IsTrue = typeof isTrue.$infer    // true

const nothing = ax.literal(null)
type Nothing = typeof nothing.$infer  // null

hello.parse('hello')  // OK
hello.parse('world')  // throws

const rcs = ax.record(ax.string())

const rcsv = rcs.parse({})

const union = ax.union([
   ax.literal('1'),
   ax.literal(4),
   ax.literal('test')
])

const parsedUnion = union.parse({})



