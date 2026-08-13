# @aromix/core

Tiny, dependency-free process orchestrator for Aromix.

## Install

```bash
npm install @aromix/core
```

## Usage

```ts
import { program, unit } from '@aromix/core'

const db = unit({
  name: 'db',
  async start() { /* connect */ },
  async stop() { /* disconnect */ },
})

const http = unit({
  name: 'http',
  async start() { /* listen */ },
  async stop() { /* close */ },
})

const app = program()
app.register(db)   // starts first
app.register(http) // starts second

await app.start()
// On SIGINT/SIGTERM: http stops, then db, then process exits.
```

Units starts in registration order and stops in reverse. If a unit fails to start, whatever units already started gets stopped.

`unit()` is just an identity helper for typing, pass a plain `{ name, start, stop? }` object if you'd rather skip it.

## License

MIT