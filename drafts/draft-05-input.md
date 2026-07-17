# Aromix — Blueprint 05: input()

**Feature:** `input()`, `Context<T>`, `RawContext`, `AromixInputSchema`
**Package:** `@aromix/core`
**Status:** Pre-implementation, pending review
**Depends on:** Blueprint 01 (DI), Blueprint 03 (Middleware), Blueprint 04 (make/serve)

---

## Purpose

`input()` is how a handler accesses the incoming request. It serves two roles simultaneously.

At runtime it validates the request body, headers, and cookies against a schema and returns a fully typed context object. If validation fails it throws a `reply(400)` automatically — the handler never runs with invalid input.

At compile time the compiler reads the schema passed to `input()` from the AST to generate documentation. No extra annotation is needed.

Both roles work from a single expression: `ctx = input(Schema)` as the default parameter of a handler method.

---

## Public API

### `input()`

```ts
function input<TSchema extends AromixInputSchema>(schema?: TSchema): InferContext<TSchema>;
```

Used exclusively as the default value of the first parameter of an `@action` method.

```ts
@action('create')
async create(ctx = input(CreateUserSchema)) {
  ctx.body.email      // typed and validated
  ctx.body.name       // typed and validated
  ctx.headers         // raw — no header schema declared
  ctx.ip              // always available
  ctx.user            // attached by guard() if present
  ctx.action          // 'user:create'
}
```

### Schema Shape

LOCKED — The three-section structure is final. New sections cannot be added without a major version.

```ts
export interface AromixInputSchema {
  body?: AnyValidatorSchema;
  headers?: AnyValidatorSchema;
  cookies?: AnyValidatorSchema;
}
```

Each section is optional. Declare only what needs to be validated. Sections without a schema are still accessible on `ctx` in their raw unvalidated form.

```ts
// Validate body only
const CreateUserSchema = {
  body: v.object({
    email: v.string(),
    name:  v.string(),
  })
}

// Validate body and headers
const AuthenticatedSchema = {
  body: v.object({
    page: v.optional(v.number(), 1),
  }),
  headers: v.object({
    'x-api-key': v.string(),
  }),
}

// Validate nothing — raw ctx only
@action('health')
async health(ctx = input()) {
  ctx.ip      // available
  ctx.body    // unknown
  ctx.headers // raw
}
```

### Context Shape

LOCKED — All field names are final.

```ts
export interface Context<
  TBody = unknown,
  THeaders = Record<string, string | string[] | undefined>,
  TCookies = Record<string, string>,
> extends RawContext {
  readonly body: TBody;
  readonly headers: THeaders;
  readonly cookies: TCookies;
}
```

`Context` extends `RawContext` — all base fields and the `reply`/`stream` methods carry through automatically.

### RawContext

LOCKED — The base context available everywhere including middleware.

```ts
export interface RawContext {
  readonly body: unknown;
  readonly headers: Record<string, string | string[] | undefined>;
  readonly cookies: Record<string, string>;
  readonly ip: string;
  readonly action: string;
  user?: JwtPayload; // mutable — attached by guard()

  // Response methods — available in middleware and handlers
  reply: (options: ReplyOptions) => ReplyValue;
  stream: (fn: StreamFn, options?: StreamOptions) => StreamValue;
}
```

---

## Stability

| Symbol                           | Tier     |
| -------------------------------- | -------- |
| `input()` signature              | LOCKED   |
| `AromixInputSchema` shape        | LOCKED   |
| `Context<T>` field names         | LOCKED   |
| `RawContext` field names         | LOCKED   |
| `InferContext<T>` utility type   | LOCKED   |
| `ctxStorage` (AsyncLocalStorage) | INTERNAL |

---

## How Default Parameter Evaluation Works

This is the core mechanism that makes `input()` feel like a language feature rather than a function call.

TypeScript compiles `async create(ctx = input(Schema))` into:

```js
async create(ctx = undefined) {
  if (ctx === undefined) ctx = input(Schema)
  // ...
}
```

`make()` binds the handler to the class instance and stores it as:

```ts
handler: () => instance.create(); // no argument passed
```

When `serve()` calls `entry.handler()`, no argument is passed. `ctx` is `undefined`, the default triggers, and `input(Schema)` runs. Inside `input()`, the current `RawContext` is read from `AsyncLocalStorage` — it was placed there by `serve()` before the middleware chain started.

```
serve() receives request
  |
  +--> Builds RawContext
  +--> ctxStorage.run(rawCtx, () => runMiddlewareChain(...))
                    |
                    +--> Middleware runs (has access to rawCtx directly)
                    +--> entry.handler() called with no arguments
                              |
                              +--> ctx = input(Schema) triggers
                                        |
                                        +--> ctxStorage.getStore() → rawCtx
                                        +--> validates sections
                                        +--> returns typed Context
```

---

## AsyncLocalStorage Setup

```ts
// packages/core/src/context-storage.ts
import { AsyncLocalStorage } from "node:async_hooks";
// node:async_hooks is supported natively by Bun and Deno — no polyfill needed

export const ctxStorage = new AsyncLocalStorage<RawContext>();
```

`ctxStorage` is a module-level singleton. It is never exported from the package — it is only used internally by `input()` and the request pipeline in `serve()`.

---

## Internal Implementation

```ts
// packages/core/src/input.ts

function input<TSchema extends AromixInputSchema>(schema?: TSchema): InferContext<TSchema> {
  const ctx = ctxStorage.getStore();

  // Should never happen in correct usage — only if input() is called outside a handler
  if (!ctx) {
    throw new Error(
      "[aromix] input() was called outside of a request context. " +
        "input() must only be used as the default value of the first parameter of an @action method."
    );
  }

  // No schema — return raw context as typed Context with no validation
  if (!schema) return ctx as any;

  const issues: ValidationIssue[] = [];
  const validated: Partial<Context> = {
    ip: ctx.ip,
    action: ctx.action,
    user: ctx.user,
  };

  // Validate each section that has a schema — fall back to raw if no schema
  validated.body = schema.body ? validateSection("body", schema.body, ctx.body, issues) : ctx.body;

  validated.headers = schema.headers ? validateSection("headers", schema.headers, ctx.headers, issues) : ctx.headers;

  validated.cookies = schema.cookies ? validateSection("cookies", schema.cookies, ctx.cookies, issues) : ctx.cookies;

  if (issues.length > 0) {
    throw reply(400, { error: "Validation failed", issues });
  }

  return validated as InferContext<TSchema>;
}
```

### validateSection()

```ts
function validateSection(
  section: "body" | "headers" | "cookies",
  schema: AnyValidatorSchema,
  data: unknown,
  issues: ValidationIssue[]
): unknown {
  const adapter = resolveValidationAdapter(schema);
  const result = adapter.parse(schema, data);

  if (!result.ok) {
    // Prefix each issue path with the section name for clear error messages
    for (const issue of result.issues) {
      issues.push({
        path: [section, ...issue.path],
        message: issue.message,
      });
    }
    return data; // return raw data — caller checks issues array before using it
  }

  return result.data;
}
```

### Validation error shape

When validation fails, `input()` throws:

```ts
reply(400, {
  error: "Validation failed",
  issues: [
    { path: ["body", "email"], message: "Invalid email address" },
    { path: ["body", "age"], message: "Expected number, received string" },
  ],
});
```

The `path` array always starts with the section name (`body`, `headers`, or `cookies`) so the client knows exactly where the issue is.

---

## Type Inference

The return type of `input(schema)` is inferred from the schema sections declared.

```ts
type InferContext<T extends AromixInputSchema> = Context<
  T extends { body: AnyValidatorSchema } ? InferOutput<T["body"]> : unknown,
  T extends { headers: AnyValidatorSchema } ? InferOutput<T["headers"]> : Record<string, string | string[] | undefined>,
  T extends { cookies: AnyValidatorSchema } ? InferOutput<T["cookies"]> : Record<string, string>
>;
```

In practice:

```ts
const Schema = {
  body: v.object({
    email: v.string(),
    age:   v.number(),
  })
  // no headers or cookies schema
}

// ctx type inferred as:
// Context<
//   { email: string; age: number },   // body — typed from schema
//   Record<string, string | string[] | undefined>,  // headers — raw fallback
//   Record<string, string>             // cookies — raw fallback
// >

@action('create')
async create(ctx = input(Schema)) {
  ctx.body.email   // string
  ctx.body.age     // number
  ctx.headers      // raw — no autocomplete on specific keys
  ctx.cookies      // raw
}
```

---

## Validation Library Support

`input()` supports both Valibot and Zod. Detection is automatic — the framework inspects the schema object to determine which library it belongs to. The user passes the schema directly with no wrapping or adapter setup needed.

```ts
// Valibot
import * as v from 'valibot'

const Schema = {
  body: v.object({ email: v.string() })
}

// Zod
import { z } from 'zod'

const Schema = {
  body: z.object({ email: z.string() })
}

// Both work identically with input()
@action('create')
async create(ctx = input(Schema)) { ... }
```

Detection logic: Valibot schemas carry a `~run` method on the prototype. Zod schemas carry a `safeParse` method. The adapter resolver checks for these in order. If neither matches, `input()` throws a clear error naming the supported libraries.

This is covered in full detail in the validation adapter blueprint.

---

## Usage Patterns

### Full validation

```ts
const CreatePostSchema = {
  body: v.object({
    title:   v.string(),
    content: v.string(),
    tags:    v.optional(v.array(v.string()), []),
  }),
}

@action('create')
async create(ctx = input(CreatePostSchema)) {
  ctx.body.title    // string
  ctx.body.content  // string
  ctx.body.tags     // string[]
}
```

### Validating headers and cookies

```ts
const ApiKeySchema = {
  body: v.object({ query: v.string() }),
  headers: v.object({ 'x-api-key': v.string() }),
  cookies: v.object({ session: v.string() }),
}

@action('search')
async search(ctx = input(ApiKeySchema)) {
  ctx.body.query           // string
  ctx.headers['x-api-key'] // string
  ctx.cookies.session      // string
}
```

### No schema — raw ctx

```ts
@action('health')
async health(ctx = input()) {
  return reply(200, { ok: true, ip: ctx.ip })
}
```

### Accessing ctx.user after guard()

```ts
@namespace('post', [guard()])
class PostHandler {
  @action('create')
  async create(ctx = input(CreatePostSchema)) {
    // ctx.user is JwtPayload | undefined in the type
    // guard() guarantees it is set — but TypeScript does not know that
    // access it with the optional chain or a non-null assertion
    const userId = ctx.user!.sub
    ...
  }
}
```

---

## Error Reference

| Scenario                           | Error                                                              |
| ---------------------------------- | ------------------------------------------------------------------ |
| `input()` called outside a handler | `input() was called outside of a request context`                  |
| Body validation fails              | `reply(400, { error: 'Validation failed', issues: [...] })` thrown |
| Header validation fails            | `reply(400, { error: 'Validation failed', issues: [...] })` thrown |
| Cookie validation fails            | `reply(400, { error: 'Validation failed', issues: [...] })` thrown |
| Unrecognized schema type           | `input(): unrecognized schema type. Supported: Valibot, Zod`       |

---

## Constraints and Rules

- `input()` must only be used as the default value of the first parameter of an `@action` method. Using it anywhere else will throw at runtime because `AsyncLocalStorage` will have no context.
- `input()` is synchronous. Validation runs synchronously. Async validation is not supported in v1.
- The schema object passed to `input()` must be a plain object with `body`, `headers`, and/or `cookies` keys. It cannot be a schema directly — it must be the wrapper object.
- `ctx.user` is typed as `JwtPayload | undefined` even when `guard()` is in the middleware chain. TypeScript has no way to know at the type level that a middleware has run. Use `ctx.user!.sub` or check `ctx.user` explicitly.

---

## File Layout

```
packages/core/src/
  input.ts            — input() function, InferContext<T> type
  context-storage.ts  — ctxStorage AsyncLocalStorage instance
  types.ts            — Context<T>, RawContext, AromixInputSchema, JwtPayload
  index.ts            — re-exports input, Context, RawContext as public API
```

---

## Out of Scope for this Feature

- Validation adapter implementation — covered in the validation adapter blueprint.
- `reply()` — covered in Blueprint 06.
- Compiler schema extraction from `input()` AST — covered in the compiler blueprint.
