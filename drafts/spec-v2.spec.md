# Aromix — Spec v2

**Status:** Pre-implementation, planning phase
**Replaces:** Aromix v1 (groups, actions, MessagePack, manual routing)
**Depends on:** Sliz (compiler, signals, directives, lifecycle), Layos (styling), MongoDB Node Driver

---

## What Changed and Why

Aromix v1 built an API layer — MessagePack encoding, GraphQL-style envelopes, action groups, explicit routing. This is the wrong abstraction for the majority of apps. Most apps are persistence + auth + display. Building a full API contract for that is unnecessary overhead.

Aromix v2 removes all of that and replaces it with a hypermedia-first model. The server renders HTML. The client patches it into the DOM. Model methods are the only API surface. No separate controllers, no action groups, no encoding layer, no manual routes.

**Removed:**
- `@group()` decorator
- `@action()` decorator
- MessagePack encoding
- GraphQL-style response envelope
- Manual route registration for actions
- `send()` / `receive()` primitives

**Kept:**
- `@provide()` DI decorator
- `inject()` resolution
- Plugin system (`make()`, `serve()`, plugin `install()`)
- `Model<TDoc>` base class and MongoDB adapter

**Added:**
- `/__rpc` server endpoint
- Client proxy codegen
- `call:*` directive runtime
- `fragments()` server helper
- `patch:html` Sliz directive
- `skeleton-pulse` in-flight convention

---

## Stack Overview

```
aromix/
├── core/          — DI, plugin system, make(), serve()
├── mongo/         — Model<TDoc>, MongoDBAdapter, mongoDb() plugin
└── rpc/           — /__rpc handler, fragments(), codegen, client transport

sliz/
├── compiler/      — .sliz → ESM, inject() rewrite, call:* passthrough
├── client/        — boot(), directive runtime, MutationObserver
└── directives/    — skeleton (built-in)

layos/             — lay="" styling (unchanged)
```

---

## 1. Services

Any `@provide()` class is a service. Models are one kind of service. Redis caching, auth, email, queues — all the same pattern. No distinction at the framework level.

```ts
// a model — source of truth for a collection
@provide()
export class UserModel extends Model<UserDoc> {
  indexes() {
    return [
      { fields: { email: 1 }, unique: true },
      { fields: { createdAt: -1 } },
    ]
  }

  hooks() {
    this.beforeInsert(doc => {
      doc.password  = hash(doc.password)
      doc.createdAt = new Date()
    })
  }

  // custom repo method — service layer lives here too
  findByEmail(email: string) {
    return this.first({ email })
  }
}

// a non-model service — same pattern, no DB
@provide()
export class CacheService {
  private client = new Redis(process.env.REDIS_URL!)

  async get(key: string)                  { return this.client.get(key) }
  async set(key: string, val: string, ttl = 60) { return this.client.setex(key, ttl, val) }
  async del(key: string)                  { return this.client.del(key) }
}

@provide()
export class AuthService {
  constructor(private users: UserModel) {}

  async login(email: string, password: string): Promise<string> {
    const user = await this.users.findByEmail(email)
    if (!user || !verify(password, user.password)) throw new Error("Invalid credentials")
    return signJwt({ id: user._id })
  }
}
```

Services inject other services via constructor. DI resolves the graph.

---

## 2. RPC — The Bridge

### Concept

Model methods (and any service method) return HTML strings. The client calls them through a transparent proxy. The server executes the real method, returns HTML, the client patches it into the DOM. No JSON. No state. No fetch boilerplate.

```ts
// server
@provide()
export class UserModel extends Model<UserDoc> {

  async list(): Promise<string> {
    const users = await this.find({})
    return UserTable({ users })          // returns HTML
  }

  async delete(id: string): Promise<string> {
    await this.deleteById(id)
    const users = await this.find({})
    return UserTable({ users })          // returns updated HTML
  }

  async create(data: Pick<UserDoc, "email" | "name">): Promise<string> {
    const exists = await this.first({ email: data.email })
    if (exists) return fragments({
      "#form-feedback": FormFeedback({ error: "Email already in use" }),
    })

    await this.insertOne(data)
    const users = await this.find({})
    return fragments({
      "#form-feedback": FormFeedback({ success: "User created" }),
      "#user-table":    UserTable({ users }),
    })
  }
}
```

### What Is Callable

Any `public` method that does not start with `_` and is not in the Model base class reserved list is callable from the client. Internal helpers get `_` prefix by convention. There is no explicit opt-in decorator — the convention is the contract. If a method is public and unprefixed, the developer intends it to be callable.

Reserved base class methods (never callable):
```
find, first, findById, insertOne, insertMany,
update, updateById, delete, deleteById,
count, exists, aggregate, collection,
indexes, hooks, seed, _initialize, _ensureIndexes
```

### Server Handler

**Route:** `POST /__rpc`
**Request:** `application/json`
**Response:** `text/html` always — including errors

```ts
// aromix/rpc/server.ts

interface RpcRequest {
  model:  string
  method: string
  args:   unknown[]
}

// registered by rpc() plugin inside make()
app.router.post("/__rpc", async (ctx) => {
  const { model, method, args } = ctx.body as RpcRequest

  const instance = ctx.container.resolve(model)

  if (
    !instance ||
    typeof instance[method] !== "function" ||
    method.startsWith("_") ||
    RESERVED.has(method)
  ) {
    return ctx.reply({
      status:  200,
      body:    ErrorBanner({ message: "Not callable" }),
      headers: { "Content-Type": "text/html" },
    })
  }

  try {
    const html = await instance[method].apply(instance, args)
    return ctx.reply({
      status:  200,
      body:    html,
      headers: { "Content-Type": "text/html" },
    })
  } catch (err) {
    ctx.logger.error("RPC error", { model, method, error: err })
    return ctx.reply({
      status:  200,
      body:    ErrorBanner({ message: "Something went wrong" }),
      headers: { "Content-Type": "text/html" },
    })
  }
})
```

Everything is `200 text/html`. The client never branches on status. Errors are HTML — the server decides what they look like.

### `fragments()` — Multi-Zone Responses

When a method needs to patch more than one DOM zone in one response:

```ts
// aromix/rpc/fragments.ts

export function fragments(map: Record<string, string>): string {
  return Object.entries(map)
    .map(([target, html]) =>
      `<rpc-fragment target="${target}">${html}</rpc-fragment>`
    )
    .join("")
}
```

The client runtime parses `<rpc-fragment target="...">` tags and patches each target independently.

### `ctx` In Service Methods

Services that need request context (current user, params, etc.) get it via `this.ctx`:

```ts
abstract class Service {
  protected ctx!: AromixCtx

  _bindCtx(ctx: AromixCtx): this {
    this.ctx = ctx
    return this
  }
}

// dispatcher calls _bindCtx before invoking the method
const html = await instance._bindCtx(ctx)[method](...args)

// usage in service method
async create(data: Partial<UserDoc>): Promise<string> {
  if (!this.ctx.user?.isAdmin) return ErrorBanner({ message: "Forbidden" })
  await this.insertOne(data)
  ...
}
```

---

## 3. Client Proxy

### Codegen

At build time, Aromix scans registered services and generates one proxy module per service. Only the TypeScript interface is generated per-method — the runtime proxy is a single `Proxy` object that handles all methods dynamically.

```ts
// AUTO-GENERATED — do not edit
// aromix/rpc/generated/UserModel.client.ts

import { call } from "@aromix/rpc/client"

// interface extracted from server class — types only, no runtime cost
type UserModelRpc = {
  [K in keyof UserModel
    as UserModel[K] extends (...a: any[]) => Promise<string> ? K : never
  ]: UserModel[K]
}

// single Proxy — handles all methods
// returns a descriptor string, not a Promise
// the directive runtime or call() parses the descriptor and fires the actual request
export const userModel = new Proxy({} as UserModelRpc, {
  get: (_, method: string) =>
    (...args: unknown[]) =>
      `__rpc:UserModel:${method}:${btoa(JSON.stringify(args))}`
})
```

The proxy returns a **descriptor string** — not a live Promise. This is intentional. When used as a directive value (`call:onload={userModel.getAll()}`), the expression evaluates to a string that gets set as an HTML attribute. The directive runtime parses it and fires the actual fetch at the right time.

When used imperatively inside a component script, `call()` parses the descriptor:

```ts
// component script
const html = await call(userModel.getAll())   // call() accepts descriptor string
document.querySelector("#table").innerHTML = html
```

### Transport

```ts
// aromix/rpc/client.ts

const inflight = new Map<string, Promise<string>>()

export async function call(descriptor: string): Promise<string> {
  const [, model, method, encoded] = descriptor.split(":")
  const args = JSON.parse(atob(encoded))
  const key  = `${model}:${method}:${encoded}`

  // deduplicate identical in-flight requests
  if (inflight.has(key)) return inflight.get(key)!

  const req = fetch("/__rpc", {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({ model, method, args }),
  }).then(r => r.text())

  inflight.set(key, req)
  req.finally(() => inflight.delete(key))
  return req
}
```

---

## 4. Directive Runtime

### `call:*` Directives

Directives that trigger RPC calls from HTML. Work in plain server-rendered HTML and inside Sliz components equally.

| Directive | Fires when | Default target |
|---|---|---|
| `call:onload` | element mounts | self |
| `call:onclick` | element clicked | `call:target` or self |
| `call:onsubmit` | form submitted | `call:target` or self |
| `call:oninput` | input changes | `call:target` or self |
| `call:target` | — | target selector(s), comma-separated |
| `call:debounce` | — | ms to debounce `oninput` |

```sliz
<!-- loads on mount, patches self -->
<div call:onload={userModel.list()} id="user-table">
  <TableSkeleton />
</div>

<!-- click patches a different target -->
<button call:onclick={userModel.delete(user._id)} call:target="#user-table">
  Delete
</button>

<!-- form serializes and patches two targets -->
<form call:onsubmit={userModel.create} call:target="#form-feedback, #user-table">
  ...
</form>

<!-- live search, debounced -->
<input call:oninput={userModel.search} call:target="#user-table" call:debounce="300" name="query" />
```

### Boot + Event Delegation

```ts
// sliz/client/boot.ts

export function boot(root: Element = document.body) {
  // fire onload directives on existing elements
  root.querySelectorAll("[call\\:onload]").forEach(el => trigger(el, "onload"))

  // watch for server-patched HTML — re-run boot on new nodes
  new MutationObserver(mutations => {
    for (const m of mutations)
      m.addedNodes.forEach(node => {
        if (node instanceof Element) boot(node)
      })
  }).observe(root, { childList: true, subtree: true })

  // single delegated listener per event type
  document.addEventListener("click", e => {
    const el = (e.target as Element).closest("[call\\:onclick]")
    if (el) trigger(el, "onclick", e)
  })

  document.addEventListener("submit", e => {
    const el = (e.target as Element).closest("[call\\:onsubmit]")
    if (!el) return
    e.preventDefault()
    trigger(el, "onsubmit", e)
  })

  document.addEventListener("input", e => {
    const el = (e.target as Element).closest("[call\\:oninput]")
    if (el) debouncedTrigger(el, "oninput", e)
  })
}

document.addEventListener("DOMContentLoaded", () => boot())
```

### Trigger + Patch

```ts
// sliz/client/directives.ts

const timers = new Map<Element, ReturnType<typeof setTimeout>>()

function debouncedTrigger(el: Element, event: string, e: Event) {
  const ms = parseInt(el.getAttribute("call:debounce") ?? "0")
  if (!ms) return trigger(el, event, e)
  clearTimeout(timers.get(el))
  timers.set(el, setTimeout(() => trigger(el, event, e), ms))
}

async function trigger(el: Element, event: string, e?: Event) {
  const descriptor = el.getAttribute(`call:${event}`)!
  const targets    = resolveTargets(el)

  // parse descriptor — merge form/input data into args if needed
  const { model, method, args } = parseDescriptor(descriptor, el, e)

  // pulse targets while in-flight
  targets.forEach(t => t.classList.add("skeleton-pulse"))

  const html = await call(`__rpc:${model}:${method}:${btoa(JSON.stringify(args))}`)

  targets.forEach(t => t.classList.remove("skeleton-pulse"))
  applyResponse(html, targets)
}

function resolveTargets(el: Element): Element[] {
  const attr = el.getAttribute("call:target")
  if (!attr) return [el]
  return attr.split(",").map(sel => {
    const s = sel.trim()
    // scoped — prefer nearest [scope] ancestor before global querySelector
    return el.closest("[scope]")?.querySelector(s)
      ?? document.querySelector(s)
      ?? el
  })
}

function parseDescriptor(descriptor: string, el: Element, e?: Event) {
  const [, model, method, encoded] = descriptor.split(":")
  let args = JSON.parse(atob(encoded))

  if (e instanceof SubmitEvent) {
    const form = el as HTMLFormElement
    args = [Object.fromEntries(new FormData(form))]
  }

  if (e instanceof InputEvent) {
    const input = el as HTMLInputElement
    args = [input.value]
  }

  return { model, method, args }
}

function applyResponse(html: string, targets: Element[]) {
  const tmp = document.createElement("div")
  tmp.innerHTML = html

  const frags = tmp.querySelectorAll("rpc-fragment[target]")

  if (frags.length) {
    // multi-fragment — each frag patches its own target
    frags.forEach(frag => {
      const sel    = frag.getAttribute("target")!
      const target = document.querySelector(sel)
      if (target) target.innerHTML = frag.innerHTML
    })
  } else {
    // single response — patch all resolved targets
    targets.forEach(t => t.innerHTML = html)
  }
}
```

---

## 5. Loading State Convention

There are no loading/error signals. The element's existing children are the loading state. The `skeleton-pulse` class is applied to the target while a call is in-flight — giving a visual pulse to whatever content is already there (skeleton components, placeholder text, previous content).

```sliz
<!-- skeleton children show immediately -->
<!-- skeleton-pulse applied to div while call:onload is in-flight -->
<!-- real content patches in when server responds -->
<div call:onload={userModel.list()} id="user-table">
  <TableSkeleton />
</div>
```

```css
/* sliz/client/skeleton.css */
.skeleton-pulse {
  animation: pulse 1.5s ease-in-out infinite;
  pointer-events: none;
}

@keyframes pulse {
  0%, 100% { opacity: 1 }
  50%       { opacity: 0.4 }
}
```

Error HTML comes from the server. The client treats it like any other patch — it just lands in the target. No client-side error boundary needed.

---

## 6. Sliz Integration

### `inject()` Rewrite at Compile Time

When the Sliz compiler encounters `inject(SomeService)` in a component `<script>` block, it rewrites the import for the browser:

```ts
// source (.sliz script block)
const userModel = inject(UserModel)

// compiled output (browser ESM)
import { userModel } from "@aromix/rpc/generated/UserModel.client"
```

Server-side render paths keep the real `inject()`. Client paths get the proxy. Same component code, different resolution depending on target.

### `patch:html` Directive

Built-in Sliz directive. Sets `innerHTML` from a signal or expression. Used when a component holds HTML returned from an imperative `call()`:

```sliz
<script>
  const userModel = inject(UserModel)
  const html      = obs("")

  onMount(async () => {
    html.set(await call(userModel.list()))
  })
</script>

<div patch:html={html} />
```

### Lifecycle Hooks

```ts
onMount(fn: () => void | (() => void))
// runs after component is in DOM
// return value is cleanup — called on unmount

onUnmount(fn: () => void)
// runs before component removed from DOM

onPatch(fn: (el: Element) => void)
// runs after server HTML lands inside this component's subtree
// use for: reinitializing third-party libs, re-running entrance animations
```

### Component Example

```sliz
export component UsersPage {
  <script>
    const userModel = inject(UserModel)
    const query     = obs("")
  </script>

  <div lay="flex col gap:4 pad:6">

    <header lay="flex row spread">
      <h1 lay="text:2xl font:bold">Users</h1>
      <input
        lay="border pad:2 round"
        oninput={e => query.set(e.target.value)}
        call:oninput={userModel.search(query)}
        call:target="#user-table"
        call:debounce="300"
        placeholder="Search..."
      />
    </header>

    <div call:onload={userModel.list()} id="user-table" lay="w:full">
      <TableSkeleton />
    </div>

    <form
      call:onsubmit={userModel.create}
      call:target="#form-feedback, #user-table"
      lay="flex col gap:2"
    >
      <div id="form-feedback"></div>
      <input name="name"  placeholder="Name"  required lay="border pad:2 round" />
      <input name="email" placeholder="Email" required lay="border pad:2 round" />
      <button type="submit" lay="bg:primary fg:white pad:2,4 round click:ripple">
        Add User
      </button>
    </form>

  </div>
}
```

---

## 7. App Setup

```ts
// server.ts
import { make }      from "aromix/core"
import { serve }     from "aromix/node"
import { mongoDb }   from "aromix/mongo"
import { rpc }       from "aromix/rpc"
import { UserModel } from "#models/UserModel"
import { CacheService } from "#services/CacheService"
import { AuthService }  from "#services/AuthService"

const app = make({
  plugins: [
    mongoDb({
      uri:    process.env.MONGODB_URI!,
      models: [UserModel],
    }),
    rpc({
      services: [UserModel, CacheService, AuthService],
    }),
  ]
})

serve(app).listen(3000)
```

`rpc()` plugin does three things:
1. Registers the `/__rpc` route handler
2. Runs codegen — emits `generated/*.client.ts` for each listed service
3. Serves generated files as ESM at `/@aromix/rpc/generated/*`

---

## 8. MongoDB ORM

Specified separately in `model.md` — that document is the canonical source of truth for `@aromix/mongo`. Do not modify it as part of this spec. Covers `mongoDb()` plugin, `Model<TDoc>` base class, `MongoDBAdapter`, `ModelDoc<T>` type helper, `defineSchema`, hook system, repository methods, query builder, seeder, and sync API.

---

## 9. Implementation Order

```
Phase 1 — RPC server
  aromix/rpc/server.ts        /__rpc route, dispatch, error wrapping
  aromix/rpc/fragments.ts     fragments() helper

Phase 2 — Client transport
  aromix/rpc/client.ts        call(), inflight dedup
  aromix/rpc/codegen.ts       interface + Proxy emitter
  aromix/rpc/plugin.ts        rpc() plugin, codegen runner, ESM serving

Phase 3 — Directive runtime
  sliz/client/boot.ts         boot(), MutationObserver, event delegation
  sliz/client/directives.ts   trigger(), parseDescriptor(), applyResponse()
  sliz/client/skeleton.css    skeleton-pulse keyframes

Phase 4 — Sliz compiler additions
  inject() rewrite → client proxy import
  call:* attributes passthrough (no compile step — left as attributes)
  patch:html directive

Phase 5 — MongoDB ORM
  aromix/mongo/adapter.ts     MongoDBAdapter
  aromix/mongo/model.ts       Model<TDoc> base class + repo methods
  aromix/mongo/hooks.ts       beforeInsert/Update/Delete
  aromix/mongo/plugin.ts      mongoDb() plugin, index ensurance

Phase 6 — DX
  ctx binding (_bindCtx)
  scoped target resolution (scope attribute)
  error banner default component
  skeleton-pulse CSS shipping with client package
```

---

## 10. Constraints

| Rule | Reason |
|---|---|
| Server always returns `text/html` | Client has one code path — patch innerHTML |
| HTTP status always `200` | Errors are HTML, not status codes |
| No client loading/error state | Server renders those states, client patches them |
| No JSON on the RPC path | Removes the data→render step from the client entirely |
| Services are `@provide()` classes | Consistent DI, testable, no global state |
| Methods callable by convention not decorator | Less boilerplate, convention is the contract |
| `_` prefix = server-only | One character, zero ceremony |
| MutationObserver re-runs boot | Server-patched HTML with new directives just works |
| Dedup in-flight requests | Multiple `call:onload` on same call = one request |
| `fragments()` for multi-zone | One server response patches N DOM zones |