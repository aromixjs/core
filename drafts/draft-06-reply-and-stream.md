# Aromix — Blueprint 06: ctx.reply() and ctx.stream()

**Feature:** `ctx.reply()`, `ctx.stream()`, `ReplyOptions`, `StreamOptions`, `ReplyValue`, `StreamValue`
**Package:** `@aromix/core`
**Status:** Pre-implementation, pending review
**Depends on:** Blueprint 05 (input / Context)

---

## Purpose

`ctx.reply()` and `ctx.stream()` are methods on the context object. They are the only two ways a handler or middleware can produce a response. There are no standalone `reply()` or `stream()` functions — the response is always constructed through `ctx`.

This keeps the API surface consistent with how Express, Fastify, and Hono work. Everything request and response related lives on one object.

Both methods are available on `RawContext` — which means middleware can call them too, not just handlers.

---

## How They Appear on ctx

```ts
@action('list')
async list(ctx = input(ListSchema)) {
  const r = await this.users.findAll(ctx.body)
  return ctx.reply({ status: 200, data: r.data })
}

@action('remove')
async remove(ctx = input(RemoveSchema)) {
  const r = await this.users.remove(ctx.body.id)
  if (!r.ok) return ctx.reply({ status: 404, data: { error: 'Not found' } })
  return ctx.reply({ status: 204 })
}

@action('feed')
async feed(ctx = input(FeedSchema)) {
  return ctx.stream((emit) => {
    const interval = setInterval(() => emit({ timestamp: Date.now() }), 1000)
    return () => clearInterval(interval)
  }, { heartbeat: 30_000 })
}
```

No imports needed for `reply` or `stream` — they come with `ctx`.

---

## Public API

### `ctx.reply(options)`

LOCKED

```ts
ctx.reply(options: ReplyOptions): ReplyValue
```

```ts
export interface ReplyOptions {
  /** HTTP status code. Must be 100–599. Required. */
  status: number;

  /** Response body. Serialized as JSON by the adapter. Optional. */
  data?: unknown;

  /** Custom response headers. Optional. */
  headers?: Record<string, string>;
}
```

```ts
// 200 with body
return ctx.reply({ status: 200, data: users });

// 201 with body
return ctx.reply({ status: 201, data: newUser });

// 204 no body
return ctx.reply({ status: 204 });

// 404 with error body
return ctx.reply({ status: 404, data: { error: "Not found" } });

// With custom headers
return ctx.reply({
  status: 201,
  data: newUser,
  headers: { Location: `/users/${newUser.id}` },
});
```

### `ctx.stream(fn, options?)`

LOCKED

```ts
ctx.stream(fn: StreamFn, options?: StreamOptions): StreamValue
```

```ts
export type StreamFn = (emit: EmitFn) => CleanupFn | void;
export type EmitFn = (data: unknown) => void;
export type CleanupFn = () => void;

export interface StreamOptions {
  /** Response Content-Type. Default: 'text/event-stream' */
  contentType?: string;

  /** Milliseconds between keep-alive ping frames. Optional. */
  heartbeat?: number;
}
```

```ts
return ctx.stream(
  (emit) => {
    const unsub = eventBus.on("update", (data) => emit(data));
    return () => unsub(); // cleanup on client disconnect
  },
  { heartbeat: 15_000 }
);
```

---

## Return Types

LOCKED

```ts
export interface ReplyValue {
  readonly _type: "reply";
  readonly status: number;
  readonly data: unknown | undefined;
  readonly headers: Record<string, string>;
}

export interface StreamValue {
  readonly _type: "stream";
  readonly fn: StreamFn;
  readonly options?: StreamOptions;
}

export type HandlerReturn = ReplyValue | StreamValue;
```

The `_type` discriminant is used internally by `serve()` to determine how to write the response. Never construct these objects manually — always use `ctx.reply()` or `ctx.stream()`.

---

## Stability

| Symbol                   | Tier       |
| ------------------------ | ---------- |
| `ctx.reply()` signature  | LOCKED     |
| `ReplyOptions` shape     | EXTENSIBLE |
| `ctx.stream()` signature | LOCKED     |
| `StreamOptions` shape    | EXTENSIBLE |
| `ReplyValue` shape       | LOCKED     |
| `StreamValue` shape      | LOCKED     |

---

## Where reply() and stream() Live

Both methods are attached to `RawContext` — the context object that exists before `input()` runs. This means they are available in middleware as well as in handlers.

```ts
export interface RawContext {
  readonly body: unknown;
  readonly headers: Record<string, string | string[] | undefined>;
  readonly cookies: Record<string, string>;
  readonly ip: string;
  readonly action: string;
  user?: JwtPayload;

  // Response methods — available everywhere
  reply: (options: ReplyOptions) => ReplyValue;
  stream: (fn: StreamFn, options?: StreamOptions) => StreamValue;
}
```

`input()` returns a `Context` that extends `RawContext` with typed body, headers, and cookies. The `reply` and `stream` methods carry through unchanged.

```ts
export interface Context<TBody, THeaders, TCookies> extends RawContext {
  readonly body: TBody;
  readonly headers: THeaders;
  readonly cookies: TCookies;
}
```

---

## Internal Implementation

`reply` and `stream` are bound methods attached to the `RawContext` when `serve()` builds it at the start of each request. They are plain functions — not class instances, not closures over mutable state.

```ts
// Inside serve() — building RawContext per request

function buildRawContext(req: NormalizedRequest): RawContext {
  const ctx: RawContext = {
    body: req.body,
    headers: req.headers,
    cookies: req.cookies,
    ip: req.ip,
    action: req.action,

    reply(options: ReplyOptions): ReplyValue {
      if (!Number.isInteger(options.status) || options.status < 100 || options.status > 599) {
        throw new Error(`[aromix] ctx.reply(): ${options.status} is not a valid HTTP status code.`);
      }
      return Object.freeze({
        _type: "reply" as const,
        status: options.status,
        data: options.data,
        headers: Object.freeze(options.headers ?? {}),
      });
    },

    stream(fn: StreamFn, options?: StreamOptions): StreamValue {
      return Object.freeze({
        _type: "stream" as const,
        fn,
        options: options ? Object.freeze({ ...options }) : undefined,
      });
    },
  };

  return ctx;
}
```

Both `reply()` and `stream()` return frozen plain objects. They do not send the response themselves — they construct a value that the handler returns. `serve()` receives that value and writes the actual HTTP response.

---

## How serve() Uses the Return Value

```ts
const result = await runMiddlewareChain(entry.middleware, rawCtx, entry.handler);

if (result._type === "reply") {
  writeReplyResponse(res, result);
} else if (result._type === "stream") {
  writeStreamResponse(res, result);
}
```

### Writing a reply

```ts
function writeReplyResponse(res, value: ReplyValue) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...value.headers, // user-provided headers override defaults
  };

  if (value.data === undefined) {
    headers["Content-Length"] = "0";
    res.writeHead(value.status, headers);
    res.end();
    return;
  }

  const body = JSON.stringify(value.data);
  res.writeHead(value.status, headers);
  res.end(body);
}
```

### Writing a stream

```ts
function writeStreamResponse(res, value: StreamValue) {
  res.writeHead(200, {
    "Content-Type": value.options?.contentType ?? "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  const emit: EmitFn = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  const cleanup = value.fn(emit);

  let heartbeat: ReturnType<typeof setInterval> | undefined;
  if (value.options?.heartbeat) {
    heartbeat = setInterval(() => res.write(": ping\n\n"), value.options.heartbeat);
  }

  res.on("close", () => {
    clearInterval(heartbeat);
    cleanup?.();
  });
}
```

---

## Middleware Using ctx.reply()

Since `reply` and `stream` are on `RawContext`, middleware can short-circuit and return a response directly without calling `next()`.

```ts
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
```

---

## Usage Patterns

### Success responses

```ts
return ctx.reply({ status: 200, data: users });
return ctx.reply({ status: 201, data: newUser });
return ctx.reply({ status: 204 });
```

### Error responses

```ts
return ctx.reply({ status: 404, data: { error: "Not found" } });
return ctx.reply({ status: 409, data: { error: "Email already taken" } });
return ctx.reply({ status: 422, data: { error: "Invalid input", fields: errors } });
```

### Custom headers

```ts
return ctx.reply({
  status: 201,
  data: newUser,
  headers: { Location: `/users/${newUser.id}` },
});

return ctx.reply({
  status: 200,
  data: token,
  headers: {
    "Set-Cookie": `session=${token}; HttpOnly; Secure`,
    "Cache-Control": "no-store",
  },
});
```

### Full handler example

```ts
@provide()
@namespace("user", [guard()])
class UserHandler {
  private users = inject(UserService);

  @action("create")
  async create(ctx = input(CreateUserSchema)) {
    const r = await this.users.create(ctx.body);

    if (!r.ok && r.err === "email_taken") {
      return ctx.reply({ status: 409, data: { error: "Email already taken" } });
    }
    if (!r.ok) {
      return ctx.reply({ status: 500, data: { error: "Something went wrong" } });
    }

    return ctx.reply({
      status: 201,
      data: r.data,
      headers: { Location: `/users/${r.data.id}` },
    });
  }

  @action("remove")
  async remove(ctx = input(RemoveUserSchema)) {
    const r = await this.users.remove(ctx.body.id);
    if (!r.ok) return ctx.reply({ status: 404, data: { error: "Not found" } });
    return ctx.reply({ status: 204 });
  }

  @action("live")
  async live(ctx = input()) {
    const userId = ctx.user!.sub;

    return ctx.stream(
      (emit) => {
        const handler = (event: UserEvent) => {
          if (event.userId === userId) emit(event);
        };
        eventBus.on("user", handler);
        return () => eventBus.off("user", handler);
      },
      { heartbeat: 20_000 }
    );
  }
}
```

---

## Impact on Previous Blueprints

This design change affects two previous blueprints. Both need to be updated after this is confirmed.

**Blueprint 05 — input():**

- `Context<T>` now extends `RawContext` instead of being a separate interface
- `RawContext` now has `reply` and `stream` as methods
- The `input()` return type carries these methods through automatically

**Blueprint 03 — Middleware:**

- The `MiddlewareFn` signature is unchanged — middleware still receives `RawContext` and `next`
- Middleware can now return `ctx.reply(...)` instead of the removed standalone `reply()`
- The short-circuit pattern changes from `throw reply(...)` to `return ctx.reply(...)`

---

## Error Reference

| Scenario                               | Error                                              |
| -------------------------------------- | -------------------------------------------------- |
| Invalid status code                    | `ctx.reply(): 999 is not a valid HTTP status code` |
| Handler returns `undefined`            | 500 — logged server-side, never exposed to client  |
| `ctx.stream()` fn throws synchronously | 500 — logged server-side                           |

---

## Constraints and Rules

- Handlers must always `return ctx.reply()` or `return ctx.stream()`. Returning `undefined` or any other value is a contract violation.
- There is no throw-based early exit. All exits are `return ctx.reply(...)`.
- `ctx.reply()` and `ctx.stream()` construct a value — they do not send the response. The handler must return that value.
- The cleanup function returned by the stream `fn` must be synchronous. Async cleanup is not awaited.
- `ctx.stream()` does not support async `fn`. Async operations inside it are the user's responsibility.

---

## File Layout

```
packages/core/src/
  context.ts    — RawContext, Context<T>, buildRawContext(), ReplyOptions, StreamOptions
  types.ts      — ReplyValue, StreamValue, HandlerReturn, StreamFn, EmitFn, CleanupFn
  index.ts      — re-exports Context, RawContext, ReplyOptions, StreamOptions as public API
```

---

## Out of Scope for this Feature

- How adapters write SSE frames across Node/Bun/Deno — covered in Blueprint 04.
- Validation error responses from `input()` — covered in Blueprint 05.
- Compiler output type extraction from `ctx.reply()` calls — covered in the compiler blueprint.
