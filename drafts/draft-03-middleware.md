# Aromix — Blueprint 04: Middleware

**Feature:** Middleware system — `Middleware`, global middleware on `make()`, namespace-level, action-level
**Package:** `@aromix/core`
**Status:** Pre-implementation, pending review
**Depends on:** Blueprint 01 (DI), Blueprint 02 (`@namespace`, `@action`), Blueprint 04 (`make`, `serve`)

---

## Purpose

Middleware is the single extension point in Aromix. There are no lifecycle hooks, no plugin system, no separate request/response interceptors. Everything that needs to run around a handler — authentication, rate limiting, logging, authorization, auditing — is expressed as middleware.

Middleware can be attached at three levels. The execution order is always deterministic and computed once at `make()` time:

```
global middleware  →  namespace middleware  →  action middleware  →  handler
```

---

## The Middleware Shape

LOCKED — This interface is final.

```ts
export interface Middleware {
  readonly name: string;
  readonly run: MiddlewareFn;
}

export type MiddlewareFn = (ctx: RawContext, next: () => Promise<HandlerReturn>) => Promise<HandlerReturn>;
```

**Why an object and not a plain function:**

After minification, `function.name` is unreliable. The `name` field on the object survives minification, is displayed in the dev panel per action, and is read by the compiler for documentation generation. A named object is also forward-compatible — new optional fields can be added without breaking existing middleware.

**The `run` contract:**

A middleware `run` function must do one of two things:

1. Call `next()` and return its value — to continue the chain toward the handler.
2. Return a `ReplyValue` directly without calling `next()` — to short-circuit the chain.

A `run` function that does neither violates the contract. The framework detects this and throws a descriptive error before responding.

---

## Writing Middleware

Middleware is always created via a factory function that returns a `Middleware` object. State lives in the factory closure, not on the object itself.

```ts
import { Middleware, RawContext } from "@aromix/core";

// Stateless middleware — factory returns the same shape every time
function requireHttps(): Middleware {
  return {
    name: "requireHttps",
    run: async (ctx, next) => {
      const proto = ctx.headers["x-forwarded-proto"];
      if (proto && proto !== "https") {
        return ctx.reply({ status: 400, data: { error: "HTTPS required" } });
      }
      return next();
    },
  };
}

// Stateful middleware — state lives in the closure, not on the object
function rateLimit(max: number, windowMs: number): Middleware {
  const counters = new Map<string, { count: number; reset: number }>();

  return {
    name: "rateLimit",
    run: async (ctx, next) => {
      const now = Date.now();
      const entry = counters.get(ctx.ip) ?? { count: 0, reset: now + windowMs };

      if (now > entry.reset) {
        entry.count = 0;
        entry.reset = now + windowMs;
      }

      entry.count++;
      counters.set(ctx.ip, entry);

      if (entry.count > max) {
        return ctx.reply({ status: 429, data: { error: "Too many requests" } });
      }

      return next();
    },
  };
}
```

---

## The Three Attachment Levels

### Global — on `make()`

Global middleware runs for every action in the entire application, regardless of namespace. Declared in `make()` options.

```ts
const app = make({
  middleware: [requireHttps(), rateLimit(100, 60_000)],
  namespaces: [AuthHandler, UserHandler, PostHandler],
});
```

Use global middleware for concerns that genuinely apply to every single action — HTTPS enforcement, global rate limiting, request ID attachment, universal logging.

### Namespace — on `@namespace()`

Namespace middleware runs for every action within that namespace. Declared as the second argument to `@namespace()`.

```ts
@provide()
@namespace('user', [guard()])
class UserHandler { ... }
```

Use namespace middleware for concerns scoped to a group of related actions — authentication for a protected resource group, namespace-specific rate limits.

### Action — on `@action()`

Action middleware runs only for that specific action. Declared as the second argument to `@action()`.

```ts
@action('remove', [adminOnly(), auditLog()])
async remove(ctx = input(RemoveUserSchema)) { ... }
```

Use action middleware for concerns specific to one operation — role checks, audit logging for sensitive operations, per-action rate limits.

---

## Execution Order

The full chain for any given action is:

```
[ ...globalMiddleware, ...namespaceMiddleware, ...actionMiddleware ]  →  handler
```

This array is assembled once at `make()` time and stored in the `DispatchEntry`. It is never recomputed at request time.

```ts
// Example:
const app = make({
  middleware: [requireHttps()],       // global
  namespaces: [UserHandler],
})

@namespace('user', [guard()])          // namespace
class UserHandler {
  @action('remove', [adminOnly()])     // action
  async remove(ctx = input(...)) { }
}

// Execution order for 'user:remove':
// requireHttps()  →  guard()  →  adminOnly()  →  handler
```

**Security invariant:** Global middleware always runs before namespace middleware. Namespace middleware always runs before action middleware. This ordering is guaranteed and cannot be altered at request time.

This means a namespace-level `guard()` cannot be bypassed by anything at the action level, and global middleware cannot be bypassed by anything at the namespace or action level.

---

## Short-circuiting the Chain

Any middleware can stop the chain by returning `ctx.reply()` instead of calling `next()`. Nothing after that point in the chain runs — including the handler.

```ts
function guard(): Middleware {
  return {
    name: "guard",
    run: async (ctx, next) => {
      if (!ctx.headers["authorization"]) {
        return ctx.reply({ status: 401, data: { error: "Unauthorized" } });
      }
      return next();
    },
  };
}

function maintenanceMode(): Middleware {
  return {
    name: "maintenanceMode",
    run: async (ctx, next) => {
      if (process.env.MAINTENANCE === "true") {
        return ctx.reply({ status: 503, data: { error: "Service unavailable" } });
      }
      return next();
    },
  };
}
```

The rule is simple: either `return ctx.reply(...)` to stop the chain, or `return next()` to continue it.

---

## Accessing Context in Middleware

Middleware receives `RawContext` — the unvalidated request context. Middleware runs before `input()`, so `ctx.body` is `unknown` at this point. Middleware should not attempt to read typed body fields.

```ts
export interface RawContext {
  readonly body: unknown;
  readonly headers: Record<string, string | string[] | undefined>;
  readonly cookies: Record<string, string>;
  readonly ip: string;
  readonly action: string; // fully-prefixed e.g. 'user:create'
  user?: JwtPayload; // attached by authentication middleware

  // Response methods
  reply: (options: ReplyOptions) => ReplyValue;
  stream: (fn: StreamFn, options?: StreamOptions) => StreamValue;
}
```

The only permitted mutation on `RawContext` is attaching `ctx.user` inside authentication middleware. All other mutations are forbidden.

---

## Built-in Middleware — `guard()`

`guard()` is the only middleware shipped with `@aromix/core`. It verifies the `Authorization: Bearer <token>` header, validates the JWT, and attaches the decoded payload to `ctx.user`.

LOCKED — `guard()` returns a `Middleware` with `name: 'guard'`. The name `'guard'` is reserved and must not be used by custom middleware.

```ts
function guard(): Middleware;
```

```ts
import { guard } from "@aromix/core";

@namespace("user", [guard()])
class UserHandler {
  @action("list")
  async list(ctx = input(ListUsersSchema)) {
    return ctx.reply({ status: 200, data: { user: ctx.user } });
  }
}
```

**Implementation:**

```ts
function guard(): Middleware {
  return {
    name: "guard",
    run: async (ctx, next) => {
      const authHeader = ctx.headers["authorization"] as string | undefined;

      if (!authHeader?.startsWith("Bearer ")) {
        return ctx.reply({ status: 401, data: { error: "Unauthorized" } });
      }

      const token = authHeader.slice(7);

      try {
        const payload = await verifyJwt(token); // uses jose internally
        ctx.user = payload as JwtPayload; // the single blessed ctx mutation
      } catch {
        return ctx.reply({ status: 401, data: { error: "Unauthorized" } });
      }

      return next();
    },
  };
}
```

JWT secret handling: `guard()` reads `process.env.JWT_SECRET` at call time. Validate this variable exists in the `listen()` callback before the server accepts requests:

```ts
serve(app).listen(3000, async () => {
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is required.");
  await inject(Database).client.$connect();
});
```

---

## Internal Design — Chain Execution

```ts
// packages/core/src/middleware.ts

async function runMiddlewareChain(
  chain: ReadonlyArray<Middleware>,
  ctx: RawContext,
  handler: () => Promise<HandlerReturn>
): Promise<HandlerReturn> {
  let index = 0;

  const next = async (): Promise<HandlerReturn> => {
    if (index < chain.length) {
      const mw = chain[index++];

      const result = await mw.run(ctx, next);

      // Contract enforcement — middleware must return a HandlerReturn
      if (result === undefined || result === null) {
        throw new Error(
          `[aromix] Middleware '${mw.name}' did not return a value. ` +
            `The run function must either return next() or return reply().`
        );
      }

      return result;
    }

    // All middleware passed — run the handler
    return ctxStorage.run(ctx, handler);
  };

  return next();
}
```

### How the Chain is Built at `make()` Time

```ts
// Inside make() — for each action

const mergedChain: Middleware[] = [
  ...globalMiddleware, // from make() options
  ...nsEntry.middleware, // from @namespace()
  ...actionEntry.middleware, // from @action()
];

dispatchMap.set(fullKey, {
  action: fullKey,
  middleware: Object.freeze(mergedChain),
  handler: (instance as any)[actionEntry.methodKey].bind(instance),
  streaming: false,
});
```

The merged chain is frozen. It cannot be mutated after `make()` returns.

---

## Middleware Naming Rules

- `name` must be a non-empty string.
- `name` must be unique within a single merged chain. Two middleware with the same name in the same chain throws at `make()` time.
- The name `'guard'` is reserved for the built-in `guard()` middleware.
- Names are used by the dev panel and compiler — keep them short and descriptive.

---

## Stability

| Symbol                                                  | Tier     |
| ------------------------------------------------------- | -------- |
| `Middleware` interface                                  | LOCKED   |
| `MiddlewareFn` type                                     | LOCKED   |
| `guard()`                                               | LOCKED   |
| Global middleware on `make()`                           | LOCKED   |
| Execution order `global → namespace → action → handler` | LOCKED   |
| Chain execution internals                               | INTERNAL |

---

## Complete Example

```ts
import { make } from "@aromix/core";
import { serve } from "aromix/node";

// Global — runs for every action
const app = make({
  middleware: [requireHttps(), requestLogger()],
  namespaces: [AuthHandler, UserHandler, AdminHandler],
});

// 'auth:login'    chain: requireHttps → requestLogger → handler
// 'auth:logout'   chain: requireHttps → requestLogger → handler
// 'user:list'     chain: requireHttps → requestLogger → guard → handler
// 'user:create'   chain: requireHttps → requestLogger → guard → handler
// 'user:remove'   chain: requireHttps → requestLogger → guard → adminOnly → auditLog → handler

serve(app).listen(3000, async () => {
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is required.");
  await inject(Database).client.$connect();
  console.log("Server ready on port 3000");
});
```

---

## Error Reference

| Scenario                                          | Error                                                               |
| ------------------------------------------------- | ------------------------------------------------------------------- |
| Middleware `run` returns `undefined` or `null`    | `Middleware 'name' did not return a value`                          |
| Duplicate middleware name in the same chain       | `make(): duplicate middleware name 'name' in chain for 'user:list'` |
| Reserved name `'guard'` used by custom middleware | `make(): 'guard' is a reserved middleware name`                     |

---

## Constraints and Rules

- Middleware must not perform synchronous blocking work. Any synchronous CPU-heavy operation inside `run` delays every request that passes through it.
- Middleware must not read typed fields from `ctx.body` — it is `unknown` at middleware execution time. Body validation happens inside `input()` in the handler.
- Middleware factories should be called once and the result passed to the decorator — not called inline on every request.
- Stateful middleware must keep state in the factory closure. The `Middleware` object itself must be stateless.

---

## File Layout

```
packages/core/src/
  middleware.ts     — Middleware interface, MiddlewareFn type, runMiddlewareChain()
  guard.ts          — guard() built-in middleware
  index.ts          — re-exports Middleware, guard as public API
```

---

## Out of Scope for this Feature

- `input()`, `reply()`, `stream()` — covered in their own blueprints.
- `make()` assembly logic — covered in this blueprint.
- Dev panel middleware display — covered in the panel blueprint.
- Compiler middleware extraction — covered in the compiler blueprint.
