# Sliz — Language Spec

**File Extension:** `.sliz`  
**Packages:** `sliz` (server), `@sliz/client` (browser runtime), `@sliz/compiler` (build tooling)  
**Status:** Pre-implementation

---

## What Is Sliz

Sliz is a component-based UI framework. No bundler, no build step. The server compiles `.sliz` files on demand and serves them as JS modules. The browser loads them, mounts components, and patches the DOM reactively when signals change.

---

## Component

```sliz
export component Button {
  <script>
    const props = defineProps({
      label:   String,
      variant: String,
    })
  </script>

  <button class="btn">
    {props.label}
  </button>
}
```

- Defined with `export component Name { }`
- Multiple components can live in one `.sliz` file
- Logic lives in `<script>` blocks — multiple blocks are merged into one `setup()` at compile time

---

## Syntax

### Text Interpolation

```sliz
<span>{user.name}</span>
<p>{post.title}</p>
```

### Dynamic Attributes

```sliz
<img src={user.avatar} alt={user.name} />
<input value={email} />
<button class={"btn btn-" + variant}>Click</button>
```

### Static Attributes

```sliz
<div class="container">
<input type="text" />
```

### Event Handlers

```sliz
<button onclick={() => handleClick()}>Submit</button>
<input oninput={e => filter = e.target.value} />
```

---

## Directives

Custom directives attach reusable behavior to any element.

### Defining a Directive

```sliz
export directive skeleton {
  <script>
    const { el, value } = defineDirective()
    // el    — the DOM element the directive is applied to
    // value — the value passed to the directive
  </script>
}
```

### Using a Directive

```sliz
<div skeleton="any value"></div>
<div skeleton={dynamicValue}></div>
```

The directive name becomes an attribute. Any element can use it.

### Example — Skeleton Loader

```sliz
export directive skeleton {
  <script>
    const { el, value } = defineDirective()

    if (value) {
      el.classList.add("skeleton-pulse")
    } else {
      el.classList.remove("skeleton-pulse")
    }
  </script>
}

// usage
<div skeleton={loading}>
  <UserCard user={user} />
</div>
```

### Directives vs Components

| | Component | Directive |
|---|---|---|
| Purpose | Structure and UI | Behavior on existing elements |
| Usage | `<MyComponent />` | `<div myDirective="value" />` |
| Receives | props | element + value |

---

## Control Flow

### `@if` / `@else`

```sliz
@if(loading) {
  <Spinner />
} @else if(error) {
  <ErrorView error={error} />
} @else {
  <Content />
}
```

### `@for`

```sliz
@for(item of items) {
  <ItemCard item={item} />
}
```

### `@await` / `@then` / `@catch`

```sliz
@await(fetchData()) {
  <Spinner />
} @then(data) {
  <DataView data={data} />
} @catch(err) {
  <ErrorView error={err} />
}
```

---

## Reactivity

### `obs()` — Signal

```sliz
<script>
  const count = obs(0)
  const name  = obs("")
</script>

<span>{count}</span>
<button onclick={() => count = count + 1}>Increment</button>
```

Signals are auto-unwrapped in templates. Read: `count` — write: `count = 1` — update: `count = v => v + 1`

### `combine()` — Derived Signal

```sliz
<script>
  const users  = obs([])
  const filter = obs("")

  const filtered = combine(users, filter).derived(
    ([users, f]) => users.filter(u => u.name.includes(f))
  )
</script>

@for(user of filtered) {
  <UserRow user={user} />
}
```

When a signal changes only the exact DOM nodes bound to it are patched — no vdom diff, no full re-render.

---

## Dependency Injection

### `@provide()` — Service

```typescript
@provide()
class PostService {
  all()      { return db.posts.findAll() }
  find(slug) { return db.posts.findOne(slug) }
}
```

### `inject()`

```sliz
<script>
  const posts = inject(PostService)
  onMount(() => posts.load())
</script>

@for(post of posts.all()) {
  <PostCard post={post} />
}
```

---

## Routing

Routing is manual — no file-based conventions.

```typescript
import { createRouter } from "@sliz/client"
import { HomePage }     from "./pages/HomePage.sliz"
import { AboutPage }    from "./pages/AboutPage.sliz"
import { BlogPost }     from "./pages/BlogPost.sliz"
import { AdminUsers }   from "./pages/AdminUsers.sliz"

createRouter({
  root:   "#root",
  routes: [
    { path: "/",           component: HomePage   },
    { path: "/about",      component: AboutPage  },
    { path: "/blog/:slug", component: BlogPost   },
    { path: "/admin",      component: AdminUsers },
  ]
})
```

Client router intercepts navigation — no server request. Crossing roots uses a plain `<a>` tag for a full page load.
