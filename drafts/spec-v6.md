# Aromix Specification v6

## 1. Config

Static object or factory function for application configuration.

```ts
// config.ts
export default config({
    db: {
        uri: env('MONGO_URI'),
        dbName: env('MONGO_DB', 'myapp'),
        poolSize: 10,
    },
    server: { port: 3000 },
})

// factory form — when values depend on each other
export default config(() => {
    const dbName = env('MONGO_DB', 'myapp')
    return {
        db: { uri: env('MONGO_URI'), dbName },
        cache: { prefix: `${dbName}:cache` },
    }
})

// env() — reads env var, throws if missing and no fallback
env('MONGO_URI')
env('PORT', '3000') // fallback

// config() — access anywhere after serve() starts
import { config } from 'aromix'
config('db.uri')
```

---

## 2. Schema & Models

Single definition for DB structure, types, and validation.

### Schema

```ts
export const userSchema = schema('users', (t) => {
    t.increments('id')
    t.string('name').notNullable()
    t.string('status').defaultTo('draft')
    t.integer('author_id').unsigned().references(authorSchema.id)
    t.timestamps(true, true)
})

type User = InferSchema<typeof userSchema>
// a standard schema compatible validator
const userValidator = userSchema.validator
```

### Model

Extends a typed base class. Base methods are fully typed from the schema.

```ts
@provide()
class UserModel extends Model(userSchema) {
    private history = inject(HistoryModel)

    async findActive() {
        return this.find({ status: 'active' })
    }

    async deleteCascade(id: string) {
        await this.history.deleteMany({ userId: id })
        await this.deleteById(id)
    }
}
```

---

## 3. Services

Class-based units of logic with dependency injection and lifecycle.

```ts
@provide()
class UserService {
    private mail = inject(MailService)
    private db = inject(DbService)

    async create(data: CreateUserData) {
        const user = await this.db.users.insert(data)
        await this.mail.send(user.email, 'Welcome')
        return user
    }
}

@provide()
class MailService implements Lifecycle {
    private client: SMTPClient

    async setup() {
        this.client = await SMTP.connect(config('mail'))
    }

    async teardown() {
        await this.client.disconnect()
    }
}
```

---

## 4. Jobs, Cron & Workflows

### Job

```ts
const SendEmailJob = Job.define({
    name: 'send-email',
    queue: 'mail',
    input: v.object({ to: v.string(), subject: v.string() }),
    async run(payload) {
        const mail = inject(MailService)
        await mail.send(payload.to, payload.subject)
    },
})

await SendEmailJob.dispatch({ to: 'a@b.com', subject: 'Hi' })
```

### Cron

```ts
const CleanupCron = Cron.define({
    name: 'cleanup',
    schedule: '0 * * * *',
    async run() {
        const users = inject(UserService)
        await users.deleteInactive()
    },
})
```

### Workflow

Durable execution engine with persistent steps.

```ts
const OnboardingWorkflow = Workflow.define({
    name: 'onboarding',
    input: v.object({ userId: v.string() }),
    steps: (wire) => [
        wire(FetchUser, { input: (ctx) => ({ userId: ctx.input.userId }) }),
        wire(SendWelcome, {
            when: (ctx) => ctx.steps.FetchUser.verified,
            input: (ctx) => ({ to: ctx.steps.FetchUser.email }),
        }),
    ],
})
```

---

## 5. Program

Commands, streams, and sockets grouped under a name. Uses MessagePack encoding.

```ts
const user = program({
    name: 'user',
    deps: {
        user: inject(UserModel),
        product: inject.facade(ProductService), // facade makes it  destructurable
    },
    hooks: [authHook],
})

user.command({
    name: 'create',
    input: v.object({ name: v.string(), email: v.string() }),
    output: userSchema,
    run(input, deps) {
        return deps.user.create(input)
    },
})

user.stream({
    name: 'feed',
    input: v.object({ cursor: v.string().optional() }),
    events: v.object({ data: v.array(userSchema) }),
    run(input, stream, deps) {
        const items = await deps.db.getFeed(input)
        stream.emit('data', items)
    },
})

user.socket({
    name: 'presence',
    receive: v.object({ join: v.object({ userId: v.string() }) }),
    send: v.object({ joined: v.object({ userId: v.string() }) }),
    run(socket, deps) {
        socket.on('join', (data) => socket.emit('joined', data))
    },
})
```

---

## 6. View (.siz)

A custom component-based view engine.

```sliz
export component Button {
  <script>
    const props = defineProps({ label: String })
    const count = obs(0)
  </script>

  <button onclick={() => count = count + 1}>
    {props.label}: {count}
  </button>
}
```

---

## 7. Routing

```ts
const root = router({ prefix: '/admin' })

root.on('/').render(Home)
root.on('/user/:id').handle((ctx) => {
    const data = inject(UserModel).findById(ctx.url.param)
    ctx.render(UserPage, { user: data })
})
```

---

## 8. Hooks

```ts
export type Hook =
    | { on: 'Ready'; run: () => void | Promise<void> }
    | { on: 'Close'; run: () => void | Promise<void> }
    | { on: 'Request'; run: RequestHook }
    | { on: 'Response'; run: ResponseHook }
    | { on: 'Error'; run: ErrorHook }
```

---

## 9. Plugins

Owns and registers all primitives.

```ts
export const userPlugin = plugin((app) => {
  app.eagerLoad(MailService)
  app.model(UserModel)
  app.job(SendEmailJob)
  app.cron(CleanupCron)
  app.workflow(OnboardingWorkflow)
  app.program(userProgram)

  app.decorate("myHelper", () => { ... })
});
```

---

## 10. Bootstrap

Entry point to wire everything together.

```ts
const app = make({
    programs: [userProgram],
    services: [GlobalService],
    hooks: [globalHook],
    routes: [root],
})

app.use(MongoPlugin)
app.use(userPlugin)

app.static({ path: './assets', prefix: '/files' })

serve(app, config)
```
