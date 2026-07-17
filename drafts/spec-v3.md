# Framework — Spec v1

**Status:** Pre-implementation

---

## 1. App Surface

```ts
const app = createApp()

app.router(router)
app.service(UserService)

app.plugin(env, schema)
app.plugin(db, {})

app.hook({
  event: "app:start",
  run(ctx) {}
})

app.listen(3000)
```

---

## 2. Router Surface

```ts
const router = createRouter({ prefix: "/api" })

router.on("/").render(Home)
router.on("/users").render(UsersPage)

router.on("/health").handle(() => "ok")

router.group("/admin", (admin) => {
  admin.on("/users").render(AdminUsers)
})
```

---

## 3. Service Surface

```ts
class UserService {
  @expose()
  create(ctx) {}

  @expose()
  delete(ctx) {}

  internalHelper() {}
}
```

---

## 4. Hooks

```ts
app.hook({
  event: "app:start",
  run(ctx) {}
})

app.hook({
  event: "request:before",
  run(ctx) {}
})

app.hook({
  event: "request:after",
  run(ctx) {}
})

app.hook({
  event: "service:before",
  run(ctx) {}
})

app.hook({
  event: "service:after",
  run(ctx) {}
})
```

---

## 5. Plugin Surface

```ts
const plugin = {
  install(app, options) {}
}

app.plugin(plugin, {})
```

---

## 6. Execution Flow

```
app.listen()

→ app:start hooks
→ plugins init
→ router compile
→ service bind

request flow:

request
→ request:before hooks
→ router match
→ service/handler
→ service:before hooks
→ service:after hooks
→ request:after hooks
→ response
```

---

## 7. Target User Example

```ts
const router = createRouter()

router.on("/users").render(UsersPage)

const app = createApp()

app.router(router)
app.service(UserService)

app.plugin(db)
app.plugin(env)

app.hook({
  event: "request:before",
  run(ctx) {
    console.log(ctx.path)
  }
})

app.listen(3000)
```
