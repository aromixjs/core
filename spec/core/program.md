## Program Definition

```ts
import { program } from 'aromix'

const user = program({
      name: 'user',
      deps: { user: inject(UserModel) },
      hooks: [authHook],
})
```

---

## Command

```ts
user.command({
      name: 'create',
      input: v.object({ name: v.string(), email: v.string() }),
      output: userSchema,
      run(input, deps) {
            return deps.user.create(input)
      },
})
```

### Client

```ts
const result = await client.program('user').run('create', {
      name: 'Alice',
      email: 'alice@example.com',
})
```

---

## Stream

```ts
user.stream({
      name: 'feed',
      input: v.object({ cursor: v.string().optional() }),
      events: v.object({
            data: v.array(userSchema),
            cursor: v.object({ next: v.string() }),
            error: v.object({ code: v.string(), message: v.string() }),
      }),
      run(input, stream, deps) {
            const { items, nextCursor } = await deps.db.getFeed(input)
            stream.emit('data', items)
            stream.emit('cursor', { next: nextCursor })
            // Server can close the stream
            if (noMoreData) {
                  stream.close()
            }

            // Optional: cleanup when stream closes (any side)
            stream.onClose(() => {
                  console.log('Stream closed')
            })
      },
})
```

### Client

```ts
const listener = client.program('user').listen('feed', { cursor: 'abc' })

listener.on('data', (users) => console.log(users))
listener.on('cursor', ({ next }) => console.log(next))
listener.on('error', (err) => console.error(err))

listener.close() // or .disconnect()

listener.onClose(() => console.log('Listener closed'))
```

---

## Socket

```ts
user.socket({
      name: 'presence',
      receive: v.object({
            join: v.object({ userId: v.string(), room: v.string() }),
            leave: v.object({ userId: v.string() }),
      }),
      send: v.object({
            joined: v.object({
                  userId: v.string(),
                  room: v.string(),
                  time: v.number(),
            }),
            left: v.object({ userId: v.string(), time: v.number() }),
      }),
      run(socket, deps) {
            socket.on('join', (data) => {})

            socket.emit('joined', {
                  userId: data.userId,
                  room: data.room,
                  time: Date.now(),
            })

            socket.on('leave', (data) => {})

            socket.emit('left', { userId: data.userId, time: Date.now() })
      },
})
```

### Client

```ts
const conn = client.program('user').connect('presence')

conn.emit('join', { userId: '123', room: 'general' })
conn.on('joined', (data) => console.log(data))
conn.close()
```

---
