## 1. Config

Configuration is defined as a static object or a factory function.

```ts
import { config } from '@aromix/core'

export default config({
    db: { uri: env('DATABASE_URL'), poolSize: 10 },
    server: { port: env('PORT', '3000') },
})
```

```ts
import { config } from '@aromix/core'

export default config(() => {
    const db = env('DATABASE_URL')
    return { db: { uri: db }, cache: { prefix: `${db.name}:cache` } }
})
```

```ts
import { config } from '@aromix/core'
const uri = config.get('db.uri')
const fullDb = config.get('db')
```

## 2. Entity

An entity defines a storage adapter, schema, and lifecycle hooks. The client receives a reactive CRUD + subscription API.

```ts
const UserEntity = entity({
    name: 'user',
    storage: 'postgres', // sqlite | postgres | d1 | mysql | kv | s3
    schema: (builder) => {
        builder.increments('id')
        builder.string('name').notNullable()
        builder.string('email').unique()
        builder.string('status').defaultTo('active')
        builder.integer('org_id').references(OrgEntity.schema.id)
        builder.timestamps(true, true)
    },
    hooks: (ctx) => {
        ctx.beforeInsert(async (data, { user }) => {
            if (user.role !== 'admin') {
                throw new Error('Forbidden')
            }
            data.id = crypto.randomUUID()
        })
        ctx.afterUpdate(async (data, { user }) => {
            await SendEmailJob.dispatch({
                to: data.email,
                subject: 'Updated',
            })
        })
    },
})
```

### Storage‑Specific Client API

| Storage | Client Methods                                                           |
| ------- | ------------------------------------------------------------------------ |
| SQL     | `find()`, `findOne()`, `insert()`, `update()`, `delete()`, `subscribe()` |
| KV      | `get()`, `set()`, `delete()`, `list()`                                   |
| S3      | `upload()`, `get()`, `delete()`, `list()`                                |

### Client Usage

```ts
const users = client.entity(UserEntity)
const active = users.subscribe({ status: 'active' })
active.on('change', (data) => render(data))

await users.insert({ name: 'Alice', email: 'a@b.com' })
await users.update('123', { status: 'inactive' })
```

## 3. Workflows & Steps

Durable execution for multi‑step processes. Steps are reusable.

### Step Definition

```ts
import { Workflow } from "aromix";
import { v } from "valibot";

export const ProcessVideo = Workflow.step({
  name: "process-video",
  input: v.object({ path: v.string() }),
  output: v.object({ path: v.string() })
  async run(input) {
    return ffmpeg(input.path).compress();
  },
});
```

### Workflow Definition

```ts
import { Workflow } from 'aromix'

export const VideoWorkflow = Workflow.define({
    name: 'video-onboarding',
    input: v.object({ videoPath: v.string() }),
    steps: (wire) => [
        wire(ProcessVideo, {
            input: () => {
                const data = env('path')
                return { path: ctx.input.videoPath }
            },
        }),

        wire(SendNotification, {
            when: (ctx) => ctx.steps.ProcessVideo.success,
            input: { status: 'done' },
        }),
    ],
})
```

### Client Dispatch

```ts
await client.workflow(VideoWorkflow).trigger({ videoPath: '/upload/abc.mp4' })
```

## 4. Jobs & Crons

### Job Definition

```ts
import { Job } from 'aromix'
import { v } from 'valibot'

export const SendEmailJob = Job.define({
    name: 'send-email',
    queue: 'mail',
    input: v.object({ to: v.string(), subject: v.string() }),
    async run(payload) {
        await mail.send(payload.to, payload.subject)
    },
})
```

### Cron Definition

```ts
import { Cron } from 'aromix'

export const CleanupCron = Cron.define({
    name: 'cleanup',
    schedule: '0 * * * *', // every hour
    async run() {
        await UserEntity.delete({ active: false })
    },
})
```

### Client Dispatch

```ts
await client.job(SendEmailJob).dispatch({
    to: 'user@example.com',
    subject: 'Hello',
})
```

Jobs can also be enqueued from entity hooks.

---

## 5. SDK Generation

Generate the client SDK and documentation from your server definitions.

```bash
npx aromix generate --output ./sdk
```

Outputs:

- `client.js` – runtime client with single WebSocket connection
- `client.d.ts` – TypeScript definitions for all entities, workflows, jobs
- `docs/` – Markdown documentation

## 6. Client Usage

```ts
import { createClient } from './sdk/client'

const client = createClient('ws://localhost:3000', {
    authToken: getUserToken(),
})

// Entity
const users = client.entity(UserEntity)
const active = users.subscribe({ status: 'active' })
active.on('change', render)

// Workflow
await client.workflow(VideoWorkflow).trigger({ videoPath: '...' })

// Job
await client.job(SendEmailJob).dispatch({ to: 'a@b.com', subject: 'Hi' })
```

---

## 7. Orchestration & Serving

### Explicit Registration

The `make` function orchestrates the application, and `serve` handles the deployment using a runtime adapter.

```ts
import { serve } from '@aromix/node'
import { make } from '@aromix/core'
import { CleanupCron } from './crons'
import { OrgEntity, UserEntity } from './entities'
import { SendEmailJob } from './jobs'
import { VideoWorkflow } from './workflows'

const app = make({
    entities: [UserEntity, OrgEntity],
    workflows: [VideoWorkflow],
    jobs: [SendEmailJob],
    crons: [CleanupCron],
})

app.use(AuditLogPlugin)
serve(app, config)
```

## 8. Plugins

Plugins extend the framework (admin UI, validation, static serving, etc.).

### Defining a Plugin

```ts
import { plugin } from 'aromix'

export const AdminPanel = plugin((app) => {
    const entities = app.entities

    app.hook({
        on: 'HttpRequest',
        run: async (req, res) => {
            if (req.url === '/admin') {
                const html = generateAdminUI(entities)
                res.writeHead(200, { 'Content-Type': 'text/html' })
                res.end(html)
                return true
            }
        },
    })
})

export const ValidateEnv = plugin((app) => {
    app.hook({
        on: 'Ready',
        run: () => {
            if (!process.env.DATABASE_URL) {
                throw new Error('DATABASE_URL missing')
            }
        },
    })
})
```

### Using Plugins

```ts
app.use(ValidateEnv)
app.use(AdminPanel)
app.use(staticPlugin)
```
