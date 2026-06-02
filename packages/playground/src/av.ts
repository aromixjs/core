import { av, Infer } from "@aromix/validator";

const name = av.string()
const age = av.number()
const active = av.boolean()
const score = av.bigint()
const tag = av.symbol()
const empty = av.null()
const missing = av.undefined()
const anything = av.unknown()
const impossible = av.never()

type Name = typeof name.$infer      // string
type Age = typeof age.$infer       // number
type Active = typeof active.$infer    // boolean
type Score = typeof score.$infer     // bigint
type Tag = typeof tag.$infer       // symbol
type Empty = typeof empty.$infer     // null
type Missing = typeof missing.$infer   // undefined
type Anything = typeof anything.$infer // unknown

// --- union instead of optional/nullable ---

const optionalName = av.union([av.string(), av.undefined()])
type OptionalName = typeof optionalName.$infer   // string | undefined

const nullableAge = av.union([av.number(), av.null()])
type NullableAge = typeof nullableAge.$infer     // number | null

// --- parse ---

const parsedName = av.string().parse('rifat')
//    ^? string

const parsedAge = av.union([av.number(), av.null()]).parse(null)
//    ^? number | null

// --- meta ---

console.log(av.string().meta())
// { type: 'string' }

console.log(av.union([av.string(), av.undefined()]).meta())
// { type: 'union', schemas: [...] }

// --- Infer utility ---

const Schema = av.union([av.boolean(), av.undefined()])
type SchemaOutput = Infer<typeof Schema>   // boolean | undefined

const schemaObj = av.union([av.object({
   name: av.union([av.string(), av.null()]),
   age: av.union([av.number(), av.undefined()])
}), av.undefined()])

const data = schemaObj.parse({
   name: null,
   age: undefined
})

const sar = av.array(schemaObj)

const parsedData = sar.parse([
   {
      name: 20,
      age: '20'
   }
])

const tpl = av.tuple([av.string(), av.number()])

const dataTpl = tpl.parse(['hello', 42])

// --- literal ---

const hello = av.literal('hello')
type Hello = typeof hello.$infer   // 'hello'

const fortyTwo = av.literal(42)
type FortyTwo = typeof fortyTwo.$infer  // 42

const isTrue = av.literal(true)
type IsTrue = typeof isTrue.$infer    // true

const nothing = av.literal(null)
type Nothing = typeof nothing.$infer  // null

hello.parse('hello')  // OK
hello.parse('world')  // throws

const rcs = av.record(av.string())

const rcsv = rcs.parse({})

const union = av.union([
   av.literal('1'),
   av.literal(4),
   av.literal('test')
])

const parsedUnion = union.parse({})