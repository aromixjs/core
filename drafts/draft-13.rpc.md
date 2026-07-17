# Aromix — Blueprint: Input & Output

**Feature:** `input()`, `output`, `Output<T>`, `OutputCode`
**Package:** `@aromix/core`
**Status:** Pre-implementation, pending review
**Replaces:** Blueprint 05 (input), Blueprint 06 (reply/stream)
**Depends on:** Blueprint 01 (DI), Blueprint 03 (Middleware), Blueprint 04 (make/serve)

---

## Purpose

`input` and `output` are the two sides of every action in Aromix. They are standalone imports — not attached to a context object.

`input()` is how a handler reads the incoming request — raw or validated.

`output` is how a handler produces a response. Every response from every action follows the exact same shape regardless of success or failure. The client always receives the same structure.

This replaces the previous `ctx.reply()` / `ctx.stream()` / `request()` / `response()` designs entirely.

---

## Core Guarantee

**Every response, every action, every time:**

```typescript
{
  ok:    boolean
  code:  OutputCode
  data:  T | null
  error: unknown
}
```

No exceptions. The client never has to guess the shape. No special casing per action. One pattern used everywhere.

**HTTP status is always `200`.** Aromix is RPC-style — all consumers are either the Sliz frontend or other servers (microservices). Both sides control the HTTP layer themselves and only care about the body. HTTP status codes carry no meaning here. The `ok` + `code` fields in the body are the entire contract.

This includes errors. A `NOT_FOUND`, `UNAUTHORIZED`, or `INTERNAL` response all arrive as HTTP 200 with `ok: false` in the body. The client reads the body, not the status.

---

## Output Shape

### TypeScript Type

```typescript
export type OutputCode =
  | "OK"
  | "CREATED"
  | "ACCEPTED"
  | "NO_CONTENT"
  | "BAD_INPUT"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "INTERNAL"
  | "UNAVAILABLE"

export type Output<T = unknown> =
  | {
      ok:    true
      code:  OutputCode
      data:  T
      error: null
    }
  | {
      ok:    false
      code:  OutputCode
      data:  null
      error: unknown
    }
```

### Rules

- `ok: true` → `data` contains the payload, `error` is always `null`
- `ok: false` → `data` is always `null`, `error` contains whatever the handler passed
- `code` is always at the top level, always one of the 12 standardized codes
- `error` is `unknown` — the user decides what shape their error data takes
- All 12 codes are available to both `output.ok()` and `output.fail()` — no artificial split between success and error codes. `ok` carries the success state, `code` carries the meaning.

### Wire Format Examples

```json
// success
{
  "ok": true,
  "code": "OK",
  "data": { "user": "istiuak", "age": 19 },
  "error": null
}

// created
{
  "ok": true,
  "code": "CREATED",
  "data": { "id": "123", "email": "user@example.com" },
  "error": null
}

// no content
{
  "ok": true,
  "code": "NO_CONTENT",
  "data": null,
  "error": null
}

// not found
{
  "ok": false,
  "code": "NOT_FOUND",
  "data": null,
  "error": "User not found"
}

// validation failure — user decides the error shape
{
  "ok": false,
  "code": "BAD_INPUT",
  "data": null,
  "error": {
    "message": "Validation failed",
    "fields": [
      { "path": ["body", "email"], "message": "Invalid email address" },
      { "path": ["body", "age"],   "message": "Must be a number" }
    ]
  }
}

// unauthorized — simple string error
{
  "ok": false,
  "code": "UNAUTHORIZED",
  "data": null,
  "error": "Token expired"
}
```

---

## Public API

### `output`

LOCKED — `output` is a plain imported object with two methods.

```typescript
import { output } from "@aromix/core"
```

#### `output.ok(code, data)`

```typescript
output.ok<T>(code: OutputCode, data: T): Output<T>
```

Produces a successful response. Sets `ok: true`, `error: null`.

```typescript
return output.ok("OK", { user: "istiuak" })
return output.ok("CREATED", newUser)
return output.ok("ACCEPTED", { jobId: "abc123" })
return output.ok("NO_CONTENT", null)
```

#### `output.fail(code, error)`

```typescript
output.fail(code: OutputCode, error: unknown): Output<never>
```

Produces a failure response. Sets `ok: false`, `data: null`.

```typescript
return output.fail("NOT_FOUND", "User not found")
return output.fail("CONFLICT", "Email already taken")
return output.fail("UNAUTHORIZED", "Token expired")
return output.fail("FORBIDDEN", "Admin access required")
return output.fail("RATE_LIMITED", "Too many requests")
return output.fail("INTERNAL", "Something went wrong")
return output.fail("UNAVAILABLE", "Down for maintenance")

// error can be any shape — user decides
return output.fail("BAD_INPUT", {
  message: "Validation failed",
  fields: [
    { path: ["body", "email"], message: "Invalid email" },
    { path: ["body", "age"],   message: "Must be a number" },
  ]
})
```

---

### `input()`

LOCKED — `input` is a standalone import. Used as a plain function call inside the handler body, not as a default parameter.

```typescript
import { input } from "@aromix/core"
```

#### `input()` — Raw Request

```typescript
input(): RawInput
```

Returns the raw unvalidated request. No schema, no validation.

```typescript
export interface RawInput {
  readonly body:    unknown
  readonly headers: Record<string, string | string[] | undefined>
  readonly cookies: Record<string, string>
  readonly ip:      string
  readonly action:  string
}
```

#### `input.validate(schema)` — Validated Request

```typescript
input.validate<TSchema extends InputSchema>(schema: TSchema): InferInput<TSchema>
```

Validates the request against the schema. If validation fails, automatically returns a `BAD_INPUT` output — the handler never runs with invalid data.

```typescript
export interface InputSchema {
  body?:    AnyValidatorSchema
  headers?: AnyValidatorSchema
  cookies?: AnyValidatorSchema
}
```

Returns a fully typed input object:

```typescript
export interface ValidatedInput<TBody, THeaders, TCookies> {
  readonly body:    TBody
  readonly headers: THeaders
  readonly cookies: TCookies
  readonly ip:      string
  readonly action:  string
}
```

Supports Valibot and Zod — detected automatically from the schema object. No adapter setup needed.

---

## Usage In Actions

### Basic — No Validation

```typescript
import { group, action, input, output, inject } from "@aromix/core"

@group("user")
export class UserGroup {

  @action("get")
  get() {
    const raw = input()
    const userId = raw.body  // unknown — no validation
    const user = this.users.find(userId as string)

    if (!user) return output.fail("NOT_FOUND", "User not found")
    return output.ok("OK", user)
  }
}
```

### With Validation

```typescript
import * as v from "valibot"

const GetUserSchema = {
  body: v.object({
    id: v.string(),
  })
}

@group("user")
export class UserGroup {
  private users = inject(UserService)

  @action("get")
  get() {
    const data = input.validate(GetUserSchema)
    // data.body.id is string — fully typed

    const user = this.users.find(data.body.id)
    if (!user) return output.fail("NOT_FOUND", "User not found")
    return output.ok("OK", user)
  }

  @action("create")
  create() {
    const data = input.validate({
      body: v.object({
        email: v.string(),
        name:  v.string(),
        age:   v.number(),
      })
    })

    const existing = this.users.findByEmail(data.body.email)
    if (existing) return output.fail("CONFLICT", "Email already taken")

    const user = this.users.create(data.body)
    return output.ok("CREATED", user)
  }

  @action("delete")
  delete() {
    const data = input.validate({
      body: v.object({ id: v.string() })
    })

    const deleted = this.users.delete(data.body.id)
    if (!deleted) return output.fail("NOT_FOUND", "User not found")
    return output.ok("NO_CONTENT", null)
  }

  @action("list")
  list() {
    const data = input.validate({
      body: v.object({
        page:  v.optional(v.number(), 1),
        limit: v.optional(v.number(), 20),
      })
    })

    const users = this.users.findAll(data.body)
    return output.ok("OK", users)
  }
}
```

### With Headers and Cookies

```typescript
const AuthSchema = {
  body: v.object({ query: v.string() }),
  headers: v.object({ "x-api-key": v.string() }),
  cookies: v.object({ session: v.string() }),
}

@action("search")
search() {
  const data = input.validate(AuthSchema)

  data.body.query            // string
  data.headers["x-api-key"]  // string
  data.cookies.session       // string

  const results = this.search.run(data.body.query)
  return output.ok("OK", results)
}
```

### Raw Input Only

```typescript
@action("health")
health() {
  const raw = input()
  return output.ok("OK", { status: "healthy", ip: raw.ip })
}
```

---

## Validation Failure — Automatic Output

When `input.validate()` fails, it automatically produces and returns:

```json
{
  "ok": false,
  "code": "BAD_INPUT",
  "data": null,
  "error": {
    "message": "Validation failed",
    "fields": [
      { "path": ["body", "email"], "message": "Invalid email address" },
      { "path": ["body", "age"],   "message": "Must be a number" }
    ]
  }
}
```

The handler never executes with invalid data. The error shape for `BAD_INPUT` from `input.validate()` is the one standardized error shape in the system — because it comes from the framework, not the user. All other error shapes in `output.fail()` are `unknown` and user-defined.

---

## Client Side

The client always handles the same structure regardless of which action was called:

```typescript
const res = await call("user:get", { id: "123" })

if (res.ok) {
  // res.code — OutputCode
  // res.data — typed as T from the action
  // res.error — always null here
  console.log(res.data)
} else {
  // res.code — OutputCode
  // res.data — always null here
  // res.error — unknown, inspect manually
  console.error(res.code, res.error)
}
```

Switching on code when needed:

```typescript
if (!res.ok) {
  switch (res.code) {
    case "NOT_FOUND":    return showNotFound()
    case "UNAUTHORIZED": return redirectToLogin()
    case "BAD_INPUT":    return showFieldErrors(res.error)
    default:             return showGenericError()
  }
}
```

---

## How `input` Works Internally

`input()` reads the current request from `AsyncLocalStorage`. The store is set by `serve()` before the middleware chain runs. This means `input()` works anywhere in the call stack during a request — inside the handler, inside a service called from the handler, anywhere.

```typescript
// packages/core/src/input.ts
import { AsyncLocalStorage } from "node:async_hooks"

export const inputStorage = new AsyncLocalStorage<RawInput>()

export function input(): RawInput {
  const raw = inputStorage.getStore()

  if (!raw) {
    throw new Error(
      "[aromix] input() was called outside of a request context."
    )
  }

  return raw
}

input.validate = function<TSchema extends InputSchema>(
  schema: TSchema
): InferInput<TSchema> {
  const raw    = input()
  const issues: FieldIssue[] = []
  const result: any = { ip: raw.ip, action: raw.action }

  result.body    = schema.body
    ? validateSection("body",    schema.body,    raw.body,    issues)
    : raw.body

  result.headers = schema.headers
    ? validateSection("headers", schema.headers, raw.headers, issues)
    : raw.headers

  result.cookies = schema.cookies
    ? validateSection("cookies", schema.cookies, raw.cookies, issues)
    : raw.cookies

  if (issues.length > 0) {
    // throw a special internal signal — serve() catches this
    // and converts it to the standard BAD_INPUT output
    throw new ValidationError(issues)
  }

  return result
}
```

`ValidationError` is an internal class. `serve()` catches it in the error boundary and converts it to the standard `BAD_INPUT` output shape. It never reaches the handler.

---

## How `output` Works Internally

`output` is a plain object — no class, no instantiation.

```typescript
// packages/core/src/output.ts

export const output = {
  ok<T>(code: OutputCode, data: T): Output<T> {
    return Object.freeze({
      ok:    true,
      code,
      data,
      error: null,
    })
  },

  fail(code: OutputCode, error: unknown): Output<never> {
    return Object.freeze({
      ok:    false,
      code,
      data:  null,
      error,
    })
  },
} as const
```

Both methods return a frozen plain object. They do not write the HTTP response — they produce a value. `serve()` receives that value, looks up the HTTP status from `STATUS_MAP`, and writes the response.

---

## serve() Integration

HTTP status is always `200`. Every response — success, failure, validation error, crash — is written as HTTP 200 with a JSON body. The body is the contract.

```typescript
// inside serve() error boundary

try {
  const result = await runMiddlewareChain(entry.middleware, () => entry.handler())

  // always 200 — status lives in the body
  writeJsonResponse(res, 200, result)

} catch (e) {

  if (e instanceof ValidationError) {
    // input.validate() failed — standard BAD_INPUT output, still 200
    const body: Output = {
      ok:    false,
      code:  "BAD_INPUT",
      data:  null,
      error: {
        message: "Validation failed",
        fields:  e.issues,
      }
    }
    writeJsonResponse(res, 200, body)
    return
  }

  // unknown crash — never expose internals, still 200
  console.error("[aromix] unhandled error in action", e)
  const body: Output = {
    ok:    false,
    code:  "INTERNAL",
    data:  null,
    error: "Internal server error",
  }
  writeJsonResponse(res, 200, body)
}
```

### Framework-Level Errors

Errors that happen before an action runs — missing `X-Action` header, unknown action key — also return HTTP 200 with the output shape:

```typescript
// missing X-Action header
{ ok: false, code: "BAD_INPUT", data: null, error: "Missing X-Action header" }

// unknown action
{ ok: false, code: "NOT_FOUND", data: null, error: "Unknown action" }
```

Server-side logging is the mechanism for catching crashes and monitoring — not HTTP status codes.
```

---

## Middleware and output

Middleware runs before the handler. It receives the raw request via `input()` and can short-circuit by returning an `output` value directly.

```typescript
function guard(): Middleware {
  return {
    name: "guard",
    run: async (next) => {
      const raw = input()
      const token = (raw.headers["authorization"] as string)?.slice(7)

      if (!token) return output.fail("UNAUTHORIZED", "Missing token")

      try {
        const payload = await verifyJwt(token)
        setUser(payload)  // stores in AsyncLocalStorage for handler to read
      } catch {
        return output.fail("UNAUTHORIZED", "Invalid token")
      }

      return next()
    }
  }
}
```

Note: middleware no longer receives `ctx` as a parameter — it uses `input()` the same way handlers do.

---

## Stability

| Symbol | Tier |
|---|---|
| `Output<T>` type | LOCKED |
| `OutputCode` type | LOCKED |
| `output.ok()` signature | LOCKED |
| `output.fail()` signature | LOCKED |
| `input()` signature | LOCKED |
| `input.validate()` signature | LOCKED |
| `InputSchema` shape | LOCKED |
| `RawInput` shape | LOCKED |
| Always HTTP 200 behavior | LOCKED |
| `inputStorage` (AsyncLocalStorage) | INTERNAL |
| `ValidationError` class | INTERNAL |

---

## Codes Reference

Codes carry semantic meaning. HTTP status is always 200 — the code in the body is what the client reads.

| Code | Meaning |
|---|---|
| `OK` | Standard success |
| `CREATED` | Resource was created |
| `ACCEPTED` | Request accepted, processing async |
| `NO_CONTENT` | Success, nothing to return |
| `BAD_INPUT` | Validation failed, bad request |
| `UNAUTHORIZED` | Not authenticated |
| `FORBIDDEN` | Authenticated but not allowed |
| `NOT_FOUND` | Resource does not exist |
| `CONFLICT` | Duplicate, state conflict |
| `RATE_LIMITED` | Too many requests |
| `INTERNAL` | Server error |
| `UNAVAILABLE` | Down for maintenance or overloaded |

---

## File Layout

```
packages/core/src/
  input.ts          — input(), input.validate(), inputStorage, ValidationError
  output.ts         — output.ok(), output.fail()
  types.ts          — Output<T>, OutputCode, RawInput, InputSchema, InferInput<T>, FieldIssue
  index.ts          — re-exports input, output, Output, OutputCode, RawInput as public API
```

---

## Error Reference

| Scenario | Result |
|---|---|
| `input()` called outside request context | Throws `[aromix] input() was called outside of a request context` |
| `input.validate()` fails | Caught by serve(), returns standard `BAD_INPUT` output |
| Unrecognized schema type | Throws `[aromix] input.validate(): unrecognized schema type. Supported: Valibot, Zod` |
| Handler returns `undefined` | Caught by serve(), returns `INTERNAL` output, logged server-side |
| Unhandled throw in handler | Caught by serve(), returns `INTERNAL` output, logged server-side |

---

## Out of Scope

- Streaming responses — covered in a separate blueprint
- Validation adapter internals (Valibot/Zod detection) — covered in validation adapter blueprint
- End-to-end type inference from `@action` to `call()` on client — covered in compiler blueprint
- Middleware `setUser()` / user context pattern — covered in auth blueprint