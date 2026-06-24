import { ax } from '../src/lib/ax'

// ── Primitives ──────────────────────────────────────────────

const str = ax.string()
const num = ax.number()
const bool = ax.boolean()
const big = ax.bigint()
const sym = ax.symbol()
const nil = ax.null()
const undef = ax.undefined()
const uk = ax.unknown()
const nev = ax.never()

// ── Modifiers ───────────────────────────────────────────────

const optStr = ax.string().optional()
const nullableNum = ax.number().nullable()
const nullishBool = ax.boolean().nullish()

const withDefault = ax.string().default('hello')
const withDefaultFn = ax.number().defaultFn(() => Date.now())

const readOnly = ax.string().readonly()
const locked = ax.string().locked()
const hidden = ax.string().hidden()

const withConvert = ax.number().convert()

// ── Objects ─────────────────────────────────────────────────

const user = ax.object({
	id: ax.number().readonly(),
	name: ax.string(),
	email: ax.string().optional(),
	age: ax.number().nullable(),
	tags: ax.array(ax.string()),
})

// ── Arrays & Tuples ─────────────────────────────────────────

const stringArr = ax.array(ax.string())
const pair = ax.tuple([ax.string(), ax.number()] as const)

// ── Union & Literals ────────────────────────────────────────

const status = ax.union([ax.literal('active'), ax.literal('inactive'), ax.literal('pending')] as const)

const role = ax.literals('admin', 'user', 'guest')

// ── Record ──────────────────────────────────────────────────

const scores = ax.record(ax.number())

// ── Instance ────────────────────────────────────────────────

class Foo {}
const fooSchema = ax.instance(Foo)

// ── Chaining ────────────────────────────────────────────────

const complex = ax.object({
	meta: ax.object({
		createdAt: ax.number().readonly(),
		updatedBy: ax.string().nullable().optional(),
	}),
	items: ax.array(
		ax.object({
			id: ax.string().readonly(),
			value: ax.number().default(0),
		}),
	),
})

// ── Pipe ────────────────────────────────────────────────────

const trimmed = ax.string().pipe((s) => s.trim())

// ── Access ──────────────────────────────────────────────────

const withAccess = ax.string().access({ insert: ax.literals('create', 'update'), update: ax.string() })

// ── Type helpers ────────────────────────────────────────────

type User = typeof user.$infer
type UserSelect = typeof user.$inferSelect
type UserInsert = typeof user.$inferInsert
type UserUpdate = typeof user.$inferUpdate

// ── Log schema state ───────────────────────────────────────

const schemas = {
	str,
	num,
	bool,
	big,
	sym,
	nil,
	undef,
	uk,
	nev,
	optStr,
	nullableNum,
	nullishBool,
	withDefault,
	withDefaultFn,
	readOnly,
	locked,
	hidden,
	withConvert,
	user,
	stringArr,
	pair,
	status,
	role,
	scores,
	fooSchema,
	complex,
	trimmed,
	withAccess,
}

for (const [name, schema] of Object.entries(schemas)) {
	console.log(name, '→', JSON.stringify(schema.state, null, 2))
	console.log('---')
}
