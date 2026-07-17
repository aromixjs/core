# Aromix Error Handling & Hooks Architecture

## Core Philosophy

**"Explicit Business Logic, Centralized Validation, Implicit Control"**

This model balances readability with practicality:

- **Services** → `Result<T, E>` (explicit, documentable business failures)
- **Validation** → `throw` (caught by `onError`, centralized handling)
- **Hooks** → `ResponseBuilder | void` (short-circuit by return)
- **Framework** → `panic()` (only for impossible states)

---

## The Four-Tier Error Model

| Tier                           | Mechanism                 | Return Type                           | Who Handles                       | Example                        |
| ------------------------------ | ------------------------- | ------------------------------------- | --------------------------------- | ------------------------------ |
| **1. Business Logic Failures** | `Result<T, E>`            | `Promise<Result<Data, 'error_code'>>` | Handler maps to response          | User not found, email taken    |
| **2. Validation Failures**     | `throw ValidationError`   | `throw` (caught by adapter)           | `onError` hook                    | Schema mismatch, missing field |
| **3. Control Flow Decisions**  | `ResponseBuilder \| void` | `Promise<ResponseBuilder \| void>`    | Hook runner short-circuits        | Auth missing, rate limited     |
| **4. Framework Misuse**        | `panic()`                 | `never`                               | Crashes in dev, `onError` in prod | No active request context      |

---

## Tier 1: Services Use `Result<T, E>`

Services never throw for business logic. Failures are explicit string codes for documentation and type safety.

```typescript
// core/src/result.ts
export type Result<T, E extends string = string> =
  | { readonly ok: true; readonly T }
  | { readonly ok: false; readonly err: E };

export const result = {
  success: <T>(T): Result<T, never> => ({ ok: true, data }),
  failure: <E extends string>(err: E): Result<never, E> => ({ ok: false, err }),
};
```

**Naming rationale**: `result.success()` and `result.failure()` avoid collision with `response.ok()`.

```typescript
// user/src/services/UserService.ts
@provide()
export class UserService {
  async findById(id: string): Promise<Result<User, "not_found">> {
    const user = await db.find(id);
    if (!user) return result.failure("not_found");
    return result.success(user);
  }

  async create(CreateUserInput): Promise<Result<User, "email_taken" | "invalid_input">> {
    if (!isValidEmail(data.email)) return result.failure("invalid_input");
    const exists = await db.findByEmail(data.email);
    if (exists) return result.failure("email_taken");
    return result.success(await db.create(data));
  }
}
```

**Handler usage** — map `Result` to `ResponseBuilder`:

```typescript
@group("user")
export class UserGroup {
  private userService = inject(UserService);

  @action("get")
  async get() {
    const r = await this.userService.findById(request().body.id);
    if (!r.ok) return response.notFound(r.err);
    return response.ok(r.data);
  }
}
```

---

## Tier 2: Validation Throws (Caught by `onError`)

Validation errors throw because they're numerous, varied, and benefit from centralized handling in `onError`.

```typescript
// core/src/errors.ts
export class ValidationError extends Error {
  constructor(
    public readonly field: string,
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "ValidationError";
  }
}

export class FrameworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FrameworkError";
  }
}
```

```typescript
// core/src/request.ts
export function request(): RawRequest {
  const raw = requestStorage.getStore();
  if (!raw) {
    // Tier 4: Framework misuse - panic
    panic("[aromix] No active request. Ensure the HTTP adapter is running.");
  }
  return raw;
}

export namespace request {
  export async function validate<T extends RequestSchema>(schema: T): Promise<ValidatedRequest<T>> {
    const raw = request(); // May panic if misuse

    const [body, headers, cookies] = await Promise.all([
      schema.body ? runSchema(schema.body, raw.body) : Promise.resolve(raw.body),
      schema.headers ? runSchema(schema.headers, raw.headers) : Promise.resolve(raw.headers),
      schema.cookies ? runSchema(schema.cookies, raw.cookies) : Promise.resolve(raw.cookies),
    ]);

    // Schema validation failures throw ValidationError
    // These are caught by onError, not handled inline
    return { body, headers, cookies } as ValidatedRequest<T>;
  }
}
```

**Why validation throws:**

- Validation errors are numerous (many fields, many rules)
- Centralized handling in `onError` reduces boilerplate
- `onError` can format all validation errors consistently
- Still documentable — `ValidationError` is a known type

---

## Tier 3: Hooks Use `ResponseBuilder | void` for Short-Circuit

Hooks control flow by returning a `ResponseBuilder` to halt the chain, or `void` to continue.

```typescript
// core/src/hooks.ts
export type HookFn = (raw: RawRequest) => Promise<ResponseBuilder | void> | ResponseBuilder | void;

export interface HooksOptions {
  onStart?: () => Promise<void> | void;
  onStop?: () => Promise<void> | void;
  onRequest?: HookFn;
  onResponse?: (raw: RawRequest, builder: ResponseBuilder) => Promise<void> | void;
  onError?: (error: unknown, raw: RawRequest) => Promise<ResponseBuilder> | ResponseBuilder;
}
```

**Hook behavior**:

- Return `ResponseBuilder` → short-circuit, skip handler, proceed to `onResponse`
- Return `void` (or nothing) → continue to next hook or handler

```typescript
// auth hook example
const authHook: HookFn = async (raw) => {
  if (!raw.headers["authorization"]) {
    return response.unauthorized("Missing token"); // short-circuit
  }
  // void = continue
};
```

**Scoped hooks** — attach to `@group` or `@action`:

```typescript
@group("user", [authHook])
export class UserGroup {
  @action("create", [rateLimitHook])
  async create() {
    /* ... */
  }
}
```

---

## Tier 4: Framework Misuse Uses `panic()`

Distinguish between expected failures (`Result`, `throw`) and impossible states (`panic`).

```typescript
// core/src/panic.ts
export function panic(message: string): never {
  console.error(`\n🔴 AROMIX PANIC: ${message}\n`);
  throw new FrameworkError(message); // caught by onError in production
}
```

**Rationale**: `"no_active_request"` is a setup bug, not a user error. `panic()` crashes loudly in development so the issue is fixed immediately; in production, it is caught by `onError`.

---

## `onError` — Centralized Error Handling

`onError` catches both validation throws and unexpected errors, differentiating by `instanceof`:

```typescript
make({
  hooks: {
    onError: async (error, raw) => {
      // Tier 2: Validation errors
      if (error instanceof ValidationError) {
        return response.badRequest({
          field: error.field,
          code: error.code,
          message: error.message,
        });
      }

      // Tier 4: Framework errors
      if (error instanceof FrameworkError) {
        console.error("Framework error:", error.message);
        return response.internalError("System error");
      }

      // Tier 3: Third-party or unknown errors
      console.error("Unexpected error:", error);
      return response.internalError("Something went wrong");
    },
  },
});
```

---

## `onResponse` Always Runs — Single Exit Point

Regardless of how the response was generated (success, short-circuit, or error recovery), `onResponse` hooks always execute.

```typescript
// core/src/adapter.ts (simplified)
async function handleRequest(raw: RawRequest) {
  let builder: ResponseBuilder;

  try {
    // onRequest hooks
    for (const hook of onRequestHooks) {
      const result = await hook(raw);
      if (result instanceof ResponseBuilder) {
        builder = result;
        break; // short-circuit, but don't send yet
      }
    }

    // handler (if not short-circuited)
    if (!builder) {
      builder = await handler(raw);
    }
  } catch (error) {
    // unexpected throw → onError
    builder = await onErrorHook(error, raw);
  }

  // onResponse ALWAYS runs
  for (const hook of onResponseHooks) {
    await hook(raw, builder); // builder is never null
  }

  return builder.toReplyValue();
}
```

**`onResponse` mutates by reference**:

```typescript
make({
  hooks: {
    onResponse: async (raw, builder) => {
      builder.setHeader("x-request-id", raw.id);
      builder.setHeader("x-response-time", `${Date.now() - raw.startTime}ms`);
      builder.setHeader("x-powered-by", "aromix");
      // void = mutation is automatic
    },
  },
});
```

---

## Complete Example

```typescript
// service — Tier 1: Result pattern
@provide()
export class UserService {
  async findById(id: string): Promise<Result<User, "not_found">> {
    const user = await db.find(id);
    if (!user) return result.failure("not_found");
    return result.success(user);
  }
}

// hooks — Tier 3: Short-circuit by return
const authHook: HookFn = async (raw) => {
  if (!raw.headers["authorization"]) {
    return response.unauthorized("Missing token");
  }
};

// group with scoped hooks
@group("user", [authHook])
export class UserGroup {
  private userService = inject(UserService);

  @action("get")
  async get() {
    // Tier 2: Validation throws (caught by onError)
    const validated = await request.validate({ body: getUserSchema });

    // Tier 1: Service Result (handled inline)
    const r = await this.userService.findById(validated.body.id);
    if (!r.ok) return response.notFound(r.err);
    return response.ok(r.data);
  }
}

// app entry
make({
  groups: [UserGroup],
  hooks: {
    onStart: async () => {
      await db.connect();
    },
    onStop: async () => {
      await db.disconnect();
    },

    onRequest: async (raw) => {
      console.log(`→ ${raw.action} from ${raw.ip}`);
      // void = continue
    },

    onResponse: async (raw, builder) => {
      console.log(`← ${raw.action} ${builder.getStatus()}`);
      builder.setHeader("x-powered-by", "aromix");
    },

    onError: async (error, raw) => {
      // Tier 2: Validation
      if (error instanceof ValidationError) {
        return response.badRequest({ field: error.field, code: error.code });
      }
      // Tier 4: Framework
      if (error instanceof FrameworkError) {
        return response.internalError("System error");
      }
      // Default
      return response.internalError("Something went wrong");
    },
  },
});
```

---

## Execution Order

```
incoming request
  │
  ├─▶ make.onRequest → group.onRequest → action.onRequest
  │     return ResponseBuilder → short-circuit → jump to onResponse
  │     return void → continue
  │
  ├─▶ handler (if not short-circuited)
  │     request.validate() → may throw ValidationError → onError
  │     service.call() → Result → map to ResponseBuilder
  │
  ├─▶ action.onResponse → group.onResponse → make.onResponse
  │     always runs, mutates builder
  │
  └─▶ send builder.toReplyValue()

any unexpected throw → onError → ResponseBuilder → onResponse → send
```

---

## Auto-Documentation Benefits

| Feature               | How It Works                                                                  |
| --------------------- | ----------------------------------------------------------------------------- |
| **Service Errors**    | `Result<T, 'error_code'>` uses string literals → statically analyzable        |
| **Validation Errors** | `ValidationError` is a known type → docs can list common validation failures  |
| **Hook Responses**    | `ResponseBuilder` return types → docs can scan for status codes               |
| **No Hidden Throws**  | Only `ValidationError` and `FrameworkError` throw → predictable error surface |

---

## Summary Checklist

1. **Services** return `Result<T, E>` with `result.success()` / `result.failure()`.
2. **Validation** throws `ValidationError` → caught by `onError`.
3. **Handlers** map `Result` to `ResponseBuilder`; no `try/catch` for services.
4. **Hooks** return `ResponseBuilder` to short-circuit, `void` to continue.
5. **`request()`** panics on misuse; `request.validate()` throws on schema failure.
6. **`onResponse`** always runs; mutates builder by reference.
7. **`onError`** catches validation throws and unexpected errors; differentiates by `instanceof`.
8. **All error paths** are statically analyzable for auto-docs.

---

## Why This Model Works for Enterprise

| Concern                    | Solution                                                                          |
| -------------------------- | --------------------------------------------------------------------------------- |
| **Deep nested throws**     | Services use `Result`; only validation throws (centralized)                       |
| **Error differentiation**  | `onError` uses `instanceof` for `ValidationError`, `FrameworkError`, etc.         |
| **Auto-documentation**     | `Result` codes are string literals; `ValidationError` is a known type             |
| **Framework safety**       | `panic()` crashes loudly on misuse (dev), caught by `onError` (prod)              |
| **Consistency**            | User code = minimal throws. Framework internals = throws only for validation/bugs |
| **Hook short-circuit**     | Return `ResponseBuilder`, no new types needed                                     |
| **Validation boilerplate** | Centralized in `onError`, not repeated in every handler                           |

This architecture delivers Rust/Go-style error handling with TypeScript ergonomics, optimized for enterprise readability, maintainability, and documentation generation.
