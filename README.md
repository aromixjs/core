# @aromix/core

Process orchestrator and telemetry primitive for the Aromix ecosystem.

## Install

```bash
npm install @aromix/core
```

## Concepts

Aromix is built on two core primitives:

- **System** — a process orchestrator that manages the lifecycle of units (start, stop, graceful shutdown).
- **Track** — a telemetry primitive that provides logging, metrics, and tracing. All units build on top of Track for observability.

Everything else (MongoDB, workflows, etc.) are **units** that plug into System and use Track internally.

## System

System orchestrates units. It registers them, starts them in order, and stops them in reverse order. It also wires `SIGINT`/`SIGTERM` for graceful shutdown.

```ts
import { system } from '@aromix/core'

const app = system()

app.register(() => import('./my-unit'))
app.register(() => import('./another-unit'))

await app.start() // starts my-unit, then another-unit

// on SIGINT/SIGTERM: stops another-unit, then my-unit
```

### API

#### `system()`

Creates a new system instance.

```ts
const app = system()
```

Returns `{ register, start, stop }`.

#### `register(loader)`

Registers a unit via a lazy import loader. The loader must return `{ default: Unit }`.

```ts
app.register(() => import('./my-unit'))
```

Units are loaded and started in registration order when `start()` is called.

#### `start()`

Loads all registered units, starts them sequentially, and wires OS signals for graceful shutdown.

If any unit fails to start, all previously started units are stopped and the error is re-thrown.

```ts
await app.start()
```

#### `stop()`

Stops all started units in reverse order.

```ts
await app.stop()
```

### Unit Interface

A unit is any object with a `name`, a `start()` method, and an optional `stop()` method:

```ts
interface Unit {
  name: string
  start(): void | Promise<void>
  stop?(): void | Promise<void>
}
```

Units are identified by name. Registering two units with the same name throws an error.

## Track

Track is the telemetry primitive. It provides three methods: `log`, `metric`, and `time`. Units use Track to emit observability events. You configure Track with handlers that forward events to external services.

```ts
import { track } from '@aromix/core'

// Emit a log
track.log({ name: 'app.started', level: 'info', attributes: { port: 3000 } })

// Emit a metric
track.metric({ name: 'http.request_count', value: 1, attributes: { path: '/api' } })

// Trace an async operation
const result = await track.time({
  name: 'db.query',
  attributes: { query: 'SELECT *' },
  run: () => db.query('SELECT * FROM users'),
})
```

### API

#### `track.log(input)`

Emits a log event.

```ts
track.log({
  name: 'user.created',
  level: 'info',           // 'debug' | 'info' | 'warn' | 'error' (default: 'info')
  attributes: {            // optional key-value pairs
    userId: '123',
    email: 'alice@example.com',
  },
})
```

#### `track.metric(input)`

Emits a metric event with a numeric value.

```ts
track.metric({
  name: 'mongo.query.duration_ms',
  value: 42,
  attributes: {
    collection: 'users',
    command: 'find',
  },
})
```

#### `track.time(input)`

Traces an async operation. Executes `run()`, measures duration, and emits a trace event with status `ok` or `error`.

```ts
const result = await track.time({
  name: 'mongo.client.connect',
  attributes: { cluster: 'primary' },
  run: () => client.connect(),
})
```

If `run()` throws, the trace is recorded with status `error` and the error is re-thrown.

### Configuration

Configure Track by calling it as a function with handlers:

```ts
import { track } from '@aromix/core'

track({
  onLog: (event) => {
    // event: { id, timestamp, name, level, attributes }
    console.log(`[${event.level}] ${event.name}`, event.attributes)
  },
  onMetric: (event) => {
    // event: { id, timestamp, name, value, attributes }
    metricsClient.gauge(event.name, event.value, event.attributes)
  },
  onTrace: (event) => {
    // event: { id, startTime, endTime, durationMs, name, status, attributes }
    spans.push(event)
  },
})
```

Handlers can return a `Promise` — errors in handlers are caught and logged to `console.error`.

### Event Types

All events include `id` (UUID), `timestamp` (ms), `name`, and optional `attributes`.

| Event | Fields |
|-------|--------|
| `LogEvent` | `id`, `timestamp`, `name`, `level`, `attributes?` |
| `MetricEvent` | `id`, `timestamp`, `name`, `value`, `attributes?` |
| `TraceEvent` | `id`, `startTime`, `endTime`, `durationMs`, `name`, `status`, `attributes?` |

## Creating a Unit

A unit is a module that exports a default object implementing the `Unit` interface. Units use Track for observability.

```ts
// my-unit/index.ts
import { track } from '@aromix/core'

const unit = {
  name: 'my-unit',

  async start() {
    track.log({ name: 'my-unit.starting' })

    // ... initialize resources

    track.log({ name: 'my-unit.ready' })
  },

  async stop() {
    track.log({ name: 'my-unit.stopping' })

    // ... cleanup resources

    track.log({ name: 'my-unit.stopped' })
  },
}

export default unit
```

Register it with System:

```ts
import { system } from '@aromix/core'

const app = system()
app.register(() => import('./my-unit'))

await app.start()
```

## Full Example

Wiring System with `@aromix/mongodb` as a unit:

```ts
import { system, track } from '@aromix/core'
import { cluster, model, repository } from '@aromix/mongodb'
import * as v from 'valibot'

// 1. Configure Track
track({
  onLog: (e) => console.log(`[${e.level}] ${e.name}`, e.attributes),
  onMetric: (e) => console.log(`[metric] ${e.name}=${e.value}`, e.attributes),
  onTrace: (e) => console.log(`[trace] ${e.name} ${e.durationMs}ms (${e.status})`),
})

// 2. Define a model
const userSchema = v.object({
  _id: v.optional(v.string()),
  name: v.string(),
  email: v.string(),
})

const user = model({ name: 'users', schema: userSchema })

// 3. Create a MongoDB cluster (unit)
const db = cluster({
  name: 'app-db',
  uri: 'mongodb://localhost:27017/',
  databases: { main: 'myapp' },
})

// 4. Create a repository
const repo = repository({ model: user, database: db.db('main') })

// 5. Orchestrate with System
const app = system()

app.register(() => import('./units/mongodb'))  // unit that wraps db.start()/stop()
app.register(() => import('./units/api'))      // your API server unit

await app.start()

// Use the repository
await repo.insertOne({ data: { name: 'Alice', email: 'alice@test.com' } })
```

## Ecosystem

| Package | Description |
|---------|-------------|
| `@aromix/core` | Process orchestrator and telemetry primitive |
| `@aromix/mongodb` | MongoDB unit — cluster, model, repository with lifecycle hooks |
| `@aromix/workflow` | Workflow orchestration unit |

All units depend on `@aromix/core` and use Track for observability.

## License

MIT
