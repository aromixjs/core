# Aromix — Request & Response Blueprint

## Core Concept

`req`/`request` and `res`/`response` are **framework-level utilities** — not tied to any class,
not requiring `this`, not requiring a base class. They are imported once and used anywhere
inside an `@action` method. Both pull from `AsyncLocalStorage` internally.

```typescript
import { req, request, res, response, group, action, inject } from "@aromix/core";
```

---

## Aliases

Both pairs point to the **exact same object** — user picks whichever reads better in context.

| Short | Explicit   | What it is                                        |
| ----- | ---------- | ------------------------------------------------- |
| `req` | `request`  | Function + `.validate()` method — input utilities |
| `res` | `response` | Static builder singleton — output utilities       |

```typescript
// these are identical — same reference, two names
req === request; // true
res === response; // true
```

---

## `req` / `request` — Input

### Usage

```typescript
// raw — no validation, unknown types
const raw = req();
const raw = request();

// validated — typed via StandardSchema
const { body, headers, cookies } = await req.validate(schema);
const { body, headers, cookies } = await request.validate(schema);
```

### `req()` — Raw Request

Returns the raw request context for the current async execution.
No validation, no parsing — just the raw values from the adapter.

**Return type:**

```typescript
type RawRequest = {
  body: unknown; // raw unparsed body
  headers: Record<string, string>; // all headers, lowercase keys
  cookies: Record<string, string>; // all cookies as key/value
  ip: string; // client IP address
  action: string; // action key e.g. "user:get"
};
```

### `req.validate(schema)` / `request.validate(schema)`

Validates body, headers, and/or cookies against a StandardSchema.
Only validates the fields you provide — unvalidated fields fall back to raw values.

**Schema shape:**

```typescript
type RequestSchema = {
  body?: StandardSchemaV1; // validates req().body
  headers?: StandardSchemaV1; // validates req().headers
  cookies?: StandardSchemaV1; // validates req().cookies
};
```

**Return type:**

```typescript
type ValidatedRequest<T extends RequestSchema> = {
  body: T["body"] extends StandardSchemaV1 ? InferOutput<T["body"]> : unknown;
  headers: T["headers"] extends StandardSchemaV1 ? InferOutput<T["headers"]> : Record<string, string>;
  cookies: T["cookies"] extends StandardSchemaV1 ? InferOutput<T["cookies"]> : Record<string, string>;
};
```

**Examples:**

```typescript
// validate only body
const { body } = await req.validate({ body: createUserSchema });
// body is typed, headers/cookies are raw

// validate body + headers
const { body, headers } = await req.validate({
  body: createUserSchema,
  headers: authHeaderSchema,
});

// validate all three
const { body, headers, cookies } = await req.validate({
  body: loginSchema,
  headers: authHeaderSchema,
  cookies: sessionSchema,
});
```

### Implementation

```typescript
// request.ts
import { contextStorage } from "./context";
import { StandardSchemaV1 } from "@standard-schema/spec";

export type RawRequest = {
  body: unknown;
  headers: Record<string, string>;
  cookies: Record<string, string>;
  ip: string;
  action: string;
};

export type RequestSchema = {
  body?: StandardSchemaV1;
  headers?: StandardSchemaV1;
  cookies?: StandardSchemaV1;
};

export type ValidatedRequest<T extends RequestSchema> = {
  body: T["body"] extends StandardSchemaV1 ? StandardSchemaV1.InferOutput<T["body"]> : unknown;
  headers: T["headers"] extends StandardSchemaV1 ? StandardSchemaV1.InferOutput<T["headers"]> : Record<string, string>;
  cookies: T["cookies"] extends StandardSchemaV1 ? StandardSchemaV1.InferOutput<T["cookies"]> : Record<string, string>;
};

async function runValidate<S extends StandardSchemaV1>(
  schema: S,
  value: unknown
): Promise<StandardSchemaV1.InferOutput<S>> {
  let result = schema["~standard"].validate(value);
  if (result instanceof Promise) result = await result;
  if (result.issues) throw new Error(JSON.stringify(result.issues, null, 2));
  return result.value;
}

function requestFn(): RawRequest {
  const ctx = contextStorage.getStore();
  if (!ctx) throw new Error("[aromix] req() used outside of a request context. " + "Only use inside @action methods.");
  return {
    body: ctx.body,
    headers: ctx.headers,
    cookies: ctx.cookies,
    ip: ctx.ip,
    action: ctx.action,
  };
}

requestFn.validate = async function <T extends RequestSchema>(schema: T): Promise<ValidatedRequest<T>> {
  const ctx = contextStorage.getStore();
  if (!ctx)
    throw new Error(
      "[aromix] request.validate() used outside of a request context. " + "Only use inside @action methods."
    );

  const [body, headers, cookies] = await Promise.all([
    schema.body ? runValidate(schema.body, ctx.body) : ctx.body,
    schema.headers ? runValidate(schema.headers, ctx.headers) : ctx.headers,
    schema.cookies ? runValidate(schema.cookies, ctx.cookies) : ctx.cookies,
  ]);

  return { body, headers, cookies } as ValidatedRequest<T>;
};

// two names, same object
export const req = requestFn;
export const request = requestFn;
```

---

## `res` / `response` — Output

### Concept

`res` is a **static singleton**. Calling a terminal method directly returns a `ReplyValue`.
Calling an accumulator method returns a **fresh `ResBuilder`** instance that chains and
outputs a `ReplyValue` at the terminal call.

```
res.ok(data)                          → ReplyValue directly
res.setCookie(...).ok(data)           → ResBuilder → ReplyValue
res.setHeader(...).setCookie(...).ok() → ResBuilder → ReplyValue
```

`ResBuilder` is **never exported** — users never instantiate it directly.
Every chain starts from `res`/`response`.

### `ReplyValue` — output shape

This is the plain frozen object the adapter reads. No framework coupling, no ALS.

```typescript
type ReplyValue = Readonly<{
  _type: "reply";
  status: number;
  data?: unknown;
  headers: Record<string, string>;
  cookies: Record<string, CookieOptions>;
}>;
```

### `CookieOptions`

```typescript
type CookieOptions = {
  value: string;
  maxAge?: number; // seconds
  expires?: Date;
  path?: string; // default "/"
  domain?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: "Strict" | "Lax" | "None";
};
```

### Accumulator Methods (chain starters — return `ResBuilder`)

| Method                         | Description                  |
| ------------------------------ | ---------------------------- |
| `res.setHeader(name, value)`   | Set a single response header |
| `res.setHeaders(headers)`      | Set multiple headers at once |
| `res.setCookie(name, options)` | Set a cookie                 |
| `res.clearCookie(name, path?)` | Expire and clear a cookie    |

All accumulators are also available on `ResBuilder` for continued chaining:

```typescript
res
  .setHeader("x-request-id", crypto.randomUUID())
  .setCookie("token", { value: token, httpOnly: true })
  .ok({ message: "logged in" });
```

### Terminal Methods (return `ReplyValue`)

Available on both `res` directly and `ResBuilder` after chaining.

| Method                  | Status | Description                             |
| ----------------------- | ------ | --------------------------------------- |
| `ok(data?)`             | 200    | Request succeeded                       |
| `created(data?)`        | 201    | Resource created                        |
| `noContent()`           | 204    | Success, no body                        |
| `badRequest(error?)`    | 400    | Malformed or invalid request            |
| `unauthorized(error?)`  | 401    | Not authenticated                       |
| `forbidden(error?)`     | 403    | Authenticated but not allowed           |
| `notFound(error?)`      | 404    | Resource not found                      |
| `conflict(error?)`      | 409    | State conflict e.g. duplicate           |
| `unprocessable(error?)` | 422    | Semantically invalid                    |
| `internalError(error?)` | 500    | Unexpected server error                 |
| `custom(options)`       | any    | Full control over status, data, headers |

### Implementation

```typescript
// response.ts

export type CookieOptions = {
  value: string;
  maxAge?: number;
  expires?: Date;
  path?: string;
  domain?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: "Strict" | "Lax" | "None";
};

export type ReplyValue = Readonly<{
  _type: "reply";
  status: number;
  data?: unknown;
  headers: Record<string, string>;
  cookies: Record<string, CookieOptions>;
}>;

type CustomOptions = {
  status: number;
  data?: unknown;
  headers?: Record<string, string>;
  cookies?: Record<string, CookieOptions>;
};

class ResBuilder {
  #headers: Record<string, string> = {};
  #cookies: Record<string, CookieOptions> = {};

  // ── accumulators ──────────────────────────────────────────────────────────

  setHeader(name: string, value: string): this {
    this.#headers[name.toLowerCase()] = value;
    return this;
  }

  setHeaders(headers: Record<string, string>): this {
    for (const [k, v] of Object.entries(headers)) {
      this.#headers[k.toLowerCase()] = v;
    }
    return this;
  }

  setCookie(name: string, options: CookieOptions): this {
    this.#cookies[name] = options;
    return this;
  }

  clearCookie(name: string, path = "/"): this {
    this.#cookies[name] = { value: "", maxAge: 0, expires: new Date(0), path };
    return this;
  }

  // ── terminals ─────────────────────────────────────────────────────────────

  #build(status: number, data?: unknown): ReplyValue {
    return Object.freeze({
      _type: "reply" as const,
      status,
      data,
      headers: { ...this.#headers },
      cookies: { ...this.#cookies },
    });
  }

  ok(data?: unknown): ReplyValue {
    return this.#build(200, data);
  }
  created(data?: unknown): ReplyValue {
    return this.#build(201, data);
  }
  noContent(): ReplyValue {
    return this.#build(204);
  }
  badRequest(error?: string): ReplyValue {
    return this.#build(400, { error });
  }
  unauthorized(error?: string): ReplyValue {
    return this.#build(401, { error });
  }
  forbidden(error?: string): ReplyValue {
    return this.#build(403, { error });
  }
  notFound(error?: string): ReplyValue {
    return this.#build(404, { error });
  }
  conflict(error?: string): ReplyValue {
    return this.#build(409, { error });
  }
  unprocessable(error?: string): ReplyValue {
    return this.#build(422, { error });
  }
  internalError(error?: string): ReplyValue {
    return this.#build(500, { error });
  }

  custom(options: CustomOptions): ReplyValue {
    return Object.freeze({
      _type: "reply" as const,
      status: options.status,
      data: options.data,
      headers: { ...this.#headers, ...options.headers },
      cookies: { ...this.#cookies, ...options.cookies },
    });
  }
}

class Res {
  // ── direct terminals ──────────────────────────────────────────────────────
  ok(data?: unknown): ReplyValue {
    return new ResBuilder().ok(data);
  }
  created(data?: unknown): ReplyValue {
    return new ResBuilder().created(data);
  }
  noContent(): ReplyValue {
    return new ResBuilder().noContent();
  }
  badRequest(error?: string): ReplyValue {
    return new ResBuilder().badRequest(error);
  }
  unauthorized(error?: string): ReplyValue {
    return new ResBuilder().unauthorized(error);
  }
  forbidden(error?: string): ReplyValue {
    return new ResBuilder().forbidden(error);
  }
  notFound(error?: string): ReplyValue {
    return new ResBuilder().notFound(error);
  }
  conflict(error?: string): ReplyValue {
    return new ResBuilder().conflict(error);
  }
  unprocessable(error?: string): ReplyValue {
    return new ResBuilder().unprocessable(error);
  }
  internalError(error?: string): ReplyValue {
    return new ResBuilder().internalError(error);
  }
  custom(options: CustomOptions): ReplyValue {
    return new ResBuilder().custom(options);
  }

  // ── chain starters — return fresh ResBuilder ──────────────────────────────
  setHeader(name: string, value: string): ResBuilder {
    return new ResBuilder().setHeader(name, value);
  }
  setHeaders(headers: Record<string, string>): ResBuilder {
    return new ResBuilder().setHeaders(headers);
  }
  setCookie(name: string, options: CookieOptions): ResBuilder {
    return new ResBuilder().setCookie(name, options);
  }
  clearCookie(name: string, path?: string): ResBuilder {
    return new ResBuilder().clearCookie(name, path);
  }
}

// singleton — two names, same object
const resSingleton = new Res();
export const res = resSingleton;
export const response = resSingleton;
```

---

## Plugin Extension

Plugins extend `res`/`response` by registering new methods onto `Res.prototype`
and `ResBuilder.prototype` at startup via `make()`.

```typescript
// plugin definition
export function htmlPlugin(): Plugin {
  return {
    name: "html",
    install() {
      // extend Res — for direct calls: res.html(content)
      (Res.prototype as any).html = function (content: string): ReplyValue {
        return new ResBuilder()
          .setHeader("content-type", "text/html; charset=utf-8")
          .custom({ status: 200, data: content });
      };

      // extend ResBuilder — for chained calls: res.setHeader(...).html(content)
      (ResBuilder.prototype as any).html = function (this: ResBuilder, content: string): ReplyValue {
        return this.setHeader("content-type", "text/html; charset=utf-8").custom({ status: 200, data: content });
      };
    },
  };
}

// registered at startup
make({
  groups: [UserGroup],
  plugins: [htmlPlugin()],
});

// then available everywhere
return res.html("<h1>Hello</h1>");
return res.setHeader("x-powered-by", "aromix").html("<h1>Hello</h1>");
```

### Plugin type augmentation

To get TypeScript to recognise plugin methods, plugins ship a `.d.ts`:

```typescript
// @aromix/plugin-html/index.d.ts
import "@aromix/core";

declare module "@aromix/core" {
  interface ResExtensions {
    html(content: string): ReplyValue;
  }
}
```

And `Res` / `ResBuilder` implement `ResExtensions`:

```typescript
// core/src/response.ts
export interface ResExtensions {}  // empty — plugins augment this

class Res implements ResExtensions { ... }
class ResBuilder implements ResExtensions { ... }
```

---

## Adapter Integration

The adapter reads `ReplyValue` — a plain frozen object. No ALS needed,
no framework coupling. Works with any HTTP server.

```typescript
// node adapter
async function writeResponse(serverRes: ServerResponse, payload: ReplyValue) {
  // status
  serverRes.statusCode = payload.status;

  // headers
  for (const [k, v] of Object.entries(payload.headers)) {
    serverRes.setHeader(k, v);
  }

  // cookies → Set-Cookie headers
  if (Object.keys(payload.cookies).length > 0) {
    serverRes.setHeader(
      "Set-Cookie",
      Object.entries(payload.cookies).map(([name, opts]) => serializeCookie(name, opts))
    );
  }

  // body
  if (payload.data !== undefined) {
    serverRes.setHeader("content-type", "application/json");
    serverRes.end(JSON.stringify(payload.data));
  } else {
    serverRes.end();
  }
}

function serializeCookie(name: string, opts: CookieOptions): string {
  const parts = [`${name}=${encodeURIComponent(opts.value)}`];
  if (opts.maxAge != null) parts.push(`Max-Age=${opts.maxAge}`);
  if (opts.expires != null) parts.push(`Expires=${opts.expires.toUTCString()}`);
  parts.push(`Path=${opts.path ?? "/"}`);
  if (opts.domain != null) parts.push(`Domain=${opts.domain}`);
  if (opts.secure) parts.push("Secure");
  if (opts.httpOnly) parts.push("HttpOnly");
  if (opts.sameSite != null) parts.push(`SameSite=${opts.sameSite}`);
  return parts.join("; ");
}
```

---

## Full User-Side Example

```typescript
import { req, request, res, response, group, action, inject } from "@aromix/core";
import { UserService } from "./user.service";
import { authGuard, adminOnly, rateLimit } from "./middleware";
import { getUserSchema, createUserSchema, loginSchema, deleteUserSchema } from "./user.schema";

@group("user", [authGuard()])
export class UserGroup {
  private userService = inject(UserService);

  @action("list")
  async list() {
    const users = await this.userService.findAll();
    return res.ok(users);
  }

  @action("get")
  async get() {
    const { body } = await req.validate({ body: getUserSchema });
    const user = await this.userService.findById(body.id);
    if (!user) return res.notFound("User not found");
    return res.ok(user);
  }

  @action("create", [adminOnly()])
  async create() {
    const { body } = await request.validate({ body: createUserSchema });
    const existing = await this.userService.findByEmail(body.email);
    if (existing) return res.conflict("Email already in use");
    const user = await this.userService.create(body);
    return res.created(user);
  }

  @action("delete", [adminOnly()])
  async delete() {
    const { body } = await req.validate({ body: deleteUserSchema });
    await this.userService.delete(body.id);
    return res.noContent();
  }

  @action("login")
  async login() {
    const { body } = await req.validate({ body: loginSchema });
    const token = await this.userService.login(body);

    return res
      .setCookie("token", {
        value: token,
        httpOnly: true,
        secure: true,
        sameSite: "Strict",
        maxAge: 60 * 60 * 24,
      })
      .ok({ message: "logged in" });
  }

  @action("logout")
  async logout() {
    return res.clearCookie("token").ok({ message: "logged out" });
  }

  @action("profile")
  async profile() {
    const raw = request(); // raw — no validation needed
    return res.setHeader("x-action", raw.action).ok({ ip: raw.ip });
  }
}
```

---

## Key Rules

| Rule                                                                | Reason                                                  |
| ------------------------------------------------------------------- | ------------------------------------------------------- |
| `req()` / `request.validate()` only inside `@action` methods        | ALS only has a store during an active request           |
| `res` / `response` has no state — every chain starts fresh          | Singleton proxy — `ResBuilder` owns the state per chain |
| Handler must always return a `ReplyValue`                           | Adapter checks `payload._type === "reply"`              |
| Plugins must extend both `Res.prototype` and `ResBuilder.prototype` | So methods work both direct and chained                 |
| `ReplyValue` is a plain frozen object — no framework coupling       | Adapter can be swapped without touching handler code    |
