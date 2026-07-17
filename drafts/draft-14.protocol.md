# Aromix — Blueprint: Wire Protocol, Receive & Send

**Package:** `@aromix/core`, `@aromix/client`
**Status:** Pre-implementation, pending review

---

## Core Philosophy

Aromix is not REST. It is not RPC. It is not JSON-only.

It is a **datatype-agnostic action-based framework** where:

- Every request is the same shape — action key in header + MessagePack body
- Every response is the same shape — MessagePack body, one transport header
- Binary data, structured data, and mixed data all travel in the same MessagePack payload — no separate binary transport
- The server describes itself by responding to a reserved system action — any client in any language derives types from it
- The client decides what to do with the data — server has no opinion on rendering or presentation
- Type safety is inferred by the compiler from handler code — no manual annotations needed

---

## Wire Format — MessagePack Everywhere

**MessagePack** is the single wire format for all data in both directions. Always.

Why MessagePack:
- Handles every data type natively — structured objects, raw binary (type 6), strings, arrays, numbers, booleans, null
- Binary is a first-class native type — files, images, CSV, video travel as-is, no base64, no encoding overhead
- Structured data and binary data can be mixed in the same payload naturally
- Length-prefixed — streaming is clean with no delimiter hacks needed
- 50+ language libraries — TypeScript, Python, PHP, Rust, Go all well maintained
- Simple spec — easy to implement a client in any language
- Server-side: faster than JSON
- Browser-side: JS library overhead for pure text data, but binary advantage outweighs it. WASM binding is a planned future optimization that improves this without any API changes

**No JSON. No form-data. No multipart. No base64. No content-type negotiation.**
Everything is MessagePack. Always. In both directions.

---

## Why Binary and Structured Data Are One Transport

In HTTP the traditional split is:
- JSON endpoint for data
- Separate endpoint or content-type for files

In Aromix there is no split. MessagePack's native Binary type means a file is just another field in the payload. A response can contain structured data AND a file in the same message. No special handling, no separate endpoint needed.

```
// example — action returns user info AND their avatar in one response
{
  name:   "istiuak",
  email:  "user@example.com",
  avatar: <Binary — raw PNG bytes>   // native MessagePack Binary type
}
```

Client receives one MessagePack payload. Decodes it. Gets typed struct with typed binary field. Does whatever it wants with the binary — display it, download it, save it. Server never decided.

This means there is no concept of a "file download endpoint" or "binary endpoint" — every action can return binary as naturally as it returns a string.

---

## Can The Browser Download A MessagePack File?

Yes. The client adapter handles this. The browser never sees raw MessagePack — the adapter decodes it and hands the binary field to user code as a `Uint8Array`. User code then decides:

```typescript
const res = await client.call("user:avatar", { id: "123" })

// res.avatar is Uint8Array — typed from schema
// client decides what to do:

// option 1 — trigger download
const blob = new Blob([res.avatar], { type: "image/png" })
const url  = URL.createObjectURL(blob)
const a    = document.createElement("a")
a.href     = url
a.download = "avatar.png"
a.click()

// option 2 — display in UI
const url = URL.createObjectURL(new Blob([res.avatar]))
imgElement.src = url

// option 3 — process locally
const processed = myImageProcessor(res.avatar)
```

Server sends bytes. Client decides. No browser magic needed, no special headers.

---

## Transport Header

One header tells the client how to consume the response body:

```
X-Aromix-Transport: value | stream | ws
```

| Value | Meaning | Body |
|---|---|---|
| `value` | Single MessagePack payload | One complete MessagePack item — can contain binary fields |
| `stream` | Server push stream | Concatenated MessagePack frames until connection closes |
| `ws` | WebSocket | Upgraded — MessagePack frames both directions |

Binary data travels inside `value` as a native MessagePack Binary field. There is no separate binary transport.

---

## Request Shape — Always

```
POST /__aromix
X-Action: group:action
Content-Type: application/msgpack
Body: MessagePack({ ...inputData })
```

Every request. No exceptions.

File upload — still the same:
```
Body: MessagePack({
  name:   "photo.png",
  file:   <Binary — raw bytes>,    // native MessagePack Binary type
  resize: true
})
```

No multipart. No form-data. Binary is native. Just include it.

---

## Response Shape

### value — Single Response

```
HTTP 200
X-Aromix-Transport: value
Content-Type: application/msgpack
Body: <one MessagePack item>
```

Can contain any combination of structured data and binary:

```
MessagePack({
  user:   { name: "istiuak", email: "..." },
  avatar: <Binary — raw bytes>,
  score:  42
})
```

### stream — Server Push

```
HTTP 200
X-Aromix-Transport: stream
Content-Type: application/msgpack
Transfer-Encoding: chunked
Body: <msgpack item><msgpack item><msgpack item>...
```

MessagePack is length-prefixed — frames are self-delimiting. No newlines, no `data:` prefix, no delimiters. Client reads frames until connection closes. Each frame is a complete MessagePack item.

### ws — WebSocket

```
HTTP 101 Switching Protocols
X-Aromix-Transport: ws
```

101 is mechanically required for browser WebSocket upgrade — the one exception to always-200. Both directions use MessagePack frames.

---

## HTTP Status

**Always 200** except:
- `101` for WebSocket upgrade — browser requires it
- `302` for redirects — browser requires it

No 404, no 500, no 401 at HTTP level. Everything is in the payload. Monitoring via server-side logging, not HTTP codes.

---

## System Actions — Reserved Header Prefix

Instead of a separate HTTP endpoint like `/__aromix/schema`, system operations use a reserved action prefix in the same `X-Action` header. The prefix `__` is reserved — user actions cannot start with `__`.

```
X-Action: __schema     → returns full schema descriptor
X-Action: __health     → health check
X-Action: __ping       → liveness probe
```

`aromix pull` uses this:

```bash
aromix pull --endpoint http://localhost:3000
# sends: POST /__aromix, X-Action: __schema
# receives: MessagePack schema descriptor
# generates: .aromix/types.d.ts
```

Same wire format, same headers, same transport. System actions are just actions with reserved names. No special HTTP endpoints. No separate route to configure or secure.

Disable in production:

```typescript
make({
  groups:  [UserGroup],
  system:  false,   // disables all __ reserved actions
})
```

---

## `receive()` — Reading The Incoming Message

Standalone import. Reads the incoming MessagePack-decoded message from AsyncLocalStorage. Called inside handler body — not as a default parameter.

```typescript
import { receive } from "@aromix/core"
```

### `receive()` — Raw

Returns the decoded message. Body is already MessagePack-decoded — handler receives native JS types.

```typescript
const msg = receive()

msg.body     // unknown — MessagePack decoded
msg.headers  // Record<string, string | string[]>
msg.cookies  // Record<string, string>
msg.ip       // string
msg.action   // "group:action"
```

### `receive.validate(schema)` — Validated and Typed

```typescript
const msg = receive.validate({
  body: v.object({
    id:   v.string(),
    file: v.bytes(),      // typed binary field
  })
})

msg.body.id    // string
msg.body.file  // Uint8Array — MessagePack Binary decoded
```

Validation fails → framework automatically sends error message back, handler never runs. Supports Valibot and Zod — auto-detected from schema object.

---

## `send()` — Sending A Message Back

Standalone import. Fluent builder. Returns a frozen value that `serve()` encodes as MessagePack and sends.

```typescript
import { send } from "@aromix/core"
```

### Value — Any Data

```typescript
send(data: unknown): SendValue
```

Any MessagePack-serializable value — objects, arrays, strings, numbers, binary, mixed. No concept of success or failure at this level. The data is the message.

```typescript
return send({ name: "istiuak", age: 19 })
return send(imageBuffer)                           // Uint8Array — native Binary
return send({ user, avatar: imageBuffer })         // mixed — structured + binary
return send("hello")
return send(null)
return send([1, 2, 3])
```

### Stream — Server Push

```typescript
send.stream<T>(run: (emit: (data: T) => void) => (() => void) | void): SendValue
```

```typescript
return send.stream<PostEvent>((emit) => {
  const unsub = eventBus.on("post", (e) => emit(e))
  return () => unsub()   // cleanup on disconnect
})
```

### WebSocket — Bidirectional

```typescript
send.ws<TIn, TOut>(handler: {
  onOpen?:   (ws: AromixSocket<TOut>) => void
  onMessage: (ws: AromixSocket<TOut>, msg: TIn) => void
  onClose:   (ws: AromixSocket<TOut>) => void
}): SendValue
```

```typescript
return send.ws<ChatMessage, ChatMessage>({
  onOpen:    (ws) => ws.send({ text: "connected", user: "system" }),
  onMessage: (ws, msg) => broadcast(msg),
  onClose:   (ws) => cleanup(ws),
})
```

## `send()` — Sending A Message Back

Standalone import. Fluent builder. Returns a frozen value that `serve()` encodes as MessagePack and sends.

```typescript
import { send } from "@aromix/core"
```

### Value — Any Data

```typescript
send(data: unknown): SendValue
```

Any MessagePack-serializable value — objects, arrays, strings, numbers, binary, mixed. No concept of success or failure at this level. The data is the message.

```typescript
return send({ name: "istiuak", age: 19 })
return send(imageBuffer)                    // Uint8Array — native Binary
return send({ user, avatar: imageBuffer })  // mixed — structured + binary
return send("hello")
return send(null)
return send([1, 2, 3])
```

### Stream — Server Push

```typescript
send.stream<T>(run: (emit: (data: T) => void) => (() => void) | void): SendValue
```

```typescript
return send.stream<PostEvent>((emit) => {
  const unsub = eventBus.on("post", (e) => emit(e))
  return () => unsub()   // cleanup on disconnect
})
```

### WebSocket — Bidirectional

```typescript
send.ws<TIn, TOut>(handler: {
  onOpen?:   (ws: AromixSocket<TOut>) => void
  onMessage: (ws: AromixSocket<TOut>, msg: TIn) => void
  onClose:   (ws: AromixSocket<TOut>) => void
}): SendValue
```

```typescript
return send.ws<ChatMessage, ChatMessage>({
  onOpen:    (ws) => ws.send({ text: "connected", user: "system" }),
  onMessage: (ws, msg) => broadcast(msg),
  onClose:   (ws) => cleanup(ws),
})
```

---

## Headers and Cookies — Chaining On `send()`

All three send types support fluent header and cookie chaining. Where the headers land depends on the transport type.

### Chain API

```typescript
interface SendChain {
  // single header
  header(key: string, value: string): this

  // multiple headers at once
  headers(record: Record<string, string>): this

  // single cookie
  cookie(name: string, value: string, options?: CookieOptions): this
}

interface CookieOptions {
  path?:     string
  domain?:   string
  maxAge?:   number      // seconds
  secure?:   boolean
  httpOnly?: boolean
  sameSite?: "strict" | "lax" | "none"
}
```

### Where Headers Land Per Transport

**`send(data)` — value response:**
Headers and cookies go on the response that carries the MessagePack body:

```typescript
return send({ token, user })
  .header("X-Request-Id", requestId)
  .headers({ "X-Version": "1", "X-Region": "us" })
  .cookie("session", token, { httpOnly: true, secure: true })
  .cookie("theme", "dark", { path: "/" })
```

**`send.stream()` — stream handshake:**
Headers and cookies go on the initial response that opens the stream connection. Once the stream is open, per-message metadata lives inside the message payload — not in headers.

```typescript
return send.stream<PostEvent>((emit) => {
  const unsub = eventBus.on("post", emit)
  return () => unsub()
})
.header("X-Stream-Id", streamId)
.cookie("session", token, { httpOnly: true })

// per-message metadata — inside the message, not headers
emit({ __id: msgId, title: "post", body: "..." })
```

**`send.ws()` — WebSocket upgrade handshake:**
Headers and cookies go on the 101 upgrade handshake. Once the connection is open, per-message metadata lives inside the message payload — WebSocket frames have no headers.

```typescript
return send.ws<ChatMessage, ChatMessage>({
  onOpen:    (ws) => ws.send({ text: "connected", user: "system" }),
  onMessage: (ws, msg) => broadcast(msg),
  onClose:   (ws) => cleanup(ws),
})
.header("X-Socket-Id", socketId)
.cookie("session", token, { httpOnly: true })

// per-message metadata — inside the ws.send() payload, not headers
ws.send({
  __meta: { timestamp: Date.now(), id: msgId },
  text:   "hello",
  user:   "istiuak",
})
```

### Rule

```
send(data).header()       → on the value response
send.stream().header()    → on the stream handshake
send.ws().header()        → on the WS upgrade handshake
ws.send(data)             → no headers — metadata inside the message
```

---

## Handler Examples

```typescript
import { group, action, receive, send, inject } from "@aromix/core"
import * as v from "valibot"

@group("user")
export class UserGroup {
  private users = inject(UserService)

  @action("get")
  get() {
    const msg  = receive.validate({ body: v.object({ id: v.string() }) })
    const user = this.users.find(msg.body.id)
    if (!user) return send({ error: "User not found" })
    return send(user)
  }

  @action("create")
  create() {
    const msg  = receive.validate({
      body: v.object({ name: v.string(), email: v.string() })
    })
    const user = this.users.create(msg.body)
    return send(user)
  }

  @action("avatar")
  avatar() {
    const msg    = receive.validate({ body: v.object({ id: v.string() }) })
    const avatar = this.users.getAvatar(msg.body.id)   // Buffer
    if (!avatar) return send({ error: "No avatar" })
    return send(avatar)   // Uint8Array — native MessagePack Binary
  }

  @action("profile")
  profile() {
    const msg  = receive.validate({ body: v.object({ id: v.string() }) })
    const user = this.users.find(msg.body.id)
    // structured + binary in one message — natural
    return send({
      name:   user.name,
      email:  user.email,
      avatar: user.avatar,   // Uint8Array
    })
  }

  @action("export")
  export() {
    const csv = this.users.toCsv()
    return send(csv)
      .header("X-Filename", "users.csv")
      .header("X-Hint", "csv")
  }

  @action("login")
  login() {
    const msg   = receive.validate({ body: v.object({ email: v.string() }) })
    const token = this.auth.login(msg.body.email)
    return send({ token })
      .cookie("session", token, { httpOnly: true, secure: true, maxAge: 86400 })
  }

  @action("live")
  live() {
    return send.stream<UserEvent>((emit) => {
      const unsub = this.users.onChange((e) => emit(e))
      return () => unsub()
    })
    .header("X-Stream-Id", crypto.randomUUID())
  }

  @action("chat")
  chat() {
    return send.ws<ChatMessage, ChatMessage>({
      onOpen:    (ws) => ws.send({ text: "connected", user: "system" }),
      onMessage: (ws, msg) => broadcast(msg),
      onClose:   (ws) => cleanup(ws),
    })
    .header("X-Socket-Id", crypto.randomUUID())
  }
}
```

---

## Schema Descriptor — `X-Action: __schema`

Built at `make()` time from all registered `@action` decorators. The compiler (ts-morph) scans handler return types and `receive.validate()` calls to build input and output types automatically — no manual annotations on the decorator needed.

```
POST /__aromix
X-Action: __schema
Content-Type: application/msgpack
Body: MessagePack({})
```

Returns MessagePack-encoded JSON Schema descriptor:

```json
{
  "version": "1",
  "actions": {
    "user:get": {
      "input": {
        "type": "object",
        "properties": { "id": { "type": "string" } },
        "required": ["id"]
      },
      "output": {
        "type": "object",
        "properties": {
          "name":  { "type": "string" },
          "email": { "type": "string" }
        }
      },
      "transport": "value"
    },
    "user:avatar": {
      "input":     { "type": "object", "properties": { "id": { "type": "string" } } },
      "output":    { "type": "binary" },
      "transport": "value"
    },
    "user:profile": {
      "input": { "type": "object", "properties": { "id": { "type": "string" } } },
      "output": {
        "type": "object",
        "properties": {
          "name":   { "type": "string" },
          "email":  { "type": "string" },
          "avatar": { "type": "binary" }
        }
      },
      "transport": "value"
    },
    "user:live": {
      "input":     { "type": "object", "properties": {} },
      "output":    { "type": "object", "properties": { "userId": { "type": "string" } } },
      "transport": "stream"
    },
    "user:chat": {
      "input":     { "type": "object", "properties": { "room": { "type": "string" } } },
      "output":    { "type": "object", "properties": { "text": { "type": "string" }, "user": { "type": "string" } } },
      "transport": "ws"
    }
  }
}
```

Descriptor format is JSON Schema — existing codegen tools handle type generation for every language.

---

## Client Type Generation

### `aromix pull`

```bash
# TypeScript
aromix pull --endpoint http://localhost:3000

# Python, PHP, Rust — delegates to existing JSON Schema codegen tools
aromix pull --endpoint http://localhost:3000 --lang python
aromix pull --endpoint http://localhost:3000 --lang php
aromix pull --endpoint http://localhost:3000 --lang rust
```

Sends `X-Action: __schema`. Receives descriptor. Generates types. Done.

For TypeScript generates `.aromix/types.d.ts`:

```typescript
export interface ActionMap {
  "user:get": {
    input:     { id: string }
    output:    { name: string, email: string }
    transport: "value"
  }
  "user:avatar": {
    input:     { id: string }
    output:    Uint8Array
    transport: "value"
  }
  "user:profile": {
    input:     { id: string }
    output:    { name: string, email: string, avatar: Uint8Array }
    transport: "value"
  }
  "user:live": {
    input:     {}
    output:    { userId: string }
    transport: "stream"
  }
  "user:chat": {
    input:     { room: string }
    output:    { text: string, user: string }
    transport: "ws"
  }
}
```

### Runtime Schema (No Generated File)

```typescript
const client = createClient({
  endpoint: "http://localhost:3000",
  schema:   true,   // fetches __schema on init, validates at runtime
})
```

No types. Runtime validation only. Works for any language.

### Both Together

```typescript
import type { ActionMap } from "./.aromix/types"

const client = createClient<ActionMap>({
  endpoint: "http://localhost:3000",
  schema:   true,
})
// compile-time types + runtime validation
```

---

## Client API

```typescript
const client = createClient<ActionMap>({ endpoint: "http://localhost:3000" })
```

### `client.call()` — Value

```typescript
// structured data
const user = await client.call("user:get", { id: "123" })
user.name   // string — typed
user.email  // string — typed

// binary — client receives Uint8Array, decides what to do
const avatar = await client.call("user:avatar", { id: "123" })
// avatar is Uint8Array — typed from schema
displayImage(avatar)
// or
downloadFile(avatar, "avatar.png")

// mixed — structured + binary in one call
const profile = await client.call("user:profile", { id: "123" })
profile.name    // string
profile.email   // string
profile.avatar  // Uint8Array — display or download, client decides
```

Client validates input before request fires. Wrong shape never reaches server:

```typescript
await client.call("user:get", { id: 123 })
// TypeScript error at compile time — id must be string
// Runtime error before fetch fires — if no TypeScript
```

### `client.stream()` — Server Push

```typescript
const feed = client.stream("user:live", {})

for await (const event of feed) {
  event.userId  // string — typed
}

feed.close()
```

### `client.socket()` — WebSocket

```typescript
const socket = client.socket("user:chat", { room: "general" })

socket.send({ text: "hello", user: "istiuak" })  // typed

socket.on((msg) => {
  msg.text  // string — typed
  msg.user  // string — typed
})

socket.close()
```

---

## Error Handling

Errors are just data. Handler sends them like anything else — no throw, no special error type, no HTTP concept:

```typescript
// user not found — just send data describing what happened
return send({ error: "User not found" })

// validation failed — send whatever shape makes sense
return send({ error: "Validation failed", fields: [...] })

// anything — server has no opinion on error shape
return send({ code: "DUPLICATE_EMAIL", message: "That email is taken" })
```

Client receives it as normal MessagePack. The client decides how to handle it based on the data shape — no magic, no framework convention forced.

### Unhandled Crashes

Caught by `serve()` error boundary. Goes through error hooks if registered, otherwise sends:

```typescript
send({ __aromix_error: true, message: "Internal server error" })
// full error logged server-side — never exposed to client
```

Client can detect `__aromix_error: true` and handle uniformly.

---

## Stability

| Symbol | Tier |
|---|---|
| `receive()` / `receive.validate()` | LOCKED |
| `send()` signature | LOCKED |
| `send.stream()` signature | LOCKED |
| `send.ws()` signature | LOCKED |
| `.header()` / `.headers()` chain | LOCKED |
| `.cookie()` chain | LOCKED |
| `CookieOptions` shape | EXTENSIBLE |
| MessagePack as wire format | LOCKED |
| `X-Aromix-Transport` header | LOCKED |
| `X-Action` header | LOCKED |
| `__` reserved action prefix | LOCKED |
| `__schema` system action | LOCKED |
| Always HTTP 200 (except 101/302) | LOCKED |
| Descriptor JSON Schema format | LOCKED |
| `createClient()` signature | LOCKED |
| `client.call()` / `.stream()` / `.socket()` | LOCKED |
| WASM MessagePack binding | PLANNED |
| `receiveStorage` AsyncLocalStorage | INTERNAL |
| Descriptor build / ts-morph scan | INTERNAL |
| `__aromix_error` key | INTERNAL |

---

## Known Gaps and Future Work

1. **WASM MessagePack** — planned optimization for browser structured data performance. Zero API changes when shipped.

2. **ts-morph return type extraction** — compiler scans all `send()` return statements per handler, builds the union of all possible output types for the schema descriptor automatically.

3. **Streaming backpressure** — `send.stream()` currently emits without backpressure. Future version exposes pause/resume.

4. **WebSocket reconnection** — `client.socket()` does not auto-reconnect in v1.

5. **`aromix pull` codegen for non-TS languages** — delegates to existing JSON Schema tools per language. Integration ongoing.