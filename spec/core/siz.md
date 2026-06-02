**File Extension:** `.sliz`

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

### Event Handlers

```sliz
<button onclick={() => handleClick()}>Submit</button>
<input oninput={e => filter = e.target.value} />
```

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

## Reactivity

### `obs()` — Signal

```sliz
<script>
  const count = obs(0)
  const name  = obs("")

  name.derive(()=>) // computed
  name.subscribe(()=>{}) // watcher
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
