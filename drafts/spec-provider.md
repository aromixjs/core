## Service

A way to group logic with optional lifecycle. No scoping, no registry,
no injection. Cross-communication is direct imports.

---

### Definition

```ts
const MailService = service((ctx) => {
  let client: SMTPClient;

  ctx.lifecycle({
    async setup() {
      client = await SMTP.connect(config("mail"));
    },
    async teardown() {
      await client.disconnect();
    },
  });

  ctx.expose({
    async send(to: string, subject: string) {
      await client.send({ to, subject });
    },
  });
});
```

- everything inside is private by default
- `ctx.expose()` is the only public surface
- `ctx.lifecycle()` is optional — only needed if async init or cleanup is required
- no scoping, no registry, no injection
- cross-communication is direct import and call

---

### ctx

```ts
interface ServiceCtx {
  lifecycle(hooks: {
    setup?(): Promise<void> | void;
    teardown?(): Promise<void> | void;
  }): void;

  expose<T extends Record<string, unknown>>(api: T): void;
}
```

That is the entire ctx surface. Nothing else.

---

### Cross-communication

```ts
const UserService = service((ctx) => {
  async function create(data: CreateUserData) {
    const user = await UserModel.insert(data);
    await MailService.send(user.email, "Welcome");
    return user;
  }

  ctx.expose({ create });
});
```

Direct import and call. No resolvers, no ctx.use, no injection.

---

### Lifecycle

```
setup     — async init, runs before service is used
teardown  — best effort cleanup

daemon (Bun, Node, Deno)
  setup    — runs once at app start if eagerLoaded
             runs on first call if not eagerLoaded
  teardown — runs on graceful shutdown via SIGTERM
             not guaranteed on SIGKILL

edge (Cloudflare Workers)
  setup    — runs once per request before any handler or hook fires
  teardown — no-op, edge isolate dies after response
```

---

### Eager loading

Services with `setup()` should be eager loaded — otherwise the first
call blocks until init completes.

```ts
app.eagerLoad(MailService);
```

Framework warns at startup if a service has `setup()` but is not eager loaded:

```
⚠ MailService has setup() but is not eager loaded.
  First call will block until initialization completes.
  Consider: app.eagerLoad(MailService)
```

---

### Usage in programs

Direct call. No deps object, no resolvers.

```ts
const userProgram = program();

userProgram.command("Register", async (ctx) => {
  return UserService.create(ctx.args(CreateUserData));
});

userProgram.command("Send", async (ctx) => {
  await MailService.send(ctx.args(Args).to, ctx.args(Args).subject);
});
```

---

### Plugin registration

Only needed for eager loading. Services do not need to be registered
otherwise — just import and call.

```ts
export const mailPlugin = plugin((app) => {
  app.eagerLoad(MailService);
  app.eagerLoad(DbService);
  app.program(userProgram);
});
```

---

### Teardown reliability

| runtime            | teardown reliable |
| ------------------ | ----------------- |
| Bun                | ✅ via SIGTERM    |
| Node               | ✅ via SIGTERM    |
| Deno               | ✅ via SIGTERM    |
| Cloudflare Workers | ❌ no-op          |

Do not put critical logic in teardown. Transactions, payments, and
state writes belong in the command itself.

---

## Model

Built on top of service. Same pattern — ctx gets base query methods
added by the DB plugin in addition to lifecycle and expose.

```ts
const UserModel = model(userSchema, (ctx) => {
  ctx.lifecycle({
    async setup() {
      // runs after adapter has bound ctx.find, ctx.insert etc
    },
  });

  async function findActive() {
    return ctx.find({ status: "active" });
  }

  async function deleteCascade(id: string) {
    await PostModel.deleteMany({ userId: id });
    await ctx.deleteById(id);
  }

  ctx.expose({ findActive, deleteCascade });
});
```

Base methods on ctx come from the DB adapter — typed from the schema.
Custom methods follow the same pattern as service — private by default,
exposed explicitly.

### Model ctx

```ts
interface ModelCtx<TSchema> extends ServiceCtx {
  // base query methods — bound by DB adapter
  find(query?: Partial<TSchema>): Promise<TSchema[]>;
  findById(id: string): Promise<TSchema | null>;
  insert(data: Partial<TSchema>): Promise<TSchema>;
  update(id: string, data: Partial<TSchema>): Promise<TSchema>;
  deleteById(id: string): Promise<void>;
  deleteMany(query: Partial<TSchema>): Promise<void>;
}
```

### Built on top of service

```
service()     — base primitive, lifecycle + expose
  model()     — service + ctx query methods  (from DB plugin)
  cron()      — service + ctx.scheduler      (from CronPlugin)
  workflow()  — service + ctx.step           (from WorkflowPlugin)
  job()       — service + ctx.queue          (from QueuePlugin)
```

All follow the same pattern — `ctx.lifecycle()`, `ctx.expose()`,
`app.eagerLoad()`. No new concepts at each level.
