## Hooks { done }

```ts
export type Hook =
    | { on: 'Ready'; run: () => void | Promise<void> }
    | { on: 'Close'; run: () => void | Promise<void> }
    | { on: 'Request'; run: RequestHook }
    | { on: 'Response'; run: ResponseHook }
    | { on: 'Error'; run: ErrorHook }
```

## Program

program sends and receives data in message pack its the only encoding no json/multipart form data needed.

```ts
import { program } from "./aromix";

const user = program({
  name: "user",
  hooks: [userCheckHook, activityLog, errorHandler],
});

user.command("Create", [authenticated], async (ctx) => {
  const args = ctx.args(UserCreateArgs);
  return ctx.db.users.insert(args);
});


user.stream("GetAll", [authenticated] (ctx) => {
  return ctx.db.users.findOne({ id: ctx.id });
});

user.socket("Presence", [authenticated], (ctx) => {
  ctx.on("join", (data) => ctx.broadcast(data));
  ctx.on("leave", (data) => ctx.broadcast(data));
});
```

```ts
const client = createClient({ url: 'http://localhost:3000' })

await client.program('user').run('Create', { name: 'Istiuak' })

const unsub = client.program('user').listen('GetAll', (users) => setUsers(users))

const conn = client.program('user').connect('Presence')
conn.send('join', { userId: '123' })
conn.on('join', (data) => console.log(data))
```

## Services { done }

```ts
@provide()
class TestService {}

const singleton = inject(TestService)
const transient = injectNew(TestService)
```

## Model

```ts
export const demoSchema = schema("users", (builder) => {
  builder.increments("id");
  builder.string("title").notNullable();
  builder.string("status").defaultTo("draft");
  builder.integer("author_id").unsigned().references(authorSchema.id);
  builder.timestamps(true, true);
});

export const DemoModel = model(demoSchema, (ctx) => {


ctx.extend({

async deleteCascade(id: string) {
    await post.deleteMany({ userId: id });
    await history.deleteMany({ userId: id });
    await ctx.deleteById(id);
  };



})


});
```

## Router

```ts
const root = router({ prefix: '/admin' })

root.on('/').render(Home)
root.on('/users').render(UsersPage)

root.on('/user/:id').handle((ctx) => {
    const data = inject(UserModel).findBy({ id: ctx.url.param })
    ctx.render(UserPage, { user: data })
})

root.group('/admin', (admin) => {
    admin.on('/users').render(AdminUsers)
})
```

## Bootstrap

```ts
const app = make({
  programs: [userProgram],
  routes: [root],
  hooks: [...],
  services: [SomeService],
})


app.install(ValidateEnv, EnvSchema) // validates against a schema and gives a service to access it

app.install(mongoDb,{
uri: inject(Env).dbUri
models:[...AllModels]
})


app.install(authPlugin())

app.static({
  path:'./assets',
  prefix: '/files',
  cache:{
    maxAge:86400,
    immutable:true
  }
})

app.serve({ port: 3000})
```

## Plugins

```ts
export const AuthPlugin = {
name:'Auth Plugin'
install(appContext, options){}
}
```
