### Schema

Single definition that produces the DB table structure, a TypeScript
type, and a valibot validator — no duplication.

```ts
export const userSchema = schema('users', (t) => {
      t.increments('id')
      t.string('name').notNullable()
      t.string('status').defaultTo('draft')
      t.integer('author_id').unsigned().references(authorSchema.id)
      t.timestamps(true, true)
})
```

Type extraction:

```ts
type User = InferSchema<typeof userSchema>
// {
//   id:         number
//   name:       string
//   status:     string
//   author_id:  number
//   created_at: Date
//   updated_at: Date
// }
```

Validator — auto-generated valibot schema from the same definition:

```ts
userSchema.validator  // valibot schema, ready to use anywhere

// use in workflow steps
const FetchUser = Workflow.step({
  output: userSchema.validator,
  async run(input) { ... }
})

// use in commands
userProgram.command('Create', async (ctx) => {
  const data = ctx.args(userSchema.validator)
  ...
})
```

Field types:

```
t.increments()          → number (auto-increment primary key)
t.string()              → string
t.integer()             → number
t.boolean()             → boolean
t.float()               → number
t.text()                → string
t.json()                → unknown
t.enum([...values])     → union of values
t.timestamps()          → { created_at: Date, updated_at: Date }
t.references(schema.id) → foreign key, typed to referenced schema id
```

Modifiers:

```
.notNullable()          — required field
.nullable()             — optional field
.defaultTo(value)       — default value
.unique()               — unique constraint
.unsigned()             — positive numbers only
```

---

### Service

A class-based unit of logic with optional lifecycle and dependency
injection.

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
```

- `@provide()` marks the class as injectable
- `inject()` in class fields resolves dependencies

```ts
@provide()
class MailService {
      private client: SMTPClient

      async setup() {
            this.client = await SMTP.connect(config('mail'))
      }

      async teardown() {
            await this.client.disconnect()
      }

      async send(to: string, subject: string) {
            await this.client.send({ to, subject })
      }
}
```

Lifecycle:

```
setup()     — async init, runs before service is used
teardown()  — best effort cleanup, runs on graceful shutdown
             — not guaranteed on edge runtimes
```

Plugin registration:

```ts
export const mailPlugin = plugin((app) => {
      app.eagerLoad(MailService) // has setup — must be eager
      app.program(userProgram)
      // UserService — lazy, no registration needed
})
```

---

### Model

Extends a typed base class generated from the schema. Base methods are
fully typed from the schema definition. Custom methods extend on top.

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

Base methods — typed from schema:

```
this.find(query)
this.findById(id)
this.insert(data)
this.update(id, data)
this.deleteById(id)
this.deleteMany(query)
```

Plugin registration:

```ts
export const userPlugin = plugin((app) => {
      app.model(UserModel)
})
```

---

### Job

A named handler for a queued payload. Input validated via valibot schema.

```ts
const SendEmailJob = Job.define({
      name: 'send-email',
      queue: 'mail',
      retry: { attempts: 3, backoff: 'exponential' },

      input: v.object({
            to: v.string(),
            subject: v.string(),
            body: v.string(),
      }),

      async run(payload) {
            const mail = inject(MailService)
            await mail.send(payload.to, payload.subject, payload.body)
      },
})
```

Dispatching:

```ts
await SendEmailJob.dispatch({ to: 'a@b.com', subject: 'Hi', body: '...' })

await SendEmailJob.dispatch(payload, { delay: '10m', priority: 'high' })
```

Plugin registration:

```ts
export const mailPlugin = plugin((app) => {
      app.job(SendEmailJob)
})
```

---

### Cron

A scheduled job. Same pattern as Job.

```ts
const CleanupCron = Cron.define({
      name: 'cleanup',
      schedule: '0 * * * *',
      retry: { attempts: 2 },

      async run() {
            const users = inject(UserService)
            await users.deleteInactive()
      },
})
```

Plugin registration:

```ts
export const appPlugin = plugin((app) => {
      app.cron(CleanupCron)
})
```

---

### Workflow

A durable execution engine. Steps are standalone reusable units —
no knowledge of the workflow they will be used in. Each step's input
and output is validated via valibot schema and persisted in SQLite.
Any step can be re-run independently without replaying the full workflow.

#### Step

```ts
const FetchUser = Workflow.step({
      name: 'fetch-user',
      input: v.object({ userId: v.string() }),
      output: userSchema.validator,

      async run(input) {
            return inject(UserModel).findById(input.userId)
      },
})

const GenerateImage = Workflow.step({
      name: 'generate-image',
      timeout: '2m',
      retry: { attempts: 'per-key', keys: ['OPENAI_KEY_1', 'OPENAI_KEY_2'] },

      input: v.object({ prompt: v.string() }),
      output: v.object({ url: v.string() }),

      async run(input, { key }) {
            return inject(ImageService).generate(input.prompt, key)
      },
})

const SendWelcome = Workflow.step({
      name: 'send-welcome',
      retry: { attempts: 3, backoff: 'exponential' },

      input: v.object({ to: v.string(), name: v.string() }),
      output: v.null(),

      async run(input) {
            await inject(MailService).send(input.to, `Welcome ${input.name}`)
      },
})

const ProcessVideo = Workflow.step({
      name: 'process-video',
      timeout: '5m',
      retry: { attempts: 2 },

      input: v.object({ path: v.string() }),
      output: v.object({ path: v.string(), size: v.number() }),

      async run(input) {
            return ffmpeg(input.path).compress()
      },
})
```

Step config:

```
name       — unique identifier, used for re-runs and UI
input      — valibot schema, validated before run
output     — valibot schema, validated after run, persisted to SQLite
retry      — attempts, backoff strategy, per-key rotation
timeout    — max duration before step is killed and retried
```

Retry config:

```
attempts: number        — fixed retry count
attempts: 'per-key'     — tries each key before failing
backoff:  'fixed'       — same delay between retries
backoff:  'exponential' — increasing delay between retries
delay:    '1s' | '30s'  — base delay between retries
keys:     string[]      — env key names, rotated on failure
```

#### Workflow

Wires steps together. Input mappings and conditions are fully typed
from each step's input and output schema.

```ts
const OnboardingWorkflow = Workflow.define({
      name: 'onboarding',
      input: v.object({ userId: v.string() }),

      steps: (wire) => [
            wire(FetchUser, { input: (ctx) => ({ userId: ctx.input.userId }) }),

            wire(GenerateImage, {
                  input: (ctx) => ({ prompt: ctx.steps.FetchUser.name }),
            }),

            wire(SendWelcome, {
                  when: (ctx) => ctx.steps.FetchUser.verified,
                  input: (ctx) => ({
                        to: ctx.steps.FetchUser.email,
                        name: ctx.steps.FetchUser.name,
                  }),
            }),

            wire(ProcessVideo, {
                  parallel: true,
                  input: (ctx) => ({ path: ctx.input.videoPath }),
            }),
      ],
})
```

`wire()` config:

```
input     — maps ctx to step input, typed from step input schema
when      — condition, step skipped if false
parallel  — runs without waiting for previous steps
```

`ctx` inside wire callbacks:

```
ctx.input      — workflow input, typed from workflow input schema
ctx.steps.X    — output of step X, typed from that step's output schema
```

Triggering:

```ts
// full workflow
await OnboardingWorkflow.trigger({ userId: '123' })

// re-run from a specific step — previous outputs pulled from SQLite
await OnboardingWorkflow.rerun('generate-image', { workflowRunId: 'wf_123' })

// run a step standalone — completely outside a workflow
await FetchUser.run({ userId: '123' })
```

Persistence — each step run stored independently:

```
workflow_runs — id, name, input, status, created_at
step_runs     — id, workflow_run_id, step_name, input, output, status, attempts, created_at
```

Re-running a step pulls its dependencies' outputs from `step_runs` —
nothing before the target step is re-executed.

Plugin registration:

```ts
export const userPlugin = plugin((app) => {
      app.workflow(OnboardingWorkflow) // steps auto-registered from workflow
})
```

---

### Program

Commands, streams, and sockets grouped under a name. Dependencies
resolved at program level are shared across all commands.

```ts
const userProgram = program({
      name: 'users',
      deps: { users: inject(UserService), mail: inject(MailService) },
})

userProgram.command('Register', async (ctx) => {
      return ctx.deps.users.create(ctx.args(userSchema.validator))
})

userProgram.command('Deactivate', async (ctx) => {
      await ctx.deps.users.deactivate(ctx.args(v.object({ id: v.string() })).id)
})

userProgram.stream('GetAll', async (ctx) => {
      return ctx.deps.users.findAll()
})
```

---

### Plugin

Owns and registers all primitives.

```ts
export const userPlugin = plugin((app) => {
      app.eagerLoad(MailService)
      app.model(UserModel)
      app.job(SendEmailJob)
      app.cron(CleanupCron)
      app.workflow(OnboardingWorkflow)
      app.program(userProgram)
})
```

```ts
const app = make()

app.use(MongoPlugin)
app.use(QueuePlugin)
app.use(userPlugin)
app.use(orderPlugin)

serve(app, config)
```
