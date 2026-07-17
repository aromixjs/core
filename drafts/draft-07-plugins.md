# Aromix — Blueprint 07: Plugin System

**Feature:** `AromixPlugin`, `PluginApp`, `make({ plugins })`
**Package:** `@aromix/core`
**Status:** Pre-implementation, pending review
**Depends on:** Blueprint 03 (Middleware), Blueprint 04 (make/serve)

---

## Purpose

Plugins are the primary extension mechanism for Aromix. A plugin can register namespaces, add global middleware, contribute sub-apps, extend `ctx` with new typed properties, and register services into DI — everything `make()` can do and more.

First-party packages like `@aromix/panel`, `@aromix/auth`, and `@aromix/openapi` are all implemented as plugins. The framework uses the same plugin API that users do — there is no internal back-door.

The plugin pattern follows the same shape as middleware — a factory function that returns a named object. Consistent across the entire framework.

```ts
// Middleware pattern
function guard(): Middleware {
  return { name: 'guard', run: async (ctx, next) => { ... } }
}

// Plugin pattern — same idea
function authPlugin(options: AuthOptions): AromixPlugin {
  return { name: 'auth', install(app) { ... } }
}
```

---

## Plugin Shape

LOCKED

```ts
export interface AromixPlugin {
  /** Unique name. Used by the dev panel, compiler, and duplicate detection. */
  readonly name: string;

  /**
   * Called by make() before the dispatch map is assembled.
   * The plugin receives the full PluginApp builder and registers
   * whatever it needs into it.
   */
  install(app: PluginApp): void;
}
```

A plugin is always created by a factory function that returns this object. The factory accepts whatever options the plugin needs. Options live in the closure — the returned object is stateless.

```ts
function authPlugin(options: { secret: string }): AromixPlugin {
  return {
    name: "auth",
    install(app) {
      app.addMiddleware(bearerGuard(options.secret));
      app.extendCtx("auth", (rawCtx) => createAuthContext(rawCtx, options.secret));
    },
  };
}
```

For plugins with no options the factory still returns the same shape — it just takes no arguments:

```ts
function loggingPlugin(): AromixPlugin {
  return {
    name: "logging",
    install(app) {
      app.addMiddleware(requestLogger());
    },
  };
}
```

---

## Registering Plugins

Plugins are declared in `make({ plugins: [] })`. They run in order before the dispatch map is assembled.

```ts
const app = make({
  middleware: [requireHttps()],
  namespaces: [AuthHandler, UserHandler],
  plugins: [authPlugin({ secret: process.env.JWT_SECRET! }), loggingPlugin(), panelPlugin({ path: "/__panel" })],
});
```

Plugin order matters for middleware — plugins registered earlier have their middleware run first, before plugins registered later. Global middleware declared directly on `make()` runs before all plugin middleware.

```
Global make() middleware  →  plugin[0] middleware  →  plugin[1] middleware  →  namespace  →  action  →  handler
```

---

## PluginApp — The Builder

`PluginApp` is the object passed to every plugin's `install` function. It is the plugin's complete interface to the framework. Everything a plugin registers goes through these methods.

EXTENSIBLE — new methods may be added. Existing methods are LOCKED.

```ts
export interface PluginApp {
  /**
   * Add middleware that runs globally for every action.
   * Runs after make() global middleware, in plugin registration order.
   */
  addMiddleware(...middleware: Middleware[]): void;

  /**
   * Register @namespace classes into the application.
   * Same as passing them in make({ namespaces: [] }).
   */
  addNamespace(...ctors: Function[]): void;

  /**
   * Merge a fully assembled sub-app into the dispatch map.
   * All action keys from the sub-app are prefixed with actionPrefix.
   */
  addSubApp(subApp: AromixApp, actionPrefix: string): void;

  /**
   * Attach a typed property to ctx for every request.
   *
   * key     — property name added to ctx
   * factory — called once per request with RawContext, returns the value
   *
   * The factory runs when RawContext is built, before the middleware chain
   * starts. The property is available in middleware and handlers.
   */
  extendCtx<TKey extends string, TValue>(key: TKey, factory: (ctx: RawContext) => TValue): void;

  /**
   * Register a @provide() class as a well-known service.
   * Equivalent to calling inject() on it at startup to ensure
   * it is instantiated and ready before requests arrive.
   */
  addService(ctor: Function): void;
}
```

---

## ctx Extension

The most powerful plugin capability. `app.extendCtx()` allows a plugin to attach a new typed property to every request context. The property is available in middleware and handlers without any imports or wrapper functions.

```ts
// Plugin definition
function authPlugin(options: { secret: string }): AromixPlugin {
  return {
    name: "auth",
    install(app) {
      app.extendCtx("auth", (rawCtx) => ({
        getUser: () => verifyToken(rawCtx.headers["authorization"], options.secret),
      }));
    },
  };
}

// In a handler — ctx.auth is fully typed
@namespace("user")
class UserHandler {
  @action("me")
  async me(ctx = input()) {
    const user = await ctx.auth.getUser();
    if (!user) return ctx.reply({ status: 401, data: { error: "Unauthorized" } });
    return ctx.reply({ status: 200, data: user });
  }
}
```

### Type Safety for ctx Extensions

`extendCtx` uses TypeScript module augmentation to make plugin-added properties available on `RawContext` and `Context` everywhere in the project. Each plugin ships a `.d.ts` declaration that augments the core types:

```ts
// @aromix/auth — types/index.d.ts
import "@aromix/core";

declare module "@aromix/core" {
  interface RawContext {
    auth: {
      getUser: () => Promise<JwtPayload | null>;
    };
  }
}
```

When the user installs `@aromix/auth`, this augmentation is picked up automatically by TypeScript. `ctx.auth` becomes typed everywhere without any manual annotation. This is the same pattern used by Express `@types` packages.

---

## Real-world Plugin Examples

### Auth Plugin (`@aromix/auth`)

```ts
import { AromixPlugin, PluginApp } from "@aromix/core";

interface AuthOptions {
  secret: string;
  cookieName?: string;
}

function authPlugin(options: AuthOptions): AromixPlugin {
  return {
    name: "auth",
    install(app: PluginApp) {
      // Add bearer token verification to ctx
      app.extendCtx("auth", (rawCtx) => {
        const header = rawCtx.headers["authorization"] as string | undefined;
        const cookie = rawCtx.cookies[options.cookieName ?? "session"];
        const token = header?.startsWith("Bearer ") ? header.slice(7) : cookie;

        return {
          async getUser(): Promise<JwtPayload | null> {
            if (!token) return null;
            try {
              return await verifyJwt(token, options.secret);
            } catch {
              return null;
            }
          },
        };
      });

      // Add guard() middleware factory
      app.addMiddleware(/* guard is used per-namespace, not global */);
    },
  };
}
```

### Dev Panel Plugin (`@aromix/panel`)

```ts
import { AromixPlugin, PluginApp, make } from "@aromix/core";

interface PanelOptions {
  path?: string; // default: '/__panel'
}

function panelPlugin(options: PanelOptions = {}): AromixPlugin {
  return {
    name: "panel",
    install(app: PluginApp) {
      // Register panel's own namespace as a sub-app
      const panelApp = make({ namespaces: [PanelHandler] });
      app.addSubApp(panelApp, options.path ?? "__panel");
    },
  };
}
```

### MVC Plugin (custom example)

```ts
function mvcPlugin(): AromixPlugin {
  return {
    name: "mvc",
    install(app: PluginApp) {
      // Attach render helper to ctx
      app.extendCtx("mvc", (rawCtx) => ({
        render(view: string, data?: object): ReplyValue {
          const html = renderTemplate(view, data);
          return rawCtx.reply({
            status: 200,
            data: html,
            headers: { "Content-Type": "text/html" },
          });
        },
      }));
    },
  };
}

// In a handler
@namespace("page")
class PageHandler {
  @action("home")
  async home(ctx = input()) {
    return ctx.mvc.render("home", { title: "Welcome" });
  }
}
```

---

## Stability

| Symbol                             | Tier       |
| ---------------------------------- | ---------- |
| `AromixPlugin` interface           | LOCKED     |
| `PluginApp` methods                | LOCKED     |
| `PluginApp` interface itself       | EXTENSIBLE |
| Plugin registration order behavior | LOCKED     |
| Global middleware execution order  | LOCKED     |

---

## Internal Design

### PluginApp Implementation

`PluginApp` is a plain object built inside `make()` before plugins run. It collects everything plugins register, then `make()` merges those contributions into the main assembly.

```ts
// Inside make()

function buildPluginApp(): PluginApp & {
  _middleware: Middleware[];
  _namespaces: Function[];
  _subApps: SubAppEntry[];
  _ctxExtensions: CtxExtension[];
  _services: Function[];
} {
  return {
    _middleware: [],
    _namespaces: [],
    _subApps: [],
    _ctxExtensions: [],
    _services: [],

    addMiddleware(...mw) {
      this._middleware.push(...mw);
    },
    addNamespace(...ctors) {
      this._namespaces.push(...ctors);
    },
    addSubApp(app, prefix) {
      this._subApps.push({ app, actionPrefix: prefix });
    },
    extendCtx(key, factory) {
      this._ctxExtensions.push({ key, factory });
    },
    addService(ctor) {
      this._services.push(ctor);
    },
  };
}
```

### Plugin Execution Inside make()

```ts
function make(options: MakeOptions = {}): AromixApp {
  const {
    middleware: globalMiddleware = [],
    namespaces: userNamespaces = [],
    subApps: userSubApps = [],
    plugins: userPlugins = [],
    endpoint = "/api",
  } = options;

  // 1. Run all plugins — collect their contributions
  const pluginApp = buildPluginApp();
  const seenPluginNames = new Set<string>();

  for (const plugin of userPlugins) {
    if (seenPluginNames.has(plugin.name)) {
      throw new Error(
        `[aromix] make(): duplicate plugin name '${plugin.name}'. ` + `Each plugin must have a unique name.`
      );
    }
    seenPluginNames.add(plugin.name);
    plugin.install(pluginApp);
  }

  // 2. Merge plugin contributions with user declarations
  // Global make() middleware always runs first
  const allMiddleware = [...globalMiddleware, ...pluginApp._middleware];
  const allNamespaces = [...userNamespaces, ...pluginApp._namespaces];
  const allSubApps = [...userSubApps, ...pluginApp._subApps];

  // Warm up any services the plugins registered
  for (const ctor of pluginApp._services) {
    inject(ctor); // ensures singleton is instantiated before requests arrive
  }

  // 3. Continue with normal make() assembly using merged contributions
  // ... (dispatch map building as described in Blueprint 04)

  return Object.freeze({
    endpoint,
    dispatch,
    ctxExtensions: Object.freeze(pluginApp._ctxExtensions), // passed to serve()
  });
}
```

### ctx Extensions at Request Time

`serve()` reads `app.ctxExtensions` and calls each factory when building `RawContext` per request:

```ts
function buildRawContext(req: NormalizedRequest, extensions: CtxExtension[]): RawContext {
  const ctx: any = {
    body:    req.body,
    headers: req.headers,
    cookies: req.cookies,
    ip:      req.ip,
    action:  req.action,

    reply(options)          { ... },
    stream(fn, options)     { ... },
  }

  // Attach each plugin's ctx contribution
  for (const { key, factory } of extensions) {
    ctx[key] = factory(ctx)
  }

  return ctx as RawContext
}
```

Extension factories receive the base `RawContext` — they have access to headers, cookies, ip, and the response methods. They do not have access to other extensions declared by other plugins — extension order is not guaranteed.

---

## Middleware Execution Order (Full)

With plugins the complete execution order for any action is:

```
make() global middleware
  → plugin[0] middleware (in registration order)
  → plugin[1] middleware
  → ...
  → namespace middleware
  → action middleware
  → handler
```

---

## Validation make() Performs on Plugins

| Check                                                  | Behavior                           |
| ------------------------------------------------------ | ---------------------------------- |
| Duplicate plugin name                                  | Throws                             |
| Plugin `name` is empty string                          | Throws                             |
| `addSubApp` actionPrefix fails pattern check           | Throws (same rules as SubAppEntry) |
| `addNamespace` with class not decorated `@namespace()` | Throws during assembly             |
| `extendCtx` key conflicts with a core ctx property     | Throws                             |

Reserved ctx keys that plugins cannot use: `body`, `headers`, `cookies`, `ip`, `action`, `user`, `reply`, `stream`.

---

## Error Reference

| Scenario                      | Error                                                                 |
| ----------------------------- | --------------------------------------------------------------------- |
| Duplicate plugin name         | `make(): duplicate plugin name 'auth'`                                |
| Empty plugin name             | `make(): plugin name must be a non-empty string`                      |
| `extendCtx` with reserved key | `make(): 'reply' is a reserved ctx key and cannot be used by plugins` |
| Plugin `install` throws       | Original error propagates — not wrapped                               |

---

## Constraints and Rules

- A plugin factory must always return a new object. Do not cache and reuse the same plugin instance across multiple `make()` calls.
- Plugin names must be unique within a single `make()` call. Two plugins with the same name is always a hard error.
- `extendCtx` factories are called once per request and must be synchronous. Async factories are not supported.
- Extension factories must not mutate the base `RawContext` fields. They only return a new value for their own key.
- Plugins are installed in declaration order. Middleware registered by `plugin[0]` runs before middleware from `plugin[1]`.

---

## File Layout

```
packages/core/src/
  plugin.ts       — AromixPlugin interface, PluginApp interface, buildPluginApp()
  types.ts        — CtxExtension, updated AromixApp to include ctxExtensions
  index.ts        — re-exports AromixPlugin, PluginApp as public API
```

---

## Out of Scope for this Feature

- `@aromix/auth` implementation — separate package, ships as a plugin.
- `@aromix/panel` implementation — separate package, ships as a plugin.
- `@aromix/openapi` implementation — separate package, ships as a plugin.
- TypeScript module augmentation per plugin — each plugin package handles its own `.d.ts`.
