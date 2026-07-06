# Aromix Tracking — Spec v1

```typescript
interface LogEvent {
	id: string
	timestamp: number
	name: string
	level: 'debug' | 'info' | 'warn' | 'error'
	attributes?: Record<string, unknown>
}

interface MetricEvent {
	id: string
	timestamp: number
	name: string
	value: number
	attributes?: Record<string, unknown>
}

interface TraceEvent {
	id: string
	timestamp: number
	name: string
	durationMs: number
	status: 'ok' | 'error'
	attributes?: Record<string, unknown>
}

interface Sink {
	writeLogs?(events: LogEvent[]): Promise<void>
	writeMetrics?(events: MetricEvent[]): Promise<void>
	writeTraces?(events: TraceEvent[]): Promise<void>
}

namespace track {
	function log(input: { name: string; level?: LogEvent['level']; attributes?: Record<string, unknown> }): void
	function metric(input: { name: string; value: number; attributes?: Record<string, unknown> }): void
	function time<T>(input: { name: string; fn: () => Promise<T>; attributes?: Record<string, unknown> }): Promise<T>
	function context(values: Record<string, unknown>): void
	function config(options: { sinks: Sink[]; context?: Record<string, unknown> }): void
}

function fail(input: { message: string; cause?: unknown; attributes?: Record<string, unknown> }): never
```

## Usage

```typescript
// config/tracking.ts
import { track, sqliteSink, httpForwardSink } from '@aromix/core'

track.config({
	sinks: [sqliteSink('./data/tracking.sqlite'), httpForwardSink({ url: env('VENDOR_URL') })],
	context: { release: env('APP_VERSION') },
})
```

```typescript
// inside any unit — db/primary.ts
await track.time({ name: 'mongo.connect', fn: () => client.connect() })
```

```typescript
// inside any unit calling a third party
await track.time({
	name: 'stripe.charge.create',
	fn: () => stripe.charges.create({ amount }),
	attributes: { dependency: 'stripe', amount },
})
```

```typescript
// inside a request handler, once auth resolves
track.context({ userId: user.id, sessionId: session.id })
```

```typescript
// business event
track.log({ name: 'order.placed', attributes: { orderId, amount } })
```

```typescript
// metric
track.metric({ name: 'cache.hit_ratio', value: 0.92, attributes: { store: 'redis' } })
```

```typescript
// error path
try {
	await charge()
} catch (err) {
	fail({ message: 'charge failed', cause: err, attributes: { orderId } })
}
```