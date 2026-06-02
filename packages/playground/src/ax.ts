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

// --- nullability ---

const optionalName = ax.string().optional()
type OptionalName = typeof optionalName.$infer   // string | undefined

const nullableAge = ax.number().nullable()
type NullableAge = typeof nullableAge.$infer     // number | null

// --- parse (stub) ---

const parsedName = ax.string().parse('rifat')
//    ^? string

const parsedAge = ax.number().nullable().parse(null)
//    ^? number | null

// --- meta ---

console.log(ax.string().meta())
// { type: 'string', optional: false, nullable: false }

console.log(ax.string().optional().meta())
// { type: 'string', optional: true, nullable: false }

console.log(ax.number().nullable().meta())
// { type: 'number', optional: false, nullable: true }

// --- chain hides used methods ---

const s = ax.string().optional()
// s.optional() — gone, TS error
// s.nullable() — gone, TS error

// --- Infer utility ---

const Schema = ax.boolean().optional()
type SchemaOutput = Infer<typeof Schema>   // boolean | undefined




const schemaObj = ax.object({
   name: ax.string().nullable(),
   age: ax.number().optional()
}).optional()


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