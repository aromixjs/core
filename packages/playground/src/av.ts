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

// --- nullability ---

const optionalName = av.string().optional()
type OptionalName = typeof optionalName.$infer   // string | undefined

const nullableAge = av.number().nullable()
type NullableAge = typeof nullableAge.$infer     // number | null

// --- parse (stub) ---

const parsedName = av.string().parse('rifat')
//    ^? string

const parsedAge = av.number().nullable().parse(null)
//    ^? number | null

// --- meta ---

console.log(av.string().meta())
// { type: 'string', optional: false, nullable: false }

console.log(av.string().optional().meta())
// { type: 'string', optional: true, nullable: false }

console.log(av.number().nullable().meta())
// { type: 'number', optional: false, nullable: true }

// --- chain hides used methods ---

const s = av.string().optional()
// s.optional() — gone, TS error
// s.nullable() — gone, TS error

// --- Infer utility ---

const Schema = av.boolean().optional()
type SchemaOutput = Infer<typeof Schema>   // boolean | undefined




const schemaObj = av.object({
   name: av.string().nullable(),
   age: av.number().optional()
}).optional()


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


const tpl= av.tuple([av.string()])


const dataTpl =tpl.parse({data:'test'})