# 01: Dependency Injection

**Feature:** `@provide()`, `inject()`, `injectNew()`, `Result<T, E>`, `result.ok()`, `result.fail()`
**Package:** `@aromix/core`
**Status:** Pre-implementation, pending review
**Depends on:** Nothing — this is the base layer everything else builds on

---

## Purpose

The DI system has two responsibilities that work together.

The first is instance management. Any class decorated with `@provide()` can be resolved in two ways — as a singleton shared across the entire application lifetime, or as a fresh instance created on every call. The caller decides which behavior they need at the call site, not at the class definition.

The second is error contract enforcement. Services managed by `@provide()` must never throw exceptions out of their methods and must never produce HTTP responses. All outcomes — success and failure — are expressed as return values using `Result<T, E>`. Every possible outcome of a service method is visible in its type signature. The compiler uses this to generate accurate documentation. Handlers are the only place where outcomes become HTTP responses.

---

## Public API

### `@provide()`

```ts
function provide(): ClassDecorator;
```

Marks a class as injectable. This is required before the class can be used with either `inject()` or `injectNew()`. The decorator itself does not determine the lifecycle — that is decided by which injector the caller uses.

```ts
import { provide } from "@aromix/core";

@provide()
export class Database {
  client = new PrismaClient();
}

@provide()
export class Logger {
  info(msg: string, meta?: object) {
    console.log("[info]", msg, meta ?? "");
  }
  error(msg: string, meta?: object) {
    console.error("[error]", msg, meta ?? "");
  }
}

@provide()
export class TokenService {
  sign(payload: object, options?: SignOptions): string {
    return jwt.sign(payload, process.env.JWT_SECRET!);
  }
  verify(token: string): JwtPayload {
    return jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
  }
}
```

---

### `inject(Class)` — Singleton

```ts
function inject<T>(ctor: new (...args: any[]) => T): T;
```

Returns the singleton instance for the given class. The instance is created on the first call and cached permanently. Every subsequent call to `inject()` for the same class returns the exact same object.

Use this for stateful shared resources — database connections, token services, loggers, configuration — anything that should be shared and consistent across the entire application.

```ts
@provide()
export class UserService {
  private db = inject(Database); // same Database instance always
  private logger = inject(Logger); // same Logger instance always

  async findById(id: string): Promise<Result<User, "not_found">> {
    try {
      const user = await this.db.client.user.findUnique({ where: { id } });
      if (!user) return result.fail("not_found");
      return result.ok(user);
    } catch (e) {
      this.logger.error("UserService.findById failed", { id, error: e });
      return result.fail("not_found");
    }
  }
}
```

`inject()` is also usable outside of a class body — for example in the `onBeforeStart` lifecycle hook to run startup logic before the server accepts connections.

```ts
serve(app, {
  onBeforeStart: async () => {
    await inject(Database).client.$connect();
  },
});
```

---

### `injectNew(Class)` — Transient

```ts
function injectNew<T>(ctor: new (...args: any[]) => T): T;
```

Creates and returns a brand new instance of the given class on every call. No caching. Each call to `injectNew()` goes through the full constructor, including resolving any `inject()` or `injectNew()` calls inside it.

Use this for stateless workers, per-operation processors, or any class where sharing state between callers would be incorrect.

```ts
@provide()
export class CsvParser {
  private rows: string[][] = [];

  parse(input: string): string[][] {
    // stateful parsing logic — must not be shared between concurrent requests
    this.rows = input.split("\n").map((line) => line.split(","));
    return this.rows;
  }
}

@provide()
export class ReportService {
  private logger = inject(Logger); // singleton — shared

  async generate(data: string): Promise<Result<Report, "parse_error">> {
    const parser = injectNew(CsvParser); // fresh instance — not shared
    try {
      const rows = parser.parse(data);
      return result.ok(buildReport(rows));
    } catch (e) {
      this.logger.error("ReportService.generate failed", { error: e });
      return result.fail("parse_error");
    }
  }
}
```

**Important:** `injectNew()` does not register the new instance anywhere. There is no cache, no lifecycle tracking. Once the caller drops the reference, the instance is eligible for garbage collection.

---

### `Result<T, E>`

```ts
type Result<T, E extends string = string> =
  | { readonly ok: true; readonly data: T }
  | { readonly ok: false; readonly err: E };
```

The mandatory return type for every service method that can fail. It is a discriminated union — one branch for success carrying the data, one for failure carrying a typed error code.

`E` must extend `string`. Error codes are string literals, not `Error` objects. This is intentional — string codes are readable, serializable, and appear directly in generated documentation. TypeScript narrows the union on each branch, so `r.data` is only accessible when `r.ok` is `true`.

```ts
async findById(id: string): Promise<Result<User, 'not_found'>> { ... }

// In a handler:
const r = await this.users.findById(ctx.body.id)

if (!r.ok) return reply(404, { error: 'User not found' })

return reply(200, r.data)   // r.data typed as User here
```

### `result.ok()` and `result.fail()`

```ts
const result: {
  ok<T>(data: T): Result<T, never>;
  fail<E extends string>(err: E): Result<never, E>;
};
```

Constructors for the two sides of `Result`. Both return frozen plain objects.

```ts
result.ok(user); // { ok: true,  data: User }
result.fail("not_found"); // { ok: false, err: 'not_found' }
```

---

## Stability

| Symbol             | Tier     |
| ------------------ | -------- |
| `@provide()`       | LOCKED   |
| `inject()`         | LOCKED   |
| `injectNew()`      | LOCKED   |
| `Result<T, E>`     | LOCKED   |
| `result.ok()`      | LOCKED   |
| `result.fail()`    | LOCKED   |
| Registry internals | INTERNAL |

---

## The Service Contract

This is a hard rule enforced by documentation now and by a compiler lint rule before v1.0.

**Services (`@provide()` classes) must:**

- Return `Result<T, E>` from every method that can fail.
- Catch all exceptions internally. An exception must never escape a service method.
- Log errors using an injected logger before returning a failure result.
- Never call `reply()`.
- Never import anything HTTP-related from the framework.

**Handlers (`@namespace` / `@action` classes) must:**

- Be the only place that calls `reply()`.
- Call services, inspect `result.ok`, and decide the HTTP response.
- Be the only place where a failure result becomes an HTTP status code.

**Why this boundary exists:**

If a service throws, the exception bypasses the handler entirely, lands in the framework's error boundary, and produces a generic 500. The handler had no opportunity to decide the response. The thrown error is also invisible to the compiler, so it cannot appear in documentation.

If a service returns `Result<T, E>`, every outcome is in the type signature. The handler checks `result.ok` and decides explicitly. The compiler reads every `reply()` call in the handler and produces accurate documentation. TypeScript ensures the handler addresses every declared error code.

---

## Internal Design

### The Registry

A module-level structure in `packages/core/src/registry.ts`. Never exported. Decorators write into it. `inject()` reads from it.

```ts
// packages/core/src/registry.ts — never exported

interface ProviderEntry {
  ctor: Function;
  instance: unknown | null; // null = not yet instantiated
}

const providerRegistry = new Map<Function, ProviderEntry>();
const resolving = new Set<Function>(); // tracks active inject() chains for circular detection
```

`injectNew()` does not use the registry for caching. It only checks the registry to confirm the class is decorated with `@provide()` before constructing a new instance.

### `@provide()` — Full Implementation

```ts
function provide(): ClassDecorator {
  return (ctor: Function) => {
    if (providerRegistry.has(ctor)) {
      throw new Error(
        `[aromix] @provide(): ${ctor.name} is already registered. ` +
          `Duplicate @provide() on the same class is not allowed.`
      );
    }
    providerRegistry.set(ctor, { ctor, instance: null });
  };
}
```

### `inject()` — Full Implementation

```ts
function inject<T>(ctor: new (...args: any[]) => T): T {
  const entry = providerRegistry.get(ctor);

  if (!entry) {
    throw new Error(
      `[aromix] inject(${ctor.name}): ${ctor.name} is not decorated with @provide(). ` +
        `Add @provide() to ${ctor.name} before injecting it.`
    );
  }

  if (resolving.has(ctor)) {
    const chain = [...resolving].map((c) => c.name).join(" -> ");
    throw new Error(
      `[aromix] inject(${ctor.name}): circular dependency detected.\n` + `Resolution chain: ${chain} -> ${ctor.name}`
    );
  }

  if (entry.instance !== null) {
    return entry.instance as T;
  }

  resolving.add(ctor);
  try {
    const instance = new (ctor as any)();
    entry.instance = instance;
    return instance;
  } finally {
    resolving.delete(ctor);
  }
}
```

### `injectNew()` — Full Implementation

```ts
function injectNew<T>(ctor: new (...args: any[]) => T): T {
  const entry = providerRegistry.get(ctor);

  if (!entry) {
    throw new Error(
      `[aromix] injectNew(${ctor.name}): ${ctor.name} is not decorated with @provide(). ` +
        `Add @provide() to ${ctor.name} before using injectNew().`
    );
  }

  // No singleton cache check — always construct a new instance
  // Still participates in circular detection because the constructor
  // may call inject() or injectNew() internally
  if (resolving.has(ctor)) {
    const chain = [...resolving].map((c) => c.name).join(" -> ");
    throw new Error(
      `[aromix] injectNew(${ctor.name}): circular dependency detected.\n` + `Resolution chain: ${chain} -> ${ctor.name}`
    );
  }

  resolving.add(ctor);
  try {
    return new (ctor as any)();
  } finally {
    resolving.delete(ctor);
  }
}
```

### `result` — Full Implementation

```ts
const result = {
  ok<T>(data: T): Result<T, never> {
    return Object.freeze({ ok: true as const, data });
  },
  fail<E extends string>(err: E): Result<never, E> {
    return Object.freeze({ ok: false as const, err });
  },
};
```

---

## Lifecycle Walkthrough

### Singleton via `inject()`

```
Module loads
  @provide() runs → registers { ctor, instance: null } in providerRegistry

First inject(Database) call
  → entry found, instance is null
  → add Database to resolving set
  → call new Database()
      → property initializers run
      → any inject() or injectNew() calls inside resolve recursively
  → store instance in entry.instance
  → remove Database from resolving set
  → return instance

Any subsequent inject(Database) call
  → entry found, instance is not null
  → return cached instance immediately
```

### Transient via `injectNew()`

```
Any injectNew(CsvParser) call
  → entry found in registry (confirms @provide() exists)
  → add CsvParser to resolving set
  → call new CsvParser()
      → any inject() or injectNew() calls inside resolve normally
  → remove CsvParser from resolving set
  → return the new instance — nothing is cached
```

---

## Mixing Singleton and Transient

A transient class can safely depend on singletons. A singleton must not depend on a transient via `inject()` — that would cache the first transient instance as the singleton's permanent dependency, defeating the purpose of transient.

```ts
// Correct — transient depending on singleton
@provide()
class CsvParser {
  private logger = inject(Logger); // singleton — fine, logger is shared
}

// Incorrect — singleton depending on transient via inject()
@provide()
class ReportService {
  private parser = inject(CsvParser); // wrong — caches the first CsvParser forever
}

// Correct — singleton creating transients per operation via injectNew()
@provide()
class ReportService {
  async generate(data: string) {
    const parser = injectNew(CsvParser); // fresh instance per call — correct
  }
}
```

---

## Circular Dependency Detection

The `resolving` set tracks which constructors are currently being instantiated. If `inject()` or `injectNew()` is called for a class that is already in the set, a circular dependency is detected and an error is thrown before a stack overflow can occur.

```ts
@provide()
class A {
  b = inject(B);
}

@provide()
class B {
  a = inject(A);
}

inject(A);
// throws:
// [aromix] inject(A): circular dependency detected.
// Resolution chain: A -> B -> A
```

---

## Error Reference

| Scenario                                     | Error                                                                |
| -------------------------------------------- | -------------------------------------------------------------------- |
| `inject()` on class without `@provide()`     | `inject(Foo): Foo is not decorated with @provide()`                  |
| `injectNew()` on class without `@provide()`  | `injectNew(Foo): Foo is not decorated with @provide()`               |
| `@provide()` applied twice to the same class | `@provide(): Foo is already registered`                              |
| Circular dependency via `inject()`           | `inject(Foo): circular dependency detected. Chain: A -> B -> Foo`    |
| Circular dependency via `injectNew()`        | `injectNew(Foo): circular dependency detected. Chain: A -> B -> Foo` |
| Constructor throws during instantiation      | Original error propagates — not wrapped by the framework             |

---

## Constraints and Rules

- `@provide()` classes must have a zero-argument constructor. The framework calls `new ctor()` with no arguments.
- Async initialization does not belong in the constructor. Use `onBeforeStart` to run async setup after calling `inject()`.
- Singletons are never destroyed at runtime. Cleanup belongs in `onBeforeStop`.
- A singleton must not store a transient as a property via `inject()`. Use `injectNew()` inside methods instead.
- `inject()` is not safe to call before the module containing the target class has been evaluated. This is standard ESM behavior.
- Services must catch all exceptions internally. An exception escaping a service method produces a generic 500 with no handler involvement.

---

## File Layout

```
packages/core/src/
  registry.ts     — providerRegistry, resolving set (never exported)
  provide.ts      — @provide() decorator
  inject.ts       — inject() and injectNew() functions
  result.ts       — Result<T,E> type, result.ok(), result.fail()
  index.ts        — re-exports provide, inject, injectNew, result, Result
```

---

## Open Decisions

| #   | Question                 | Notes                                                                                                                                                                                                                                                                                                                |
| --- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Request-scoped instances | A third lifecycle where the same instance is shared within a single request but a new instance is created for each new request. Requires per-request container storage, likely via AsyncLocalStorage. Deferred — not all applications need this and the design needs more thought before committing to a public API. |

---

## Out of Scope for v1

- Request-scoped lifecycle — deferred, see Open Decisions above.
- Interface or symbol injection tokens. The class constructor is the key.
- Async factory functions. Constructors are synchronous.
- Auto-scanning. Every `@provide()` class must be imported for its decorator to run.
