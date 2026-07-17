# Aromix — Blueprint 08: System Handlers & Plugin Lifecycle

**Feature:** System-level actions (`#` prefix) + Plugin lifecycle hooks  
**Package:** `@aromix/core`  
**Status:** Spec complete, ready for implementation  
**Depends on:** Blueprint 01 (DI), Blueprint 02 (`@namespace`, `@action`), Blueprint 03 (Middleware), Blueprint 04 (`make`, `serve`), Blueprint 07 (Plugin System)

---

## Purpose

Aromix needs two capabilities that middleware cannot provide:

1. **System-level actions** — Framework-reserved endpoints for health checks, metrics, custom 404 handling, etc.
2. **Plugin lifecycle** — Plugins need to run startup/shutdown logic (DB connect, cache warmup, etc.)

This blueprint defines both using existing primitives with minimal new API surface.

---

## Core Principles

| Principle                        | Decision                                                                         |
| -------------------------------- | -------------------------------------------------------------------------------- |
| **One way to do each thing**     | System handlers = `@group('#')`; Lifecycle = `PluginApp` extensions              |
| **No bloat**                     | No separate `Hooks` feature; no `MakeOptions` lifecycle callbacks                |
| **Middleware owns request flow** | Errors, auth, logging = middleware; System handlers = special dispatch fallbacks |
| **`serve()` unchanged**          | Lifecycle executed internally; no signature changes                              |
| **Natural naming**               | `#` prefix is short, distinct, unlikely to collide with business logic           |

---

## System Handlers (`#` Prefix)

### Reserved Namespace

The `#` prefix is reserved for system-level actions. Normal groups cannot use `#` as their prefix.

| Action Key   | Purpose                           | Default Behavior                               |
| ------------ | --------------------------------- | ---------------------------------------------- |
| `#:catchall` | Fallback for unknown user actions | Returns `404 { error: 'Unknown action' }`      |
| `#:health`   | Health check endpoint             | Returns `200 { status: 'ok' }` (if registered) |
| `#:ping`     | Simple latency check              | Returns `200 'pong'` (if registered)           |
| `#:metrics`  | Prometheus/metrics endpoint       | Not registered by default                      |
| `#:docs`     | Auto-generated API docs           | Not registered by default                      |

### Naming Rules

```ts
// packages/core/src/action.ts
const SYSTEM_PREFIX = "#";

function isValidGroupPrefix(prefix: string): boolean {
  // System prefix is reserved
  if (prefix === SYSTEM_PREFIX) {
    return true; // Allowed, but validated separately
  }

  // Normal prefixes cannot start with #
  if (prefix.startsWith(SYSTEM_PREFIX)) {
    return false;
  }

  return /^[a-z][a-z0-9_-]*$/.test(prefix) && prefix.length <= 64;
}

function isValidActionName(name: string, groupPrefix: string): boolean {
  const basePattern = /^[a-z][a-z0-9_-]*$/;

  // System group — relaxed validation
  if (groupPrefix === SYSTEM_PREFIX) {
    return basePattern.test(name) && name.length <= 64;
  }

  // Normal groups — standard validation
  return basePattern.test(name) && name.length <= 64;
}
```

### Registration via `PluginApp` (EXTENSIBLE)

```ts
// packages/core/src/plugin.ts
interface PluginApp {
  // ... existing LOCKED methods
  addMiddleware(...middleware: Middleware[]): void;
  addNamespace(...ctors: Function[]): void;
  addSubApp(subApp: AromixApp, actionPrefix: string): void;
  extendCtx<TKey extends string, TValue>(key: TKey, factory: (ctx: RawContext) => TValue): void;
  addService(ctor: Function): void;

  // NEW — EXTENSIBLE only
  addSystemHandler(name: string, handler: (ctx: RawContext) => ReplyValue | Promise<ReplyValue>): void;
  onApplicationStart(fn: () => void | Promise<void>): void;
  onApplicationStop(fn: () => void | Promise<void>): void;
}
```

### Internal Storage

```ts
// packages/core/src/make.ts (internal)
interface AromixAppInternal extends AromixApp {
  _systemHandlers: Map<string, (ctx: RawContext) => ReplyValue | Promise<ReplyValue>>;
  _onStartCallbacks: Array<() => void | Promise<void>>;
  _onStopCallbacks: Array<() => void | Promise<void>>;
}
```

---

## Plugin Lifecycle

### Plugin Registration

Plugins register lifecycle callbacks during `install()`:

```ts
// @aromix/plugin-prisma
import { AromixPlugin, inject } from "@aromix/core";

export function prismaPlugin(options: { url: string }): AromixPlugin {
  return {
    name: "prisma",
    install(app) {
      const client = new PrismaClient({ datasources: { db: { url: options.url } } });

      app.addService(
        class Database {
          client = client;
        }
      );

      // Lifecycle — encapsulated, user doesn't wire anything
      app.onApplicationStart(async () => {
        await client.$connect();
      });

      app.onApplicationStop(async () => {
        await client.$disconnect();
      });
    },
  };
}
```

```ts
// @aromix/plugin-redis
export function redisPlugin(options: { url: string }): AromixPlugin {
  return {
    name: "redis",
    install(app) {
      const client = createClient({ url: options.url });

      app.addService(
        class Cache {
          client;
        }
      );

      app.onApplicationStart(async () => {
        await client.connect();
      });

      app.onApplicationStop(async () => {
        await client.quit();
      });
    },
  };
}
```

### System Handler Registration

```ts
// @aromix/plugin-health
export function healthPlugin(options: { checkDb?: boolean } = {}): AromixPlugin {
  return {
    name: "health",
    install(app) {
      app.addSystemHandler("health", async (ctx) => {
        if (options.checkDb) {
          try {
            await inject(Database).client.$queryRaw`SELECT 1`;
          } catch {
            return ctx.reply({
              status: 503,
              data: { status: "degraded" },
            });
          }
        }
        return ctx.reply({
          status: 200,
          data: { status: "ok" },
        });
      });
    },
  };
}
```

```ts
// @aromix/plugin-metrics
export function metricsPlugin(): AromixPlugin {
  return {
    name: "metrics",
    install(app) {
      app.addSystemHandler("metrics", (ctx) => {
        return ctx.reply({
          status: 200,
          data: collectPrometheusMetrics(),
          headers: { "Content-Type": "text/plain" },
        });
      });
    },
  };
}
```

---

## Custom 404 Handler

### Default Behavior (No Code Needed)

```ts
const app = make({
  groups: [UserGroup, AuthGroup],
  plugins: [prismaPlugin(), redisPlugin()],
});

// Unknown action → 404 { error: 'Unknown action' } (hardcoded default)
```

### Custom 404 (Optional)

Users can define a custom catch-all handler using `@group('#')`:

```ts
import { group, action, input } from "@aromix/core";

@group("#")
class SystemHandlers {
  @action("catchall")
  handleNotFound(ctx = input()) {
    // ctx.action = the attempted action key: 'user:delete'
    logger.warn("Unknown action", { action: ctx.action });
    return ctx.reply({
      status: 404,
      data: { error: `Action not found: ${ctx.action}` },
    });
  }
}

const app = make({
  groups: [UserGroup, SystemHandlers],
  plugins: [prismaPlugin()],
});
```

### Plugin-Provided 404

Plugins can export a catch-all handler factory:

```ts
// @aromix/plugin-logging
export function notFoundLogger(): Function {
  @group("#")
  class NotFoundLogger {
    @action("catchall")
    log(ctx = input()) {
      logger.warn("Unknown action", { action: ctx.action });
      // Return undefined → let default or next handler respond
      // But handlers must return ReplyValue... so we return pass-through
      return ctx.reply({
        status: 404,
        data: { error: `Unknown: ${ctx.action}` },
      });
    }
  }
  return NotFoundLogger;
}

// User opts in
const app = make({
  groups: [UserGroup, notFoundLogger()],
  plugins: [prismaPlugin()],
});
```

---

## Runtime Dispatch Logic

### Action Resolution

```ts
// packages/core/src/dispatch.ts
function resolveHandler(
  action: string,
  app: AromixAppInternal
): DispatchEntry | null {
  // 1. User-defined action (exact match)
  const userEntry = app.dispatch.get(action)
  if (userEntry) return userEntry

  // 2. System action (#:*)
  if (action.startsWith('#:')) {
    const systemName = action.slice(2) // remove '#:'
    const handler = app._systemHandlers.get(systemName)
    if (handler) {
      // System handlers skip middleware chain (by design)
      return {
        handler: () => handler(buildRawContext(...)),
        middleware: []
      }
    }
    // Unknown system action → fall through to catchall/default
  }

  // 3. Unknown user action → catchall or default 404
  const catchall = app._systemHandlers.get('catchall')
  if (catchall) {
    return {
      handler: () => catchall(buildRawContext(...)),
      middleware: []
    }
  }

  // 4. No handler → adapter returns default 404
  return null
}
```

### Lifecycle Execution

```ts
// adapter-node/src/index.ts (simplified)
export function serve(app: AromixAppInternal): ServeInstance {
  let started = false;

  return {
    listen(port, cb) {
      const server = createServer(async (req, res) => {
        // Run onStart callbacks once, before first request
        if (!started) {
          started = true;
          for (const fn of app._onStartCallbacks) {
            await fn();
          }
        }
        // ... handle request ...
      });

      server.listen(port, async () => {
        await cb?.();
      });

      return {
        close: async () => {
          // Run onStop callbacks in reverse order
          for (const fn of [...app._onStopCallbacks].reverse()) {
            await fn();
          }
          await new Promise((resolve) => server.close(resolve));
        },
      };
    },
  };
}
```

---

## Execution Order

### Startup

```
serve().listen() called
  ↓
onStart callbacks (plugin registration order)
  ↓
First request arrives → middleware chain runs → handler
```

### Shutdown

```
serve().close() called
  ↓
onStop callbacks (reverse registration order)
  ↓
Server closes
```

### Dispatch

```
POST /api, X-Action: user:list
  ↓
1. Exact match in user dispatch map? → Run middleware chain → Handler
  ↓
2. Starts with #:? → System handler (no middleware)
  ↓
3. No match → #:catchall? → Run catchall (no middleware)
  ↓
4. No catchall → Default 404 response
```

---

## Usage Examples

### Minimal App (Defaults)

```ts
import { make } from "@aromix/core";
import { serve } from "aromix/node";
import { prismaPlugin } from "@aromix/plugin-prisma";

const app = make({
  groups: [UserGroup],
  plugins: [prismaPlugin({ url: process.env.DATABASE_URL! })],
});

serve(app).listen(3000);
// DB connects automatically on first request
// Unknown actions → 404 { error: 'Unknown action' }
```

### Full App (Custom System Handlers)

```ts
import { make, group, action, input } from "@aromix/core";
import { serve } from "aromix/node";
import { prismaPlugin } from "@aromix/plugin-prisma";
import { redisPlugin } from "@aromix/plugin-redis";
import { healthPlugin } from "@aromix/plugin-health";
import { metricsPlugin } from "@aromix/plugin-metrics";

@group("#")
class SystemHandlers {
  @action("catchall")
  handleNotFound(ctx = input()) {
    logger.warn("Unknown action", { action: ctx.action });
    return ctx.reply({
      status: 404,
      data: { error: `Action not found: ${ctx.action}` },
    });
  }
}

const app = make({
  groups: [UserGroup, AuthGroup, SystemHandlers],
  plugins: [
    prismaPlugin({ url: process.env.DATABASE_URL! }),
    redisPlugin({ url: process.env.REDIS_URL! }),
    healthPlugin({ checkDb: true }),
    metricsPlugin(),
  ],
});

serve(app).listen(3000);

// Available endpoints:
// POST /api, X-Action: user:list       → UserHandler
// POST /api, X-Action: auth:login      → AuthHandler
// POST /api, X-Action: #:health        → healthPlugin handler
// POST /api, X-Action: #:metrics       → metricsPlugin handler
// POST /api, X-Action: unknown:action  → SystemHandlers.catchall
```

### Error Handling (Middleware)

```ts
// Global error handling middleware
function handleErrors(): Middleware {
  return {
    name: "handleErrors",
    run: async (ctx, next) => {
      try {
        return await next();
      } catch (err) {
        logger.error("Request failed", { action: ctx.action, err });
        return ctx.reply({
          status: 500,
          data: { error: "Internal server error" },
        });
      }
    },
  };
}

const app = make({
  middleware: [handleErrors(), logger()],
  groups: [UserGroup],
  plugins: [prismaPlugin()],
});
```

---

## Error Reference

| Scenario                               | Error                                                  |
| -------------------------------------- | ------------------------------------------------------ |
| `@group('#')` with invalid action name | `@action('Bad'): invalid system action name`           |
| Normal group uses `#` prefix           | `@group('#user'): '#' is reserved for system handlers` |
| Duplicate system handler name          | `make(): duplicate system handler 'health'`            |
| Plugin name collision                  | `make(): duplicate plugin name 'prisma'`               |
| Middleware returns undefined           | `Middleware 'name' did not return a value`             |

---

## Stability

| Symbol                           | Tier       |
| -------------------------------- | ---------- |
| `@group`, `@action`              | LOCKED     |
| `Middleware` interface           | LOCKED     |
| `make()`, `serve()`              | LOCKED     |
| `PluginApp.addSystemHandler()`   | EXTENSIBLE |
| `PluginApp.onApplicationStart()` | EXTENSIBLE |
| `PluginApp.onApplicationStop()`  | EXTENSIBLE |
| `#` prefix reservation           | LOCKED     |
| System handler dispatch logic    | INTERNAL   |
| Lifecycle callback storage       | INTERNAL   |

---

## File Layout

```
packages/core/src/
  registry.ts         — providerRegistry, groupRegistry, actionRegistry
  provide.ts          — @provide()
  inject.ts           — inject(), injectNew()
  result.ts           — Result<T,E>, result.ok(), result.fail()
  group.ts            — @group() (renamed from @namespace)
  action.ts           — @action()
  middleware.ts       — Middleware interface, runMiddlewareChain()
  guard.ts            — guard() built-in middleware
  make.ts             — make(), AromixAppInternal
  context-storage.ts  — AsyncLocalStorage ctxStorage
  dispatch.ts         — processRequest(), resolveHandler(), error boundary
  input.ts            — input(), InferContext<T>
  context.ts          — RawContext, Context<T>, buildRawContext()
  types.ts            — all shared types
  plugin.ts           — AromixPlugin, PluginApp, buildPluginApp()
  index.ts            — public re-exports

adapter-node/src/
  index.ts            — serve(), lifecycle execution

adapter-bun/src/
  index.ts            — serve(), lifecycle execution

adapter-deno/src/
  index.ts            — serve(), lifecycle execution
```

---

## Key Design Decisions

| Decision                            | Rationale                                                                      |
| ----------------------------------- | ------------------------------------------------------------------------------ |
| **`#` prefix for system handlers**  | Short, distinct, unlikely to collide with business logic                       |
| **System handlers skip middleware** | They're fallbacks, not normal actions; avoids auth/complexity on health checks |
| **Lifecycle via `PluginApp`**       | Plugins encapsulate their own startup/shutdown; users don't wire anything      |
| **No `MakeOptions` lifecycle**      | Keeps `make()` pure; lifecycle is runtime concern                              |
| **`serve()` unchanged**             | No signature changes; lifecycle executed internally                            |
| **Middleware handles errors**       | Try/catch around `next()` — no separate `onError` hook needed                  |
| **Default 404 hardcoded**           | 95% of apps never customize; custom is opt-in via `#:catchall`                 |

---

## Mental Model

> **Middleware handles requests (including errors). System handlers (`#:`) handle framework-level endpoints. Plugins own lifecycle.**

Three concerns. Three places. No overlap.
