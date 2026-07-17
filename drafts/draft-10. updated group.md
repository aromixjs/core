# Aromix Framework — Architecture Blueprint

## Core Design Decisions

- **Groups** use a factory base class `Group("prefix", [middlewares])` — no `@group()` decorator
- **Actions** use `@action("name", [middlewares])` decorator on methods
- **Services** use `@provide()` decorator + `inject()` for property injection
- **Middleware** are factory functions returning a `Middleware` object
- **Request/Response** are split into two separate classes — `req` for input, `res` for output
- **Context** is request-scoped via `AsyncLocalStorage` — never shared across concurrent requests

---

## Project Structure

```
packages/core/src/
├── context.ts       # RawContext, ReplyValue, CookieOptions — internal adapter layer
├── request.ts       # Request class — all input concerns
├── response.ts      # Response class — all output concerns
├── group.ts         # Group() factory — base class for all route groups
├── action.ts        # @action() decorator
├── middleware.ts     # Middleware interface + runChain()
├── di.ts            # @provide() + inject()
├── make.ts          # make() — assembles descriptor from groups
└── index.ts         # public exports
```

---

## `context.ts` — Internal Layer

> Never exposed directly to users. Used internally by `Request`, `Response`, and the adapter.

```typescript
export type CookieOptions = {
  value: string;
  maxAge?: number; // seconds
  expires?: Date;
  path?: string; // default "/"
  domain?: string;
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: "Strict" | "Lax" | "None";
};

export type ReplyOptions = {
  status: number;
  data?: unknown;
  headers?: Record<string, string>;
  cookies?: Record<string, CookieOptions>;
};

export type ReplyValue = Readonly<{
  _type: "reply";
  status: number;
  data?: unknown;
  headers?: Record<string, string>;
  cookies?: Record<string, CookieOptions>;
}>;

export type RawContext = {
  body: unknown;
  headers: Record<string, string>;
  cookies: Record<string, string>;
  ip: string;
  action: string;
  reply: (options: ReplyOptions) => ReplyValue;
};

export const contextStorage = new AsyncLocalStorage<RawContext>();
```

---

## `request.ts` — Input Surface

> Accessed via `this.req` inside any `@action` method.

### Properties

| Property  | Type                     | Description                                           |
| --------- | ------------------------ | ----------------------------------------------------- |
| `body`    | `unknown`                | Raw unparsed body — use `validate()` for typed access |
| `headers` | `Record<string, string>` | All request headers, lowercase keys                   |
| `cookies` | `Record<string, string>` | All cookies as key/value pairs                        |
| `ip`      | `string`                 | Client IP address                                     |
| `action`  | `string`                 | The action key e.g. `"user:get"`                      |

### Methods

| Method             | Returns                        | Description                                            |
| ------------------ | ------------------------------ | ------------------------------------------------------ |
| `header(name)`     | `string \| undefined`          | Get a single header by name (case-insensitive)         |
| `cookie(name)`     | `string \| undefined`          | Get a single cookie by name                            |
| `validate(schema)` | `Promise<ValidatedRequest<T>>` | Validate body, headers, cookies — returns typed result |

### `validate()` schema shape

```typescript
type RequestSchema = {
  body?: StandardSchemaV1; // validates this.req.body
  headers?: StandardSchemaV1; // validates this.req.headers
  cookies?: StandardSchemaV1; // validates this.req.cookies
};
```

### `validate()` return shape

```typescript
type ValidatedRequest<T extends RequestSchema> = {
  body: T["body"] extends StandardSchemaV1 ? InferOutput<T["body"]> : unknown;
  headers: T["headers"] extends StandardSchemaV1 ? InferOutput<T["headers"]> : Record<string, string>;
  cookies: T["cookies"] extends StandardSchemaV1 ? InferOutput<T["cookies"]> : Record<string, string>;
};
```

### Implementation

```typescript
export class Request {
  constructor(private readonly raw: RawContext) {}

  get body(): unknown {
    return this.raw.body;
  }
  get headers(): Record<string, string> {
    return this.raw.headers;
  }
  get cookies(): Record<string, string> {
    return this.raw.cookies;
  }
  get ip(): string {
    return this.raw.ip;
  }
  get action(): string {
    return this.raw.action;
  }

  header(name: string): string | undefined {
    return this.raw.headers[name.toLowerCase()];
  }

  cookie(name: string): string | undefined {
    return this.raw.cookies[name];
  }

  async validate<T extends RequestSchema>(schema: T): Promise<ValidatedRequest<T>> {
    const [body, headers, cookies] = await Promise.all([
      schema.body ? validate(schema.body, this.raw.body) : this.raw.body,
      schema.headers ? validate(schema.headers, this.raw.headers) : this.raw.headers,
      schema.cookies ? validate(schema.cookies, this.raw.cookies) : this.raw.cookies,
    ]);
    return { body, headers, cookies } as ValidatedRequest<T>;
  }
}
```

---

## `response.ts` — Output Surface

> Accessed via `this.res` inside any `@action` method.
> Headers and cookies are **accumulated** via chainable methods, then flushed on the final reply call.

### Chainable Accumulator Methods

| Method                     | Returns | Description                  |
| -------------------------- | ------- | ---------------------------- |
| `setHeader(name, value)`   | `this`  | Set a single response header |
| `setHeaders(headers)`      | `this`  | Set multiple headers at once |
| `setCookie(name, options)` | `this`  | Set a cookie on the response |
| `clearCookie(name, path?)` | `this`  | Expire and clear a cookie    |

### Reply Methods

| Method                  | Status | Description                                  |
| ----------------------- | ------ | -------------------------------------------- |
| `ok(data?)`             | 200    | Request succeeded                            |
| `created(data?)`        | 201    | Resource created                             |
| `noContent()`           | 204    | Success, no body                             |
| `badRequest(error?)`    | 400    | Malformed request or validation failed       |
| `unauthorized(error?)`  | 401    | Not authenticated                            |
| `forbidden(error?)`     | 403    | Authenticated but not allowed                |
| `notFound(error?)`      | 404    | Resource not found                           |
| `conflict(error?)`      | 409    | State conflict e.g. duplicate resource       |
| `unprocessable(error?)` | 422    | Semantically invalid request                 |
| `internalError(error?)` | 500    | Unexpected server error                      |
| `custom(options)`       | any    | Full control — set any status, data, headers |

### `CookieOptions` shape

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

### Implementation

```typescript
export class Response {
  #headers: Record<string, string> = {};
  #cookies: Record<string, CookieOptions> = {};

  constructor(private readonly raw: RawContext) {}

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

  #build(options: ReplyOptions): ReplyValue {
    return this.raw.reply({
      ...options,
      headers: { ...this.#headers, ...options.headers },
      cookies: { ...this.#cookies, ...options.cookies },
    });
  }

  ok(data?: unknown): ReplyValue {
    return this.#build({ status: 200, data });
  }
  created(data?: unknown): ReplyValue {
    return this.#build({ status: 201, data });
  }
  noContent(): ReplyValue {
    return this.#build({ status: 204 });
  }
  badRequest(error?: string): ReplyValue {
    return this.#build({ status: 400, data: { error } });
  }
  unauthorized(error?: string): ReplyValue {
    return this.#build({ status: 401, data: { error } });
  }
  forbidden(error?: string): ReplyValue {
    return this.#build({ status: 403, data: { error } });
  }
  notFound(error?: string): ReplyValue {
    return this.#build({ status: 404, data: { error } });
  }
  conflict(error?: string): ReplyValue {
    return this.#build({ status: 409, data: { error } });
  }
  unprocessable(error?: string): ReplyValue {
    return this.#build({ status: 422, data: { error } });
  }
  internalError(error?: string): ReplyValue {
    return this.#build({ status: 500, data: { error } });
  }
  custom(options: ReplyOptions): ReplyValue {
    return this.#build(options);
  }
}
```

---

## `group.ts` — Group Factory

> `Group("prefix", [middlewares])` returns an abstract base class.
> `this.req` and `this.res` are only valid inside `@action` methods.

```typescript
export function Group(prefix: string, middlewares: Middleware[] = []) {
  abstract class GroupBase {
    static readonly __groupMeta = { prefix, middlewares };

    protected get req(): Request {
      const ctx = contextStorage.getStore();
      if (!ctx)
        throw new Error(
          "[aromix] this.req accessed outside of a request context. " + "Only access inside @action methods."
        );
      return new Request(ctx);
    }

    protected get res(): Response {
      const ctx = contextStorage.getStore();
      if (!ctx)
        throw new Error(
          "[aromix] this.res accessed outside of a request context. " + "Only access inside @action methods."
        );
      return new Response(ctx);
    }
  }

  return GroupBase;
}
```

---

## `action.ts` — Action Decorator

> Marks a method as a handler. Uses native TS5 decorators (no `experimentalDecorators`).

```typescript
export function action(prefix: string, middlewares: Middleware[] = []) {
  return function <T extends () => Promise<any>>(originalMethod: T, context: ClassMethodDecoratorContext): T {
    const key = String(context.name);

    context.addInitializer(function (this: any) {
      const ctor = this.constructor;
      const existing = ctor[ActionMetaKey] ?? {};
      existing[key] = { prefix, middlewares, key };
      ctor[ActionMetaKey] = existing;
    });

    return function (this: any) {
      return originalMethod.call(this);
    } as T;
  };
}
```

---

## `middleware.ts` — Middleware Interface

> Middleware receives the same `req`/`res` split as handlers for consistency.

```typescript
export type Next = () => Promise<ReplyValue>;

export type MiddlewareFn = (ctx: { req: Request; res: Response }, next: Next) => Promise<ReplyValue>;

export interface Middleware {
  readonly name: string;
  readonly run: MiddlewareFn;
}

export async function runChain(
  chain: readonly Middleware[],
  rawCtx: RawContext,
  handler: () => Promise<ReplyValue>
): Promise<ReplyValue> {
  const ctx = {
    req: new Request(rawCtx),
    res: new Response(rawCtx),
  };

  let index = 0;
  const next = (): Promise<ReplyValue> => {
    if (index < chain.length) {
      const mw = chain[index++];
      return mw.run(ctx, next);
    }
    return handler();
  };

  return contextStorage.run(rawCtx, next);
}
```

---

## `di.ts` — Dependency Injection

> `@provide()` marks a class as a managed singleton.
> `inject()` returns the singleton instance — creates it on first call, reuses on subsequent calls.

```typescript
@provide()
export class UserService {}

// consumption — property injection, no constructor needed
private userService = inject(UserService)
```

---

## `make.ts` — Assembly

```typescript
export function make(options: MakeOptions): AromixDescriptor {
  const descriptor: AromixDescriptor = { handlers: new Map() };
  const globalMiddlewares = options.middlewares ?? [];

  for (const gp of options.groups) {
    const instance = new gp();
    const groupMeta = (gp as any).__groupMeta; // from Group() factory
    const actionMap = action.getMeta(instance);

    if (!groupMeta || !actionMap) continue;

    for (const [methodKey, actionMeta] of Object.entries(actionMap)) {
      const fullKey = `${groupMeta.prefix}:${actionMeta.prefix}`;
      const chain: Middleware[] = [...globalMiddlewares, ...groupMeta.middlewares, ...actionMeta.middlewares];

      descriptor.handlers.set(fullKey, {
        chain,
        handler: (instance as any)[methodKey].bind(instance),
      });
    }
  }

  return descriptor;
}
```

### Middleware precedence (outermost → innermost)

```
make({ middlewares: [global()] })   ← runs first
  @Group("user", [groupLevel()])    ← runs second
    @action("get", [actionLevel()]) ← runs third
      handler()                     ← runs last
```

---

## Full User-Side Example

```typescript
import { Group, action, inject } from "@aromix/core";
import { UserService } from "./user.service";
import { authGuard, rateLimit, logger } from "./middleware";
import { getUserSchema, createUserSchema, deleteUserSchema } from "./user.schema";

export class UserGroup extends Group("user", [authGuard()]) {
  private userService = inject(UserService);

  @action("get")
  async get() {
    const { body } = await this.req.validate(getUserSchema);
    const user = await this.userService.findById(body.id);
    return this.res.ok(user);
  }

  @action("create")
  async create() {
    const { body } = await this.req.validate(createUserSchema);
    const user = await this.userService.create(body);
    return this.res.created(user);
  }

  @action("delete", [adminOnly()])
  async delete() {
    const { body } = await this.req.validate(deleteUserSchema);
    await this.userService.delete(body.id);
    return this.res.noContent();
  }

  @action("login")
  async login() {
    const { body } = await this.req.validate(loginSchema);
    const token = await this.userService.login(body);

    return this.res
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
    return this.res.clearCookie("token").ok({ message: "logged out" });
  }
}
```

---

## Middleware Example

```typescript
import { Middleware } from "@aromix/core";

export function authGuard(): Middleware {
  return {
    name: "authGuard",
    async run({ req, res }, next) {
      const token = req.header("authorization");
      if (!token) return res.unauthorized("Missing token");
      return next();
    },
  };
}

export function logger(): Middleware {
  return {
    name: "logger",
    async run({ req }, next) {
      console.log(`→ ${req.action} from ${req.ip}`);
      const result = await next();
      console.log(`← ${req.action} done`);
      return result;
    },
  };
}

export function rateLimit(max: number, windowSec: number): Middleware {
  return {
    name: "rateLimit",
    async run({ req, res }, next) {
      // max and windowSec captured in closure
      const allowed = await checkRateLimit(req.ip, max, windowSec);
      if (!allowed) return res.custom({ status: 429, data: { error: "Too many requests" } });
      return next();
    },
  };
}
```

---

## Service Example

```typescript
import { provide, inject } from "@aromix/core";
import { UserRepository } from "./user.repository";

@provide()
export class UserService {
  private repo = inject(UserRepository);

  async findById(id: string) {
    return this.repo.findById(id);
  }

  async create(data: unknown) {
    return this.repo.create(data);
  }

  async delete(id: string) {
    return this.repo.delete(id);
  }
}
```

---

## App Entry Point

```typescript
import { make } from "@aromix/core";
import { serve } from "@aromix/node";
import { UserGroup } from "./groups/user.group";
import { logger } from "./middleware/logger";

const descriptor = make({
  groups: [UserGroup],
  middlewares: [logger()], // global — runs on every request
});

serve(descriptor).listen(3000, () => {
  console.log("listening on http://localhost:3000");
});
```

---

## tsconfig.json

```jsonc
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ESNext"],
    "types": ["node"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "emitDeclarationOnly": true,
    // experimentalDecorators — NOT set, native TS5 decorators used
  },
}
```

---

## Key Rules

| Rule                                                            | Reason                                                        |
| --------------------------------------------------------------- | ------------------------------------------------------------- |
| `this.req` / `this.res` only inside `@action` methods           | `AsyncLocalStorage` only has a store during an active request |
| Never cache `this.req` / `this.res` as a class property         | Would persist across concurrent requests and cause data bleed |
| Middleware must always `return next()` or `return this.res.*()` | Not returning causes the chain to silently hang               |
| `@provide()` required on any class used with `inject()`         | No token = no registry entry = runtime error                  |
