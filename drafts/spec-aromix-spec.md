# Aromix — Full Framework Spec

**Status:** Active Design  
**Stack:** Bun · TypeScript · SurrealDB · Sliz · Layos  
**Goal:** Code-first full-stack framework for building template sites (ecommerce, SaaS, corporate apps) with zero repetitive boilerplate, live reactivity, and a generated admin panel.

---

## 1. Core Philosophy

- **No REST conventions** — no route-per-operation, no HTTP verbs for mutations
- **Single WS connection** — everything after initial page load goes through one persistent WebSocket per client
- **SSR for public pages** — SEO covered, first render is server HTML, then hydrates into live
- **Live by default** — mutations write to SurrealDB, LIVE SELECT fires, server reruns subscribed queries, pushes fresh data to all subscribers automatically
- **No manual invalidation** — the DB change is the signal
- **DI everywhere** — `@provide()` + `inject()` is the single wiring model
- **One module model** — internal features and external plugins use the exact same API

---

## 2. Transport Layer

### 2.1 Connection Model

```
Browser                     Aromix Server               SurrealDB
  |                               |                          |
  |── GET /products ─────────────>|                          |
  |   (HTTP, SSR)                 |── query ────────────────>|
  |                               |<─ result ────────────────|
  |<── full HTML ─────────────────|                          |
  |                               |                          |
  |── GET /__ws ─────────────────>|                          |
  |<── 101 Upgrade ───────────────|                          |
  |                               |                          |
  |   (persistent WS — all ops)   |                          |
  |── { type:'query', ... } ─────>|── LIVE SELECT ──────────>|
  |<── { type:'data',  ... } ─────|                          |
  |                               |                          |
  |── { type:'mutation', ... } ──>|── write ────────────────>|
  |                               |                 DB change |
  |                               |<── LIVE notify ──────────|
  |                               |── rerun query ──────────>|
  |                               |<─ fresh data ────────────|
  |<── { type:'data', ... } ──────|  (pushed to all subs)    |
```

- One WS connection per client. No reconnection pain — SSR always gives fresh data on refresh.
- No `POST /__rpc`. WS is the only transport for queries, mutations, and actions.

### 2.2 WS Message Protocol

```ts
// Client → Server

// Open a live subscription
{ type: 'query',    key: 'ProductService.list',   args: { category: 'shoes' }, subId: 'q_1a2b' }

// Close a subscription (component unmount)
{ type: 'unsub',    subId: 'q_1a2b' }

// Call a mutation
{ type: 'mutation', key: 'ProductService.create', args: { title: 'Nike', price: 120 }, reqId: 'r_3c4d' }

// Call an action
{ type: 'action',   key: 'ProductService.importCSV', args: { fileId: '...' }, reqId: 'r_5e6f' }


// Server → Client

// Live data push (initial + every time LIVE SELECT fires for this subscription)
{ type: 'data',  subId: 'q_1a2b', data: [...] }

// Mutation/action acknowledged
{ type: 'ack',   reqId: 'r_3c4d' }

// Error (mutation failed, validation failed, auth failed, etc.)
{ type: 'error', reqId: 'r_3c4d', code: 'OUT_OF_STOCK', message: 'Product is out of stock' }
```

The `key` is `ClassName.methodName` — generated at build time from the service class. Stable, no magic strings at runtime.

---

## 3. Database Layer — SurrealDB

SurrealDB is the only database. No MongoDB, no Postgres, no migrations.

### 3.1 Why SurrealDB

- ACID transactions across multiple tables — concurrent writes handled at DB level (two users buying last item = one wins, one gets error)
- LIVE SELECT — table-level change notifications over WS — this is what drives auto-refresh
- Multi-model: document, graph, relational in one query language (SurrealQL)
- Record links instead of JOINs — no N+1
- Single binary, self-hostable

### 3.2 App Registration

```ts
app.db(surreal({
  url:  'ws://localhost:8000',
  ns:   'myapp',
  db:   'main',
  user: env.DB_USER,
  pass: env.DB_PASS,
}))
```

The DB connection is injected into every query/mutation/action context as `ctx.db`. Not exposed globally. Not injectable directly — goes through context only.

### 3.3 How LIVE SELECT Drives Reactivity

When `defineQuery` is registered with `{ tables: ['product'] }`, the framework opens a `LIVE SELECT * FROM product` on the SurrealDB connection. When any write touches `product`, SurrealDB sends a notification. Aromix reruns all queries tagged with `product`, diffs the result, and pushes fresh data via WS to every subscribed client.

No polling. No manual invalidation. No cache keys.

---

## 4. Service Classes

Services are the primary unit of organization. One class groups related queries, mutations, and actions together. DI wires them everywhere.

### 4.1 Method Types

| Type | Reads DB | Writes DB | External calls | Subscribable |
|------|----------|-----------|----------------|--------------|
| `defineQuery` | ✓ | ✗ | ✗ | ✓ |
| `defineMutation` | ✓ | ✓ | ✗ | ✗ |
| `defineAction` | via mutation | via `ctx.run()` | ✓ | ✗ |

### 4.2 Full Service Example

```ts
import { provide, inject }                     from '@aromix/core'
import { defineQuery, defineMutation, defineAction, pipe } from '@aromix/core'
import { SessionToken, AuthToken }             from '@aromix/auth'
import { CheckoutToken }                       from '@aromix/payment'
import { validate, can }                       from '@aromix/core'
import { ProductInput }                        from './schemas'

@provide()
export class ProductService {

  // QUERY — read only, subscribable, runs on server for SSR then becomes live sub on client
  list = defineQuery(
    { tables: ['product'] },
    async (ctx, { category, page = 1 }: { category?: string; page?: number }) => {
      return ctx.db.query<Product[]>(
        `SELECT *, category.name, category.slug
         FROM product
         WHERE ($category = NONE OR category.slug = $category)
         AND status = 'published'
         ORDER BY createdAt DESC
         LIMIT 20
         START ${(page - 1) * 20}
         FETCH category`,
        { category }
      )
    }
  )

  get = defineQuery(
    { tables: ['product', 'review'] },  // depends on two tables
    async (ctx, { id }: { id: string }) => {
      return ctx.db.query<ProductDetail>(
        `SELECT *, category.*, reviews.*
         FROM product:${id}
         FETCH category, reviews`,
      )
    }
  )

  // MUTATION — writes DB, no external calls, LIVE SELECT fires automatically after write
  create = defineMutation(
    pipe(
      inject(SessionToken).require,     // must be logged in
      can('product:write'),             // RBAC check
      validate(ProductInput),           // validates input, typed output
    ),
    async (ctx, data: ProductInput) => {
      await ctx.db.query(
        `CREATE product CONTENT $data`,
        { data: { ...data, ownerId: ctx.user.id, createdAt: new Date(), status: 'draft' } }
      )
      // no invalidate() needed — LIVE SELECT on 'product' fires, list() reruns for all subs
    }
  )

  update = defineMutation(
    pipe(inject(SessionToken).require, can('product:write'), validate(ProductInput.partial())),
    async (ctx, { id, ...data }: { id: string } & Partial<ProductInput>) => {
      await ctx.db.query(
        `UPDATE product:${id} MERGE $data`,
        { data: { ...data, updatedAt: new Date() } }
      )
    }
  )

  delete = defineMutation(
    pipe(inject(SessionToken).require, can('product:write')),
    async (ctx, id: string) => {
      await ctx.db.query(`DELETE product:${id}`)
    }
  )

  // ACTION — external side effects, calls external APIs, files, email, payment
  // CAN call mutations internally via ctx.run()
  importFromCSV = defineAction(
    pipe(inject(SessionToken).require, can('product:write')),
    async (ctx, fileId: string) => {
      const file  = await ctx.storage.get(fileId)
      const rows  = await parseCSV(file)

      // calls mutation internally — each write triggers LIVE SELECT
      // subscribers see products appear one by one as rows land
      for (const row of rows) {
        await ctx.run(this.create, row)
      }
    }
  )

  // Action that uses payment plugin
  checkout = defineAction(
    pipe(inject(SessionToken).require),
    async (ctx, orderId: string) => {
      const order = await ctx.db.query<Order>(`SELECT * FROM order:${orderId}`)
      await inject(CheckoutToken).initiate(ctx, {
        orderId,
        amount:      order.total,
        customerEmail: ctx.user.email,
      })
    }
  )
}
```

### 4.3 DI — Unchanged from Current Implementation

```ts
// register
@provide()
class ProductService { ... }

// retrieve
const svc = inject(ProductService)

// token-based (for plugin primitives)
const SessionT  = createToken<Session>('aromix:session')
const session   = inject(SessionT)

// register a value against a token
register(SessionT, session)
```

The existing DI implementation (`MetaKey`, `Registry`, `provide`, `inject`, `injectNew`, `register`) stays as-is. No changes needed there.

---

## 5. Pipe — Composition Model

`pipe()` composes middleware-style functions that run before the handler. Each step can throw to abort (returns an error WS message to client), or enrich `ctx`.

```ts
// Definition
type PipeStep = (ctx: Context) => void | Promise<void>

function pipe(...steps: PipeStep[]): PipeStep[]

// Built-in steps
inject(SessionToken).require    // throws 401 if not authenticated
can('product:write')            // throws 403 if RBAC fails
validate(Schema)                // throws 422 if input invalid, narrows type of args
paginate()                      // injects ctx.page, ctx.limit from args
```

```ts
// Usage in service method
create = defineMutation(
  pipe(
    inject(SessionToken).require,
    can('product:write'),
    validate(ProductInput),
  ),
  async (ctx, data: ProductInput) => {
    // if we're here: user is authed, has permission, data is valid
  }
)
```

Steps are imported once per project. Never re-implemented per method.

---

## 6. Client Proxy

### 6.1 Build-Time Generation

At build time, Aromix scans all `@provide()` classes and generates a proxy for each:

```ts
// __generated__/ProductService.proxy.ts  — never write this manually
import type { ProductService } from '../services/ProductService'
import { ws } from '@aromix/client'

export const ProductServiceProxy = {
  list:          ws.query<typeof ProductService.prototype.list>('ProductService.list'),
  get:           ws.query<typeof ProductService.prototype.get>('ProductService.get'),
  create:        ws.mutation<typeof ProductService.prototype.create>('ProductService.create'),
  update:        ws.mutation<typeof ProductService.prototype.update>('ProductService.update'),
  delete:        ws.mutation<typeof ProductService.prototype.delete>('ProductService.delete'),
  importFromCSV: ws.action<typeof ProductService.prototype.importFromCSV>('ProductService.importFromCSV'),
  checkout:      ws.action<typeof ProductService.prototype.checkout>('ProductService.checkout'),
}
```

### 6.2 inject() Context Switch

`inject(ProductService)` behaves differently based on context:

- **Server context (SSR, action handler):** returns the real class instance from DI registry
- **Client context (Sliz component):** returns the generated proxy — same interface, WS underneath

This switch is transparent. Components never know which one they got.

### 6.3 Proxy Reactive Shape

```ts
// ws.query() returns a reactive ref when called
const products = px.query('list', { category: 'shoes' })

products.data     // T[] | undefined — live, auto-updates
products.loading  // boolean
products.error    // string | undefined

// ws.mutation() / ws.action() return async functions
await px.mutation('create', { title: 'Nike', price: 120 })
await px.action('importFromCSV', fileId)
```

---

## 7. Sliz Component Integration

### 7.1 Public SSR Page (SEO)

```sliz
<!-- pages/ProductsPage.sliz -->
<script>
  const props    = defineProps({ category: String })
  const px       = inject(ProductService)

  // Server: runs query synchronously for SSR HTML
  // Client: opens WS subscription, becomes live
  const products = px.query('list', { category: props.category })
</script>

@if(products.loading) {
  <ProductGridSkeleton />
} @else if(products.error) {
  <ErrorMsg message={products.error} />
} @else {
  <div lay="grid cols:3 gap:4">
    @for(p of products.data) {
      <ProductCard item={p} />
    }
  </div>
}
```

```ts
// router — only exists for SSR pages
router.on('/products').render(ProductsPage)
router.on('/products/:id').render(ProductPage)
router.on('/blog/:slug').render(BlogPost)
router.on('/').render(Landing)
```

No handler logic on routes. Just "this URL → this component." Data comes from `inject()` inside the component.

### 7.2 Dashboard / Auth Page (No SSR needed)

```ts
// client router — Sliz handles these, no server route needed
createRouter({
  '/dashboard':       Dashboard,
  '/orders':          Orders,
  '/orders/:id':      OrderDetail,
  '/admin/products':  AdminProducts,
})
```

### 7.3 Full Interactive Component

```sliz
<!-- features/products/ProductsPage.sliz -->
<script>
  const props    = defineProps({ category: String })
  const px       = inject(ProductService)
  const view     = obs('grid')  // local UI state — grid vs list toggle

  const products = px.query('list', { category: props.category })

  async function handleCreate(e: SubmitEvent) {
    e.preventDefault()
    await px.mutation('create', formData(e.target))
    // no state update needed — LIVE SELECT fires, products.data updates automatically
  }

  async function handleDelete(id: string) {
    await px.mutation('delete', id)
  }

  async function handleImport(e: InputEvent) {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    const fileId = await uploadFile(file)
    await px.action('importFromCSV', fileId)
  }
</script>

<header lay="flex row spread align:center pad:4">
  <h1>Products</h1>
  <button onclick={() => view = view === 'grid' ? 'list' : 'grid'}>
    Toggle View
  </button>
</header>

<div lay={view === 'grid' ? 'grid cols:3 gap:4' : 'flex col gap:2'}>
  @if(products.loading) {
    <ProductGridSkeleton />
  } @else if(products.error) {
    <ErrorMsg message={products.error} />
  } @else {
    @for(p of products.data) {
      <ProductCard item={p} onDelete={handleDelete} />
    }
  }
</div>

<form onsubmit={handleCreate} lay="flex col gap:3 pad:4 border rounded">
  <input name="title"    placeholder="Title" />
  <input name="price"    placeholder="Price"  type="number" />
  <input name="category" placeholder="Category slug" />
  <button type="submit">Add Product</button>
</form>

<label lay="flex row gap:2 align:center">
  <span>Import CSV</span>
  <input type="file" accept=".csv" oninput={handleImport} />
</label>
```

---

## 8. Module System

### 8.1 One Model for Everything

There is no "plugin" vs "module" distinction. Everything is a module. External npm packages are just modules you install. Internal features are modules you write. Same API.

```ts
export const ProductModule = defineModule((mod) => {
  mod.service(ProductService)
  mod.router(productRouter)
  mod.hook({ on: 'Ready', run: seedProducts })
})
```

```ts
// external npm package — identical shape
export const AuthModule = defineModule<AuthOptions>((mod, options) => {
  const session = createSession({ secret: options.secret, maxAge: options.maxAge ?? '7d' })
  const auth    = createLocalAuth({ redirectTo: options.redirectTo ?? '/login' })

  mod.service(AuthService)
  mod.service(SessionService)
  mod.hook({ on: 'Request',    run: session.middleware })
  mod.hook({ on: 'WsConnect',  run: session.validateWs })
  mod.router(createAuthRouter({ auth, session }))

  // expose primitives to other modules via DI tokens
  mod.provide(SessionToken, session)
  mod.provide(AuthToken,    auth)
})
```

### 8.2 Module Surface vs App Surface

Modules receive a **restricted** surface. They cannot call `app.db()`, `app.listen()`, or `app.use()`.

```ts
// What a module can do
interface ModuleContext<O = void> {
  service(cls: Class):                    void
  router(router: Router):                 void
  hook(hook: Hook):                       void
  provide<T>(token: Token<T>, val: T):    void
}

// What only the app root can do
interface App extends ModuleContext {
  db(connection: DbConnection):           void   // one DB, root only
  assets(options: AssetsOptions):         void
  use<O>(module: Module<O>, opts?: O):    void   // install a module
  listen(port: number, cb?: Fn):          void
}
```

### 8.3 App Root

```ts
// app.ts — the only file that orchestrates everything
import { createApp }    from '@aromix/core'
import { surreal }      from '@aromix/surreal'
import { AuthModule }   from '@aromix/auth'
import { PaymentModule } from '@aromix/payment'
import { UserModule }   from './modules/users'
import { ProductModule } from './modules/products'
import { OrderModule }  from './modules/orders'

const app = createApp()

// plugins first — their tokens must be available when feature modules run
app.use(AuthModule,    { secret: env.SECRET, maxAge: '7d' })
app.use(PaymentModule, {
  provider:  sslcommerz({ storeId: env.SSL_ID, password: env.SSL_PASS }),
  onSuccess: async (ctx, data) => {
    await ctx.db.query(`UPDATE order:${data.orderId} SET status = 'paid'`)
  },
  onFail: async (ctx, data) => {
    await ctx.db.query(`UPDATE order:${data.orderId} SET status = 'failed'`)
  },
})

// feature modules
app.use(UserModule)
app.use(ProductModule)
app.use(OrderModule)

// infrastructure
app.db(surreal({ url: env.DB_URL, ns: 'prod', db: 'main' }))
app.assets({ path: './public', prefix: '/assets', cache: { maxAge: 86400, immutable: true } })

// app-level hooks
app.hook({ on: 'Request', run: (req) => console.log(`${req.method} ${new URL(req.url).pathname}`) })

app.listen(3000, () => console.log('ready on :3000'))
```

---

## 9. Hooks

```ts
export type Hook =
  | { on: 'Ready';        run: () => void | Promise<void> }
  | { on: 'Close';        run: () => void | Promise<void> }
  | { on: 'Request';      run: RequestHook }
  | { on: 'Response';     run: ResponseHook }
  | { on: 'Error';        run: ErrorHook }
  | { on: 'WsConnect';    run: (client: WsClient) => void | Promise<void> }
  | { on: 'WsDisconnect'; run: (client: WsClient) => void | Promise<void> }
  | { on: 'WsMessage';    run: (client: WsClient, msg: WsMessage) => void | Promise<void> }

// Hook types
type RequestHook  = (req: Request)                   => Response | void | Promise<Response | void>
type ResponseHook = (req: Request, res: Response)    => Response | void | Promise<Response | void>
type ErrorHook    = (err: unknown,  req: Request)     => Response | void | Promise<Response | void>

// WsClient shape
interface WsClient {
  id:       string
  user?:    AuthUser        // set after session.validateWs succeeds
  send:     (msg: WsMessage) => void
  close:    () => void
}
```

Execution order within `app.listen()`:

```
Ready hooks                    ← plugins init, DB warm, seeds
↓
Request hooks (per HTTP req)   ← session middleware, logging
↓
Route match → render component → SSR
↓
Response hooks
↓
GET /__ws → WsConnect hooks    ← session validation on upgrade
↓
WS message received → WsMessage hooks (pre-dispatch)
↓
query / mutation / action dispatch
↓
WsDisconnect hooks             ← cleanup subscriptions
```

---

## 10. App Internal Architecture (listen())

`listen()` sets up:

```
port 3000
  ├── GET /__ws              → WS upgrade handler
  │     └── per client: manages subscriptions, routes WS messages
  ├── /assets/*              → static file handler
  └── all other routes       → SSR route handler
        └── runs defineQuery server-side → renders Sliz component → returns HTML
```

### WS Subscription Manager (internal)

```ts
// Framework-internal — not part of public API
class SubscriptionManager {
  // clientId → Map<subId, { key, args, liveQueryId }>
  private subs = new Map<string, Map<string, Subscription>>()

  async subscribe(client: WsClient, key: string, args: unknown, subId: string) {
    const handler = resolveQuery(key)           // look up defineQuery by key
    const data    = await handler.run(ctx, args)
    client.send({ type: 'data', subId, data })  // initial result

    // open LIVE SELECT on the tables this query declared
    const liveId = await openLiveSelect(handler.tables, async () => {
      // fires when SurrealDB notifies a change on those tables
      const fresh = await handler.run(ctx, args)
      client.send({ type: 'data', subId, data: fresh })
    })

    this.subs.get(client.id)?.set(subId, { key, args, liveId })
  }

  unsubscribe(client: WsClient, subId: string) {
    const sub = this.subs.get(client.id)?.get(subId)
    if (sub) killLiveSelect(sub.liveId)
    this.subs.get(client.id)?.delete(subId)
  }

  cleanup(clientId: string) {
    const subs = this.subs.get(clientId)
    if (subs) for (const sub of subs.values()) killLiveSelect(sub.liveId)
    this.subs.delete(clientId)
  }
}
```

---

## 11. Auth Plugin Shape (`@aromix/auth`)

```ts
// installed by app — configures and exposes tokens
app.use(AuthModule, { secret: env.SECRET })

// your service uses tokens, never imports from @aromix/auth directly
@provide()
class OrderService {
  list = defineQuery(
    { tables: ['order'] },
    async (ctx, args) => {
      // ctx.user is set by session middleware — always available after require
      return ctx.db.query(`SELECT * FROM order WHERE userId = $userId`, { userId: ctx.user.id })
    }
  )

  create = defineMutation(
    pipe(inject(SessionToken).require),
    async (ctx, data) => {
      await ctx.db.query(`CREATE order CONTENT $data`, { data: { ...data, userId: ctx.user.id } })
    }
  )
}
```

Auth module also auto-registers routes:

```
POST /__auth/login     → local login, sets session
POST /__auth/logout    → clears session
GET  /__auth/google    → OAuth redirect
GET  /__auth/google/cb → OAuth callback
```

---

## 12. Payment Plugin Shape (`@aromix/payment`)

```ts
app.use(PaymentModule, {
  provider:  sslcommerz({ storeId: env.SSL_ID, password: env.SSL_PASS }),
  onSuccess: async (ctx, data) => {
    await ctx.db.query(`UPDATE order:${data.orderId} SET status = 'paid'`)
    // LIVE SELECT fires — any subscriber watching 'order' gets fresh data
  },
  onFail: async (ctx, data) => {
    await ctx.db.query(`UPDATE order:${data.orderId} SET status = 'failed'`)
  },
})

// registers automatically:
// POST /__payment/init
// GET  /__payment/success
// GET  /__payment/fail
// POST /__payment/webhook

// your service uses CheckoutToken
@provide()
class OrderService {
  pay = defineAction(
    pipe(inject(SessionToken).require),
    async (ctx, orderId: string) => {
      const order = await ctx.db.query<Order>(`SELECT * FROM order:${orderId}`)
      await inject(CheckoutToken).initiate(ctx, {
        orderId,
        amount:        order.total,
        customerEmail: ctx.user.email,
      })
    }
  )
}
```

---

## 13. RBAC Shape (`@aromix/auth` — included)

```ts
// configured once in auth module options
app.use(AuthModule, {
  secret: env.SECRET,
  policies: {
    'product:write': (user, resource?) =>
      user.role === 'admin' || resource?.ownerId === user.id,
    'order:view':    (user, resource?) =>
      user.role === 'admin' || resource?.userId === user.id,
    'admin:*':       (user) => user.role === 'admin',
  }
})

// used in pipe
create = defineMutation(
  pipe(inject(SessionToken).require, can('product:write')),
  async (ctx, data) => { ... }
)

// resource-level check
delete = defineMutation(
  pipe(
    inject(SessionToken).require,
    can('product:write', async (ctx, id: string) => {
      return ctx.db.query(`SELECT ownerId FROM product:${id}`)
    }),
  ),
  async (ctx, id: string) => { ... }
)
```

---

## 14. Admin Panel

Generated once via CLI. Outputs real editable Sliz files — not a runtime-generated locked panel.

```bash
aromix admin:generate
```

```
admin/
  layout/
    AdminLayout.sliz      ← edit for branding, nav
    Sidebar.sliz
  products/
    ProductList.sliz      ← edit if you need custom columns
    ProductForm.sliz      ← edit if you need custom fields
  orders/
    OrderList.sliz
    OrderForm.sliz
  users/
    UserList.sliz
    UserForm.sliz
```

Default look comes from Layos design tokens. Matches whatever visual language you've defined. Client gets `/admin`. Non-technical users manage data. You can edit any generated file without fighting the framework — they're just Sliz files that `inject()` the same service proxies.

---

## 15. Project Structure

```
myapp/
├── app.ts                         ← root — use(), db(), listen()
├── env.ts                         ← typed env vars
│
├── modules/
│   ├── products/
│   │   ├── ProductService.ts      ← defineQuery + defineMutation + defineAction
│   │   ├── ProductRouter.ts       ← SSR routes only
│   │   ├── schemas.ts             ← valibot schemas
│   │   ├── components/
│   │   │   ├── ProductsPage.sliz
│   │   │   ├── ProductCard.sliz
│   │   │   └── ProductForm.sliz
│   │   └── index.ts               ← defineModule(...)
│   │
│   ├── orders/
│   │   ├── OrderService.ts
│   │   ├── OrderRouter.ts
│   │   ├── components/
│   │   └── index.ts
│   │
│   └── users/
│       ├── UserService.ts
│       ├── components/
│       └── index.ts
│
├── admin/                         ← generated by aromix admin:generate, then yours
│   ├── layout/
│   ├── products/
│   └── orders/
│
├── public/                        ← static assets
│
└── __generated__/                 ← build output, never edit manually
    ├── ProductService.proxy.ts
    ├── OrderService.proxy.ts
    └── UserService.proxy.ts
```

---

## 16. Per-Project Setup Checklist

Starting a new template:

```
1. copy starter
2. app.ts — use() the plugins you need, configure them
3. define your models/schemas per module
4. write SSR routes for public pages
5. write services (queries + mutations + actions)
6. write Sliz components
7. run aromix admin:generate
8. customize admin/ files for client
9. ship
```

Auth, payment, RBAC, session — imported once, configured once, used everywhere via `inject()`. Never re-implemented.

---

## 17. What Does Not Exist in Aromix

- REST endpoints for your own frontend
- Controllers or separate route handlers for mutations
- Manual cache invalidation
- Loading state management (built into proxy reactive refs)
- `fetch()` calls in components
- Separate API layer
- JSON response shaping
- ORM with migrations (SurrealDB is schemaless by default, schemafull opt-in)
- File-system based routing
- Plugin vs module distinction
