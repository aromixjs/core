# Aromix — Blueprint 02: Namespace and Action

**Feature:** `@namespace()`, `@action()`
**Package:** `@aromix/core`
**Status:** Pre-implementation, pending review
**Depends on:** Blueprint 01 — DI (`@provide()`, `inject()`)

---

## Purpose

`@namespace()` and `@action()` are how the application structure is declared. Together they define what actions exist, how they are grouped, and what middleware runs for each one.

`@namespace()` groups a set of related actions under a shared prefix and optionally attaches middleware that applies to every action in the group.

`@action()` registers a single handler method as a dispatchable action and optionally attaches middleware that applies only to that action.

Neither decorator starts anything, binds any ports, or executes any logic. They only write metadata into the registry. `make()` reads that metadata later and builds the dispatch map.

---

## Public API

### `@namespace()`

```ts
function namespace(prefix: string, middleware?: Middleware[]): ClassDecorator;
```

| Parameter    | Type           | Required | Constraints                                                                                                            |
| ------------ | -------------- | -------- | ---------------------------------------------------------------------------------------------------------------------- |
| `prefix`     | `string`       | Yes      | Lowercase alphanumeric, hyphens and underscores allowed. No colons. Max 64 characters. Pattern: `/^[a-z][a-z0-9_-]*$/` |
| `middleware` | `Middleware[]` | No       | Applies to every action in the class. Runs before action-level middleware.                                             |

```ts
import { namespace, guard } from '@aromix/core'

// No middleware — all actions in this class are public
@namespace('auth')
class AuthHandler { ... }

// With middleware — guard() runs for every action in this class
@namespace('user', [guard()])
class UserHandler { ... }
```

`@namespace()` classes are instantiated directly by `make()` — they do not need `@provide()` and are not part of the DI registry. `inject()` is a plain function that can be called anywhere, including inside a handler class to resolve services.

```ts
@namespace("user", [guard()])
class UserHandler {
  private users = inject(UserService); // inject() works here — no @provide() needed on UserHandler
}
```

### `@action()`

```ts
function action(name: string, middleware?: Middleware[]): MethodDecorator;
```

| Parameter    | Type           | Required | Constraints                                                                                                                                            |
| ------------ | -------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `name`       | `string`       | Yes      | Lowercase alphanumeric, hyphens and underscores allowed. No colons — colon is the namespace separator and is reserved. Pattern: `/^[a-z][a-z0-9_-]*$/` |
| `middleware` | `Middleware[]` | No       | Applies to this action only. Runs after namespace-level middleware.                                                                                    |

```ts
import { action, guard, inject, namespace, input, reply } from "@aromix/core";

@namespace("user", [guard()])
class UserHandler {
  private users = inject(UserService);

  @action("list")
  async list(ctx = input(ListUsersSchema)) {
    const r = await this.users.findAll(ctx.body);
    return reply(200, r.data);
  }

  @action("create")
  async create(ctx = input(CreateUserSchema)) {
    const r = await this.users.create(ctx.body);
    if (!r.ok) return reply(409, { error: "Email already taken" });
    return reply(201, r.data);
  }

  // Action-level middleware stacks on top of namespace middleware
  // Execution order: guard() -> adminOnly() -> handler
  @action("remove", [adminOnly()])
  async remove(ctx = input(RemoveUserSchema)) {
    const r = await this.users.remove(ctx.body.id);
    if (!r.ok) return reply(404, { error: "User not found" });
    return reply(204);
  }
}
```

---

## Full Action Key

The full action key is constructed at `make()` time by joining the namespace prefix and action name with a colon.

```
namespace prefix  +  ':'  +  action name  =  full action key

'user'            +  ':'  +  'list'       =  'user:list'
'user'            +  ':'  +  'create'     =  'user:create'
'auth'            +  ':'  +  'login'      =  'auth:login'
```

This key is the value the client sends in the `X-Action` header to identify which action to invoke. It is also the key used in the dispatch map.

---

## Middleware Execution Order

There are three levels of middleware. The full execution order for any action is always:

```
[ ...globalMiddleware, ...namespaceMiddleware, ...actionMiddleware ]  →  handler
```

Global middleware is declared on `make()` and runs for every action in the application. Namespace middleware is declared on `@namespace()` and runs for every action in that class. Action middleware is declared on `@action()` and runs only for that specific action.

This order is computed once at `make()` time and stored frozen in the dispatch entry. It is never recomputed at request time.

```ts
// Global declared on make()
const app = make({
  middleware: [requireHttps()],
  namespaces: [UserHandler],
})

@namespace('user', [guard(), rateLimitNamespace()])
class UserHandler {

  @action('remove', [adminOnly(), auditLog()])
  async remove(ctx = input(RemoveUserSchema)) { ... }
}

// Execution order for 'user:remove':
// requireHttps()  →  guard()  →  rateLimitNamespace()  →  adminOnly()  →  auditLog()  →  handler
```

---

## Stability

| Symbol                                                  | Tier     |
| ------------------------------------------------------- | -------- |
| `@namespace()` signature                                | LOCKED   |
| `@action()` signature                                   | LOCKED   |
| Full action key format `prefix:name`                    | LOCKED   |
| Execution order `global → namespace → action → handler` | LOCKED   |
| Registry internals                                      | INTERNAL |

---

## Internal Design

### Registry Entries

Written by decorators. Read exclusively by `make()`. Never exported.

```ts
// packages/core/src/registry.ts

interface NamespaceEntry {
  prefix: string;
  middleware: ReadonlyArray<Middleware>;
  ctor: Function;
}

interface ActionEntry {
  methodKey: string; // method name on the prototype e.g. 'list'
  name: string; // action name e.g. 'list'
  middleware: ReadonlyArray<Middleware>;
  ctor: Function; // links back to the namespace class
}

const namespaceRegistry = new Map<Function, NamespaceEntry>();
const actionRegistry = new Map<Function, ActionEntry[]>();
```

### `@namespace()` — Full Implementation

```ts
function namespace(prefix: string, middleware: Middleware[] = []): ClassDecorator {
  // Validate at decoration time — fail before make() is ever called
  if (!/^[a-z][a-z0-9_-]*$/.test(prefix)) {
    throw new Error(
      `[aromix] @namespace('${prefix}'): invalid prefix. ` + `Must be lowercase and match /^[a-z][a-z0-9_-]*$/.`
    );
  }

  if (prefix.length > 64) {
    throw new Error(`[aromix] @namespace('${prefix}'): prefix exceeds the 64 character limit.`);
  }

  return (ctor: Function) => {
    // Duplicate detection is deferred to make() — decorators run in unpredictable
    // module evaluation order so the full picture is only available at make() time
    namespaceRegistry.set(ctor, { prefix, middleware, ctor });
  };
}
```

### `@action()` — Full Implementation

```ts
function action(name: string, middleware: Middleware[] = []): MethodDecorator {
  if (!/^[a-z][a-z0-9_-]*$/.test(name)) {
    throw new Error(
      `[aromix] @action('${name}'): invalid name. ` + `Must be lowercase and match /^[a-z][a-z0-9_-]*$/.`
    );
  }

  return (target: object, methodKey: string | symbol) => {
    const ctor = target.constructor;
    const existing = actionRegistry.get(ctor) ?? [];

    existing.push({
      methodKey: String(methodKey),
      name,
      middleware,
      ctor,
    });

    actionRegistry.set(ctor, existing);
  };
}
```

---

## What make() Does With These

`make()` is covered fully in its own blueprint. This section only shows what it does specifically with namespace and action registry entries to complete the picture.

```ts
// Inside make() — for each namespace class passed in namespaces[]

const nsEntry = namespaceRegistry.get(ctor); // get namespace metadata
const actions = actionRegistry.get(ctor) ?? []; // get all @action methods
const instance = inject(ctor); // resolve singleton

for (const actionEntry of actions) {
  const fullKey = `${nsEntry.prefix}:${actionEntry.name}`;
  const mergedChain = [...globalMiddleware, ...nsEntry.middleware, ...actionEntry.middleware];

  // Handler is pre-bound to the instance here
  // serve() calls entry.handler(ctx) — no further binding needed
  const handler = (_ctx: RawContext): Promise<HandlerReturn> => (instance as any)[actionEntry.methodKey]();

  dispatchMap.set(fullKey, {
    action: fullKey,
    middleware: mergedChain,
    handler,
    streaming: false,
  });
}
```

The handler is bound to the class instance at assembly time. `serve()` calls `entry.handler(ctx)` directly with no additional setup.

---

## Validation make() Performs

All of the following throw at `make()` time, before the server ever starts. None produce warnings.

```ts
// 1. Class passed to namespaces[] must be decorated with @namespace()
if (!namespaceRegistry.has(ctor)) {
  throw new Error(`[aromix] make(): ${ctor.name} is not decorated with @namespace().`);
}

// 2. No two classes in the same make() call may share a prefix
if (seenPrefixes.has(entry.prefix)) {
  throw new Error(
    `[aromix] make(): duplicate prefix '${entry.prefix}' on ${seenPrefixes.get(entry.prefix)} and ${ctor.name}.`
  );
}

// 4. Warn if a namespace has no @action methods
if (actions.length === 0) {
  console.warn(`[aromix] make(): @namespace('${nsEntry.prefix}') has no @action methods.`);
}

// 5. No two actions in the full dispatch map may produce the same full key
if (dispatchMap.has(fullKey)) {
  throw new Error(`[aromix] make(): duplicate action key '${fullKey}'.`);
}
```

---

## Sub-apps and Prefix Nesting

For deeper key nesting such as `admin:user:list`, `make()` accepts sub-apps with an `actionPrefix`. This is covered fully in the make/serve blueprint. The namespace and action decorators themselves have no concept of nesting — the colon-separated full key is always exactly `${namespacePrefix}:${actionName}` from the decorators' perspective. The sub-app prefix is prepended by `make()` at assembly time.

```
Sub-app actionPrefix  +  ':'  +  namespace prefix  +  ':'  +  action name
'admin'               +  ':'  +  'user'             +  ':'  +  'list'
= 'admin:user:list'
```

---

## Complete Example

```ts
import { inject, namespace, action, guard, input, reply } from "@aromix/core";

@namespace("auth")
class AuthHandler {
  private auth = inject(AuthService);

  @action("login")
  async login(ctx = input(LoginSchema)) {
    const r = await this.auth.login(ctx.body.email, ctx.body.password);
    if (!r.ok) return reply(401, { error: "Invalid credentials" });
    return reply(200, r.data);
  }

  @action("logout")
  async logout(ctx = input(LogoutSchema)) {
    await this.auth.logout(ctx.body.refreshToken);
    return reply(204);
  }
}

@namespace("user", [guard()])
class UserHandler {
  private users = inject(UserService);

  @action("list")
  async list(ctx = input(ListUsersSchema)) {
    const r = await this.users.findAll(ctx.body);
    return reply(200, r.data);
  }

  @action("create")
  async create(ctx = input(CreateUserSchema)) {
    const r = await this.users.create(ctx.body);
    if (!r.ok) return reply(409, { error: "Email already taken" });
    return reply(201, r.data);
  }

  @action("remove", [adminOnly()])
  async remove(ctx = input(RemoveUserSchema)) {
    const r = await this.users.remove(ctx.body.id);
    if (!r.ok) return reply(404, { error: "User not found" });
    return reply(204);
  }
}

// Registered with make()
const app = make({
  namespaces: [AuthHandler, UserHandler],
});

// Resulting dispatch map keys:
// 'auth:login'
// 'auth:logout'
// 'user:list'
// 'user:create'
// 'user:remove'
```

---

## Error Reference

| Scenario                                         | Error                                                              |
| ------------------------------------------------ | ------------------------------------------------------------------ |
| Invalid namespace prefix pattern                 | `@namespace('Bad'): invalid prefix`                                |
| Namespace prefix exceeds 64 chars                | `@namespace('...'): prefix exceeds the 64 character limit`         |
| Invalid action name pattern                      | `@action('Bad'): invalid name`                                     |
| Class passed to `make()` without `@namespace()`  | `make(): Foo is not decorated with @namespace()`                   |
| Duplicate namespace prefix in same `make()` call | `make(): duplicate prefix 'user' on UserHandler and UserHandlerV2` |
| Duplicate full action key                        | `make(): duplicate action key 'user:list'`                         |

---

## Constraints and Rules

- `@namespace()` classes do not need `@provide()`. They are instantiated directly by `make()` using `new ctor()`, not through the DI registry.
- `inject()` is a plain function and can be called inside a `@namespace()` class to resolve services.
- A single class may not be passed to `make()` more than once.
- Action names must be unique within a namespace. Duplicate names in the same class produce duplicate full keys and throw at `make()` time.
- The colon character is reserved as the namespace separator. It cannot appear in a prefix or action name.

---

## File Layout

```
packages/core/src/
  registry.ts     — namespaceRegistry, actionRegistry (already exists from Blueprint 01)
  namespace.ts    — @namespace() decorator
  action.ts       — @action() decorator
  index.ts        — re-exports namespace, action as public API
```

---

## Out of Scope for this Feature

- `make()` assembly logic — covered in Blueprint 04.
- Middleware shape and execution — covered in Blueprint 03.
- `input()`, `reply()`, `stream()` — covered in their own blueprints.
- Sub-app prefix nesting — covered in Blueprint 04.
