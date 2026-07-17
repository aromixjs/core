# Aromix — Blueprint 04: make() and serve()

**Feature:** `make()`, `serve()`, `AromixApp`, `DispatchMap`
**Package:** `@aromix/core` (make), `aromix/node`, `aromix/bun`, `aromix/deno` (serve)
**Status:** Pre-implementation, pending review
**Depends on:** Blueprint 01 (DI), Blueprint 02 (@namespace, @action), Blueprint 03 (Middleware)

---

## Purpose

`make()` and `serve()` are the two final assembly steps that turn decorator metadata into a running HTTP server.

`make()` reads everything registered by decorators — namespaces, actions, middleware — and produces a single plain object called `AromixApp`. It does no I/O, starts nothing, and has no side effects beyond building that object.

`serve()` receives the `AromixApp` object and connects it to a real HTTP runtime. It is responsible for starting and stopping the server, normalizing incoming requests, running the middleware chain, calling handlers, and writing responses. All I/O happens here.

The split is intentional. `make()` is runtime-agnostic — the same call works identically on Node, Bun, and Deno. `serve()` is the only place that knows which runtime it is on.

---

## Public API

### `make()`

```ts
function make(options?: MakeOptions): AromixApp;
```

**MakeOptions — EXTENSIBLE:**

```ts
export interface MakeOptions {
  /**
   * Global middleware. Runs before namespace and action middleware
   * for every action in the application.
   */
  middleware?: Middleware[];

  /**
   * The @namespace classes that make up this application.
   * Passed explicitly — there is no auto-scanning.
   * make() instantiates each class with new ctor() directly.
   */
  namespaces?: Function[];

  /**
   * Independent sub-applications. Actions are merged into the
   * parent dispatch map prefixed by actionPrefix.
   * Sub-app middleware does not affect the parent.
   */
  subApps?: SubAppEntry[];

  /**
   * The single HTTP endpoint path all POST requests must target.
   * Default: '/api'
   */
  endpoint?: string;
}

export interface SubAppEntry {
  app: AromixApp;
  actionPrefix: string;
}
```

Basic usage:

```ts
import { make } from "@aromix/core";

const app = make({
  middleware: [requireHttps()],
  namespaces: [AuthHandler, UserHandler, PostHandler],
});
```

With sub-apps:

```ts
const adminApp = make({
  middleware: [guard(), adminOnly()],
  namespaces: [AdminUserHandler, AdminPostHandler],
});

const app = make({
  middleware: [requireHttps()],
  namespaces: [AuthHandler, UserHandler],
  subApps: [{ app: adminApp, actionPrefix: "admin" }],
});

// Resulting action keys:
// 'auth:login', 'auth:logout'
// 'user:list', 'user:create'
// 'admin:user:list', 'admin:user:remove'   <- prefixed by actionPrefix
```

---

### `serve()`

LOCKED — Identical signature exported from all three runtime adapter packages.

```ts
// import from aromix/node, aromix/bun, or aromix/deno
function serve(app: AromixApp): ServeInstance;
```

```ts
export interface ServeInstance {
  /**
   * Bind to a port and start accepting requests.
   * The callback fires once the server is ready.
   * Use it for startup logic — DB connections, env validation, etc.
   */
  listen: (port: number, callback?: () => void | Promise<void>) => ServeInstance;

  /**
   * Gracefully stop the server.
   * Waits for in-flight requests to complete before closing.
   */
  close: () => Promise<void>;
}
```

```ts
import { make } from "@aromix/core";
import { serve } from "aromix/node";

const app = make({
  middleware: [requireHttps()],
  namespaces: [AuthHandler, UserHandler],
});

serve(app).listen(3000, async () => {
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is required.");
  await inject(Database).client.$connect();
  console.log("Server ready on port 3000");
});
```

---

## Stability

| Symbol              | Tier       |
| ------------------- | ---------- |
| `make()`            | LOCKED     |
| `MakeOptions`       | EXTENSIBLE |
| `SubAppEntry`       | EXTENSIBLE |
| `AromixApp`         | LOCKED     |
| `DispatchMap`       | INTERNAL   |
| `DispatchEntry`     | INTERNAL   |
| `serve()` signature | LOCKED     |
| `ServeInstance`     | EXTENSIBLE |

---

## The AromixApp Object

LOCKED — This is the contract between `make()` and every runtime adapter.

```ts
export interface AromixApp {
  readonly endpoint: string;
  readonly dispatch: DispatchMap;
}

export type DispatchMap = Map<string, DispatchEntry>;

// INTERNAL — adapters never access this directly
export interface DispatchEntry {
  action: string;
  middleware: ReadonlyArray<Middleware>;
  handler: (ctx: RawContext) => Promise<HandlerReturn>;
  streaming: boolean;
}
```

`AromixApp` is a plain object — no class instances, no methods. The only functions it contains are the pre-bound handler functions inside dispatch entries. Everything adapters need to process a request is in the dispatch map.

**What it looks like after make():**

```ts
// make({ middleware: [requireHttps()], namespaces: [AuthHandler, UserHandler] })

{
  endpoint: '/api',
  dispatch: Map {
    'auth:login' => {
      action:     'auth:login',
      middleware: [
        { name: 'requireHttps', run: [Function] },   // global
      ],
      handler:    [Function: bound login],
      streaming:  false,
    },
    'user:list' => {
      action:     'user:list',
      middleware: [
        { name: 'requireHttps', run: [Function] },   // global
        { name: 'guard',        run: [Function] },   // namespace
      ],
      handler:    [Function: bound list],
      streaming:  false,
    },
    'user:remove' => {
      action:     'user:remove',
      middleware: [
        { name: 'requireHttps', run: [Function] },   // global
        { name: 'guard',        run: [Function] },   // namespace
        { name: 'adminOnly',    run: [Function] },   // action
      ],
      handler:    [Function: bound remove],
      streaming:  false,
    },
  }
}
```

---

## make() — Internal Implementation

### Step 1 — Validate options

```ts
function make(options: MakeOptions = {}): AromixApp {
  const {
    middleware: globalMiddleware = [],
    namespaces = [],
    subApps    = [],
    endpoint   = '/api',
  } = options

  if (!endpoint.startsWith('/')) {
    throw new Error(`[aromix] make(): endpoint must start with '/'. Got: '${endpoint}'`)
  }
```

### Step 2 — Validate every namespace class

```ts
for (const ctor of namespaces) {
  if (!namespaceRegistry.has(ctor)) {
    throw new Error(`[aromix] make(): ${(ctor as any).name} is not decorated with @namespace().`);
  }
}
```

### Step 3 — Detect duplicate namespace prefixes

```ts
const seenPrefixes = new Map<string, string>();

for (const ctor of namespaces) {
  const entry = namespaceRegistry.get(ctor)!;
  if (seenPrefixes.has(entry.prefix)) {
    throw new Error(
      `[aromix] make(): duplicate namespace prefix '${entry.prefix}' — ` +
        `found on ${seenPrefixes.get(entry.prefix)} and ${(ctor as any).name}.`
    );
  }
  seenPrefixes.set(entry.prefix, (ctor as any).name);
}
```

### Step 4 — Build the dispatch map

```ts
const dispatch: DispatchMap = new Map();

for (const ctor of namespaces) {
  const nsEntry = namespaceRegistry.get(ctor)!;
  const actions = actionRegistry.get(ctor) ?? [];

  if (actions.length === 0) {
    console.warn(`[aromix] make(): @namespace('${nsEntry.prefix}') has no @action methods.`);
  }

  // make() instantiates namespace classes directly — not through inject()
  const instance = new (ctor as any)();

  for (const actionEntry of actions) {
    const fullKey = `${nsEntry.prefix}:${actionEntry.name}`;

    if (dispatch.has(fullKey)) {
      throw new Error(`[aromix] make(): duplicate action key '${fullKey}'.`);
    }

    // Merge middleware chain once — global first, then namespace, then action
    const mergedChain: Middleware[] = [...globalMiddleware, ...nsEntry.middleware, ...actionEntry.middleware];

    // Detect duplicate middleware names within the merged chain
    const seenNames = new Set<string>();
    for (const mw of mergedChain) {
      if (seenNames.has(mw.name)) {
        throw new Error(`[aromix] make(): duplicate middleware name '${mw.name}' in chain for '${fullKey}'.`);
      }
      seenNames.add(mw.name);
    }

    // Handler is pre-bound to the instance
    // serve() calls entry.handler(ctx) with no additional binding
    const handler = (_ctx: RawContext): Promise<HandlerReturn> => (instance as any)[actionEntry.methodKey]();

    dispatch.set(fullKey, {
      action: fullKey,
      middleware: Object.freeze(mergedChain),
      handler,
      streaming: false, // runtime detects from return value — see Section below
    });
  }
}
```

### Step 5 — Merge sub-apps

```ts
  for (const { app: subApp, actionPrefix } of subApps) {
    if (!/^[a-z][a-z0-9_-]*$/.test(actionPrefix)) {
      throw new Error(
        `[aromix] make(): invalid subApp actionPrefix '${actionPrefix}'. ` +
        `Must match /^[a-z][a-z0-9_-]*$/.`
      )
    }

    for (const [key, entry] of subApp.dispatch) {
      const prefixedKey = `${actionPrefix}:${key}`

      if (dispatch.has(prefixedKey)) {
        throw new Error(
          `[aromix] make(): sub-app action '${prefixedKey}' conflicts with an existing action.`
        )
      }

      dispatch.set(prefixedKey, entry)
    }
  }

  return Object.freeze({ endpoint, dispatch })
}
```

---

## Streaming Detection

The `streaming` flag on `DispatchEntry` is informational — used by the dev panel and compiler. At runtime, `serve()` detects streaming by checking the `_type` field on the handler's return value after it resolves:

```ts
const result = await runMiddlewareChain(entry.middleware, rawCtx, entry.handler);

if (result._type === "stream") {
  // write streaming response
} else {
  // write reply response
}
```

This means the `streaming` flag in the dispatch entry does not need to be correct for the server to function — it is a documentation hint only. The runtime always trusts the actual return value.

---

## serve() — Request Pipeline

This is the full lifecycle of a request inside `serve()`, from the moment it arrives to the moment the response is written.

```
Incoming HTTP request
  |
  +--> Is method POST and path === app.endpoint?
  |      No  --> write 404 { error: 'Not found' }
  |      Yes --> continue
  |
  +--> Read X-Action header
  |      Missing or empty --> write 400 { error: 'Missing X-Action header' }
  |
  +--> Parse JSON body
  |      Malformed --> write 400 { error: 'Invalid JSON body' }
  |
  +--> Parse Cookie header into Record<string, string>
  |
  +--> Extract client IP from socket
  |
  +--> Look up action in app.dispatch   [O(1) Map lookup]
  |      Not found --> write 404 { error: 'Unknown action', action: string }
  |
  +--> Build RawContext { body, headers, cookies, ip, action }
  |
  +--> ctxStorage.run(rawCtx, ...)   [AsyncLocalStorage — makes ctx available to input()]
  |
  +--> runMiddlewareChain(entry.middleware, rawCtx, entry.handler)
  |      Middleware runs in order: global → namespace → action
  |      Any middleware may throw reply() to short-circuit
  |      Handler calls input() which reads from ctxStorage and validates
  |      Handler returns ReplyValue or StreamValue
  |
  +--> Error boundary
  |      isReplyValue(e)  --> send that status + body
  |      unknown error    --> log it + send 500 { error: 'Internal server error' }
  |
  +--> Write response to socket
         ReplyValue  --> status + JSON body
         StreamValue --> SSE headers + streaming fn
```

---

## serve() — Internal Implementation

The implementation differs per runtime but follows identical logic. Only the HTTP server APIs differ.

### Normalized Request

Before any framework logic runs, the adapter normalizes the runtime request into this shape:

```ts
// INTERNAL
export interface NormalizedRequest {
  method: string;
  path: string;
  action: string; // from X-Action header
  headers: Record<string, string | string[] | undefined>;
  cookies: Record<string, string>;
  body: unknown; // already JSON-parsed
  ip: string;
}
```

### Node Adapter

```ts
// packages/adapter-node/src/index.ts
import { createServer } from "node:http";

export function serve(app: AromixApp): ServeInstance {
  const server = createServer(async (req, res) => {
    await handleRequest(app, req, res);
  });

  const instance: ServeInstance = {
    listen: (port, cb) => {
      server.listen(port, async () => {
        await cb?.();
      });
      return instance;
    },
    close: () => new Promise((resolve) => server.close(() => resolve())),
  };

  return instance;
}
```

### Bun Adapter

```ts
// packages/adapter-bun/src/index.ts
export function serve(app: AromixApp): ServeInstance {
  let server: ReturnType<typeof Bun.serve>;

  const instance: ServeInstance = {
    listen: (port, cb) => {
      server = Bun.serve({
        port,
        fetch: async (req) => buildBunResponse(app, req),
      });
      cb?.();
      return instance;
    },
    close: async () => {
      server.stop(true);
    },
  };

  return instance;
}
```

### Deno Adapter

```ts
// packages/adapter-deno/src/index.ts
export function serve(app: AromixApp): ServeInstance {
  let controller: Deno.HttpServer;

  const instance: ServeInstance = {
    listen: (port, cb) => {
      controller = Deno.serve({ port }, async (req) => buildDenoResponse(app, req));
      cb?.();
      return instance;
    },
    close: async () => {
      await controller.shutdown();
    },
  };

  return instance;
}
```

---

## Error Boundary

Wraps every request. Lives inside `serve()`, not in `make()`.

```ts
async function processRequest(app: AromixApp, rawReq: NormalizedRequest): Promise<NormalizedResponse> {
  // 1. Validate method and path
  if (rawReq.method !== "POST" || rawReq.path !== app.endpoint) {
    return errorResponse(404, { error: "Not found" });
  }

  // 2. Validate action header
  if (!rawReq.action) {
    return errorResponse(400, { error: "Missing X-Action header" });
  }

  // 3. Dispatch lookup
  const entry = app.dispatch.get(rawReq.action);
  if (!entry) {
    return errorResponse(404, { error: "Unknown action", action: rawReq.action });
  }

  // 4. Build RawContext
  const rawCtx: RawContext = {
    body: rawReq.body,
    headers: rawReq.headers,
    cookies: rawReq.cookies,
    ip: rawReq.ip,
    action: rawReq.action,
  };

  // 5. Run chain inside error boundary
  try {
    const result = await ctxStorage.run(rawCtx, () => runMiddlewareChain(entry.middleware, rawCtx, entry.handler));
    return toNormalizedResponse(result);
  } catch (e) {
    if (isReplyValue(e)) {
      return { type: "reply", status: e.status, body: e.body, headers: jsonHeaders };
    }
    // Unknown error — never expose internals to client
    console.error("[aromix] unhandled error in action", rawCtx.action, e);
    return { type: "error", status: 500, body: { error: "Internal server error" }, headers: jsonHeaders };
  }
}
```

**Rule:** The client never receives stack traces or internal error details. The 500 body is always exactly `{ error: 'Internal server error' }`.

---

## Streaming Response Handling

When a handler returns a `StreamValue`, `serve()` sets SSE headers and begins streaming:

```ts
function writeStreamResponse(res, streamValue: StreamValue) {
  res.writeHead(200, {
    "Content-Type": streamValue.options?.contentType ?? "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  const emit = (data: unknown) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // Call the stream function — it returns an optional cleanup fn
  const cleanup = streamValue.fn(emit);

  // Heartbeat to keep connection alive
  let heartbeat: ReturnType<typeof setInterval> | undefined;
  if (streamValue.options?.heartbeat) {
    heartbeat = setInterval(() => res.write(": ping\n\n"), streamValue.options.heartbeat);
  }

  // Cleanup when client disconnects
  res.on("close", () => {
    clearInterval(heartbeat);
    cleanup?.();
  });
}
```

---

## make() Validation Summary

All of the following throw before the server ever starts. None produce warnings except the empty namespace case.

| Check                                                     | Behavior |
| --------------------------------------------------------- | -------- |
| `endpoint` does not start with `/`                        | Throws   |
| Class in `namespaces[]` not decorated with `@namespace()` | Throws   |
| Two namespaces share the same prefix                      | Throws   |
| Two actions produce the same full key                     | Throws   |
| Two middleware in the same merged chain share a name      | Throws   |
| Sub-app `actionPrefix` fails pattern check                | Throws   |
| Sub-app action key conflicts with existing key            | Throws   |
| A namespace has no `@action` methods                      | Warns    |

---

## Sub-app Isolation

Sub-apps are fully independent `make()` instances. Their global middleware does not leak into the parent application. The parent only takes the sub-app's dispatch entries and prefixes their keys.

```ts
// adminApp has its own global middleware [guard(), adminOnly()]
// These do NOT run for parent app actions like 'auth:login'
const adminApp = make({
  middleware: [guard(), adminOnly()],
  namespaces: [AdminUserHandler],
});

const app = make({
  middleware: [requireHttps()], // runs for all actions including admin ones
  namespaces: [AuthHandler],
  subApps: [{ app: adminApp, actionPrefix: "admin" }],
});

// 'auth:login'        chain: requireHttps → handler
// 'admin:user:list'   chain: requireHttps → guard → adminOnly → handler
//                     ^ parent global    ^ sub-app global (carried in the merged entry)
```

The sub-app's merged chains are already built when they are merged into the parent. The parent's global middleware is prepended to every action including sub-app ones at the point where `serve()` runs the chain — actually, the parent global middleware is part of the parent `make()` call, so it is prepended during parent dispatch map assembly, not inherited from the sub-app.

---

## Complete Usage Example

```ts
// main.ts
import { make, inject } from "@aromix/core";
import { serve } from "aromix/node";

const adminApp = make({
  middleware: [guard(), adminOnly()],
  namespaces: [AdminUserHandler, AdminPostHandler],
});

const app = make({
  endpoint: "/api",
  middleware: [requireHttps(), requestId()],
  namespaces: [AuthHandler, UserHandler, PostHandler],
  subApps: [{ app: adminApp, actionPrefix: "admin" }],
});

serve(app).listen(3000, async () => {
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is required.");
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
  await inject(Database).client.$connect();
  console.log("Server ready on port 3000");
});
```

---

## Error Reference

| Scenario                                       | Error                                                                        |
| ---------------------------------------------- | ---------------------------------------------------------------------------- |
| `endpoint` missing leading `/`                 | `make(): endpoint must start with '/'`                                       |
| Class in `namespaces[]` without `@namespace()` | `make(): Foo is not decorated with @namespace()`                             |
| Duplicate namespace prefix                     | `make(): duplicate namespace prefix 'user'`                                  |
| Duplicate full action key                      | `make(): duplicate action key 'user:list'`                                   |
| Duplicate middleware name in merged chain      | `make(): duplicate middleware name 'guard' in chain for 'user:list'`         |
| Invalid sub-app `actionPrefix`                 | `make(): invalid subApp actionPrefix 'Admin'`                                |
| Sub-app action key conflict                    | `make(): sub-app action 'admin:user:list' conflicts with an existing action` |
| Missing `X-Action` header                      | `400 { error: 'Missing X-Action header' }`                                   |
| Unknown action                                 | `404 { error: 'Unknown action', action: string }`                            |
| Malformed JSON body                            | `400 { error: 'Invalid JSON body' }`                                         |
| Unhandled error in handler                     | `500 { error: 'Internal server error' }` — logged server-side                |

---

## File Layout

```
packages/core/src/
  make.ts               — make() function
  context-storage.ts    — AsyncLocalStorage instance (ctxStorage)
  dispatch.ts           — processRequest(), runMiddlewareChain(), error boundary
  types.ts              — AromixApp, DispatchMap, DispatchEntry, NormalizedRequest/Response

packages/adapter-node/src/
  index.ts              — serve(), handleRequest(), writeStreamResponse()

packages/adapter-bun/src/
  index.ts              — serve(), buildBunResponse(), writeStreamResponse()

packages/adapter-deno/src/
  index.ts              — serve(), buildDenoResponse(), writeStreamResponse()
```

---

## Out of Scope for this Feature

- `input()`, `reply()`, `stream()` — covered in their own blueprints.
- Dev panel mounting — covered in the panel blueprint.
- Compiler manifest — covered in the compiler blueprint.
