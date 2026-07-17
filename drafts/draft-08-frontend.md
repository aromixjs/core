# Aromix — Blueprint 08: Frontend Layer

**Feature:** `@aromix/client`, `@page()`, view plugin, runtime compiler, reactivity system
**Package:** `@aromix/client`, `@aromix/view` (plugin)
**Status:** Pre-implementation, pending review
**Depends on:** Blueprint 04 (make/serve), Blueprint 07 (plugins)

---

## Purpose

The frontend layer is an optional official package that adds full-stack UI capability to Aromix. It is not part of `@aromix/core` — it is opt-in via the view plugin.

The system has four parts that work together:

1. **`@page()` decorator** — registers a handler method as a shell endpoint (GET), separate from `@action()` which is API only (POST + X-Action header)
2. **Runtime compiler** — intercepts browser requests for `.web` component files, compiles them on demand, caches aggressively, serves JS modules
3. **Reactivity system (`obs`, `combine`)** — client-side reactive primitives, signal-based, surgical DOM patching
4. **Component model** — `comp` blocks in `.web` files compiled by the runtime compiler into descriptor objects, consumed by the runtime to create and patch DOM

There is no bundler, no build step, no vdom. The server renders the shell to an HTML string and sends it. The browser loads JS modules on demand. The runtime patches the DOM surgically when signals change.

---

## Architecture Overview

```
Browser requests GET /admin
  → page map matches /admin/*
  → AdminHandler.root() runs
  → ctx.render(AdminShell({ user })) called
  → view plugin resolver converts descriptor → HTML string
  → HTML sent to browser with <script> tags intact

Browser parses HTML, finds <script src="./admin.client.web">
  → requests GET /admin.client.web
  → runtime compiler intercepts
  → compiles .web template syntax → valid JS descriptor objects
  → caches by file mtime
  → serves JS module to browser

Browser executes JS
  → runtime boots
  → walks component descriptor tree
  → creates real DOM nodes
  → attaches signal subscriptions to reactive nodes
  → lazy imports child components on demand
  → patches only exact DOM nodes when signals change
```

---

## The Three Dispatch Systems

Aromix has three separate dispatch systems:

```
POST /api  +  X-Action header  →  action dispatch map  →  @action() handlers
GET  /*                        →  page map             →  @page() handlers
GET  /assets/*                 →  asset pipeline        →  runtime compiler
```

They never overlap. `@action()` and `@page()` can coexist on the same class but are completely independent.

---

## Public API — Server Side

### `@page()`

```ts
function page(path: string): MethodDecorator;
```

Registers a handler method as a shell endpoint. The path is a prefix — any path starting with it is served by this handler.

```ts
import { namespace, action, page } from '@aromix/core'
import { AdminShell } from './shells/AdminShell'

@namespace('admin')
class AdminHandler {

  // API — POST + X-Action: admin:list
  @action('list')
  list(ctx = input(ListSchema)) {
    return ctx.reply({ status: 200, data: [...] })
  }

  // Page — GET /admin, GET /admin/users, GET /admin/settings
  @page('/admin')
  root(ctx = input()) {
    return ctx.render(AdminShell({ user: ctx.user }))
  }
}
```

`@page()` path rules:

- Always starts with `/`
- Treated as a prefix — `/admin` matches `/admin`, `/admin/users`, `/admin/anything`
- More specific paths take priority — `/admin/settings` beats `/admin`
- Pattern: `/^\/[a-z0-9\-_\/]*$/`

### `ctx.render()`

Added to `RawContext` by the view plugin. Not present without the plugin.

```ts
ctx.render(descriptor: ComponentDescriptor): RenderValue
```

Takes the output of a shell component call and returns a `RenderValue`. The view plugin resolver converts the descriptor tree to an HTML string server-side. Reactive nodes (`obs()` values) render as their initial value — reactivity activates client-side after the JS boots.

```ts
// Controller
@page('/admin')
root(ctx = input()) {
  return ctx.render(AdminShell({ user: ctx.user }))
}

// Shell — plain JS object, no template syntax needed for shells
function AdminShell({ user }) {
  return {
    tag: 'html',
    props: {},
    children: [
      { tag: 'head', props: {}, children: [
        { tag: 'title', props: {}, children: [{ type: 'text', value: 'Admin' }] },
        { tag: 'script', props: { src: './admin.client.web', type: 'module' }, children: [] }
      ]},
      { tag: 'body', props: {}, children: [
        { tag: 'div', props: { id: 'root' }, children: [] }
      ]}
    ]
  }
}
```

### View Plugin Registration

```ts
import { make } from "@aromix/core";
import { viewPlugin } from "@aromix/view";

const app = make({
  namespaces: [AdminHandler, HomeHandler],
  plugins: [
    viewPlugin({
      assets: "./src", // root for asset resolution
      cache: true, // cache compiled modules (default: true)
    }),
  ],
});
```

---

## The Page Map

Built by `make()` when the view plugin is active. Separate from the action dispatch map.

```ts
interface PageEntry {
  path: string; // '/admin'
  handler: Function; // bound method
  namespace: string; // 'admin'
  methodKey: string; // 'root'
}

// Stored as sorted array — more specific paths first
// /admin/settings  checked before  /admin
const pageMap: PageEntry[] = [];
```

Resolution at request time:

```ts
function resolvePage(requestPath: string): PageEntry | null {
  return pageMap.find((entry) => requestPath.startsWith(entry.path)) ?? null;
}
```

---

## Component Model

### File Format — `.web`

Components are written in `.web` files. A `.web` file is TypeScript with template syntax. Multiple components can be defined in a single file. The runtime compiler transforms `.web` files into plain JS modules exporting descriptor objects.

```
src/
  components/
    shop.web         ← multiple comps in one file
    directives.web   ← directive definitions
    utils.ts         ← plain TS, shared utilities
```

### `comp` — The Component Block

Components are defined with the `comp` keyword followed by a name and a `{ }` block. Everything inside the block is the component — reactive state, lifecycle hooks, services, and template. Multiple `comp` blocks can live in one file.

```ts
export comp Badge {
  <span class="badge badge--[props.variant]">
    [props.label]
  </span>
}
```

Small components with no logic place the template directly in the block. No boilerplate required.

### `<script>` Blocks — Logic Inside Components

Logic lives in `<script>` blocks inside the comp. Script blocks can appear anywhere in the comp — before the template, between template sections, or multiple times. All script blocks are merged into a single `setup` function at compile time.

```ts
export comp ProductList {
  <script>
    const props = defineProps({
      category: String,
      sortBy: String
    })

    const emit = defineEmits({
      select: Object
    })

    const cart = inject(CartService)
    const items = obs([])

    onMount(() => fetchItems(props.category))
    onDestroy(() => cleanup())
  </script>

  <section class="product-list">
    <h2>[props.category]</h2>

    @await(fetchProducts(props.category, props.sortBy)){
      <Spinner/>
    } @then(products){
      <div class="product-list__grid">
        @for(product of products){
          <ProductCard
            product=[product]
            onselect=[emit("select", product)]
          />
        }
      </div>
    } @catch(err){
      <ErrorView error=[err]/>
    }
  </section>
}
```

Multiple script blocks — logic lives next to the template it belongs to:

```ts
export comp Dashboard {
  <script>
    const user = obs(null)
    onMount(() => fetchUser().then(u => user(u)))
  </script>

  <header>
    <h1>Welcome, [user.name]</h1>
  </header>

  <script>
    const posts = obs([])
    onMount(() => fetchPosts().then(p => posts(p)))
  </script>

  <section class="posts">
    @for(post of posts){
      <PostCard post=[post]/>
    }
  </section>
}
```

All script blocks compile into one merged `setup` function — order is preserved.

### Props and Emits

Defined inside `<script>` using `defineProps` and `defineEmits`. These are hoisted out of `setup` at compile time and become top-level keys on the descriptor object.

```ts
export comp Button {
  <script>
    const props = defineProps({
      label: String,
      disabled: Boolean,
      variant: String
    })

    const emit = defineEmits({
      click: Event,
      hover: Event
    })
  </script>

  <button
    class="btn btn--[props.variant]"
    disabled=[props.disabled]
    onclick=[() => emit("click")]
    onmouseenter=[() => emit("hover")]>
    [props.label]
  </button>
}
```

### Services — `inject()`

Client services are resolved inside `<script>` blocks using `inject()`. The compiler validates that only `@singleton()` client services are injected — server-side `@provide()` services cause a compile error.

```ts
export comp ShopPage {
  <script>
    const userService = inject(UserService)
    const cartService = inject(CartService)

    const user = obs(null)
    const category = obs("all")

    onMount(() => userService.fetchUser().then(u => user(u)))
    onDestroy(() => cleanup())
  </script>

  <div class="shop">
    <h1>Welcome, [user.name]</h1>
    <Cart/>
    <ProductList category=[category]/>
  </div>
}
```

### Template Binding Syntax

`[ ]` is the only binding marker. It works for both text content and attribute values. Static strings use plain HTML attribute syntax — no quotes needed around `[ ]` bindings.

```ts
// Text content
<h1>[user.name]</h1>
<p>[formatPrice(product.price)]</p>

// Dynamic attributes — no quotes
<div id=[user.id] class="card [active ? 'card--active' : '']">
<img src=[product.image] alt=[product.name]/>
<button disabled=[product.status === "outofstock"]>

// Static attributes — plain HTML
<div class="dashboard">
<img src="/logo.png" alt="Logo"/>
```

### Control Flow — `@` Directives

Control flow uses `@` directives with `{ }` as block delimiters. The `{ }` here wraps HTML — it never collides with `[ ]` expression bindings.

```ts
// Conditional
@if(user.loggedIn){
  <UserPanel user=[user]/>
} @else {
  <GuestPanel/>
}

// Loop
@for(item of items){
  <ProductCard product=[item]/>
}

// Switch
@switch(product.status){
  @case("instock"){
    <Badge variant="success" label="In Stock"/>
  }
  @case("low"){
    <Badge variant="warning" label="Low Stock"/>
  }
  @default{
    <Badge variant="danger" label="Out of Stock"/>
  }
}

// Async
@await(fetchUser()){
  <Spinner/>
} @then(user){
  <UserCard user=[user]/>
} @catch(err){
  <ErrorView error=[err]/>
}

// Include — compile-time file injection, not a component
@include("partials/footer.html")
@include("examples/auth.ts")
@include("docs/intro.md", data=[pageData])
```

Full directive reference:

| Directive                | Purpose                     |
| ------------------------ | --------------------------- |
| `@if(cond){ }`           | Conditional block           |
| `@else{ }`               | Alternate branch            |
| `@for(item of items){ }` | Loop over iterable          |
| `@switch(expr){ }`       | Multi-branch on value       |
| `@case("val"){ }`        | Branch inside switch        |
| `@default{ }`            | Fallback inside switch      |
| `@await(promise){ }`     | Pending state               |
| `@then(val){ }`          | Resolved state              |
| `@catch(err){ }`         | Rejected state              |
| `@include("file")`       | Compile-time file injection |

### Directives — Custom

Custom directives are defined with the `directive` keyword. They have access to the DOM element via `el`, props via `props`, and can emit events. Directives are resolved through imports — file-scoped directives need no import.

```ts
// directives.web

directive tooltip {
  <script>
    onMount(() => initTooltip(el, props.value))
    onDestroy(() => destroyTooltip(el))
  </script>
}

directive clickOutside {
  <script>
    onMount(() => {
      document.addEventListener("click", (e) => {
        if (!el.contains(e.target)) emit("trigger")
      })
    })
  </script>
}

directive lazyLoad {
  <script>
    onMount(() => {
      const observer = new IntersectionObserver(() => {
        el.src = props.value
      })
      observer.observe(el)
    })
  </script>
}
```

Using directives — no prefix, no special syntax:

```ts
import { tooltip, clickOutside, lazyLoad } from "./directives.web"

export comp ProductCard {
  <div tooltip=[product.description]>
    <img lazyLoad=[product.image] alt=[product.name]/>
    <div clickOutside onclickOutside=[() => close()]>
      <h3>[product.name]</h3>
    </div>
  </div>
}
```

Directive resolution order:

1. Known native HTML attribute → treated as HTML
2. Defined in same file → used automatically, no import needed
3. Explicitly imported → used, lazy loaded by compiler
4. Neither → compile error

### Prop Spreading

```ts
<Button [...props]/>
```

### `@include` — Compile-Time File Injection

`@include` reads a file at compile time and injects its content as a static string into the template. It is not a component — it has no lifecycle, no state, no reactivity. Use it for static HTML fragments, code examples, documentation snippets, or any file content that does not need to be reactive.

```ts
// Static HTML fragment
@include("partials/footer.html")

// Code example in docs
<CodeBlock>
  @include("examples/auth.ts")
</CodeBlock>

// Markdown injection
@include("docs/intro.md")

// With data — passed as static context at compile time
@include("partials/table.html", data=[users])
```

`@include` is the compile-time equivalent of `fs.readFile` — fast, zero runtime cost, no component boundary created.

### Full Example — Multiple Components in One File

```ts
// shop.web

import { tooltip, clickOutside, lazyLoad } from "./directives.web"
import { formatPrice } from "./utils.ts"


export comp Badge {
  <span class="badge badge--[props.variant]">
    [props.label]
  </span>
}


export comp Spinner {
  <div class="spinner spinner--[props.size]">
    <span class="spinner__dot"/>
    <span class="spinner__dot"/>
    <span class="spinner__dot"/>
  </div>
}


export comp ErrorView {
  <div class="error-view">
    <h3>Something went wrong</h3>
    <p>[props.error.message]</p>
    <button onclick=[props.onRetry]>Try Again</button>
  </div>
}


export comp ProductCard {
  <script>
    const props = defineProps({
      product: Object,
      featured: Boolean
    })

    const emit = defineEmits({
      addToCart: Object,
      wishlist: Object
    })

    const wished = obs(false)
  </script>

  <div
    class="product-card [props.featured ? 'product-card--featured' : '']"
    id=[props.product.id]
    tooltip=[props.product.description]
  >
    <img lazyLoad=[props.product.image] alt=[props.product.name]/>

    <div class="product-card__body">
      <h3>[props.product.name]</h3>
      <p>[props.product.description]</p>

      @if(props.featured){
        <Badge variant="gold" label="Featured"/>
      }

      @switch(props.product.status){
        @case("instock"){
          <Badge variant="success" label="In Stock"/>
        }
        @case("low"){
          <Badge variant="warning" label="Low Stock"/>
        }
        @default{
          <Badge variant="danger" label="Out of Stock"/>
        }
      }

      <span>[formatPrice(props.product.price)]</span>

      <div class="product-card__actions">
        <button
          disabled=[props.product.status === "outofstock"]
          onclick=[() => emit("addToCart", props.product)]>
          Add to Cart
        </button>
        <button
          class="[wished ? 'wished' : '']"
          onclick=[() => {
            wished(v => !v)
            emit("wishlist", props.product)
          }]>
          [wished ? "♥" : "♡"]
        </button>
      </div>
    </div>
  </div>
}


export comp Cart {
  <script>
    const items = obs([])

    const total = items.derived(v =>
      v.reduce((sum, item) => sum + item.price * item.qty, 0)
    )

    const itemCount = items.derived(v =>
      v.reduce((sum, item) => sum + item.qty, 0)
    )

    const isOpen = obs(false)

    const removeItem = (item) => {
      items(v => v.filter(i => i.id !== item.id))
    }

    const updateQty = ({ item, delta }) => {
      items(v => v.map(i =>
        i.id === item.id
          ? { ...i, qty: Math.max(1, i.qty + delta) }
          : i
      ))
    }
  </script>

  <div class="cart" clickOutside onclickOutside=[() => isOpen(false)]>

    <button class="cart__trigger" onclick=[() => isOpen(v => !v)]>
      Cart
      @if(itemCount > 0){
        <Badge variant="primary" label=[itemCount]/>
      }
    </button>

    @if(isOpen){
      <div class="cart__drawer">
        <h2>Your Cart</h2>

        @if(items.length === 0){
          <p class="cart__empty">Your cart is empty</p>
        } @else {
          <div class="cart__items">
            @for(item of items){
              <div class="cart-item">
                <img src=[item.image] alt=[item.name]/>
                <h4>[item.name]</h4>
                <p>[formatPrice(item.price)]</p>
                <div class="cart-item__qty">
                  <button
                    disabled=[item.qty <= 1]
                    onclick=[() => updateQty({ item, delta: -1 })]>
                    -
                  </button>
                  <span>[item.qty]</span>
                  <button onclick=[() => updateQty({ item, delta: 1 })]>
                    +
                  </button>
                </div>
                <button onclick=[() => removeItem(item)]>✕</button>
              </div>
            }
          </div>

          <div class="cart__footer">
            <div class="cart__total">
              <span>Total</span>
              <strong>[formatPrice(total)]</strong>
            </div>
            <button
              class="btn btn--primary btn--full"
              onclick=[() => checkout()]>
              Checkout
            </button>
          </div>
        }
      </div>
    }
  </div>
}


export comp ShopPage {
  <script>
    const userService = inject(UserService)

    const category = obs("all")
    const sortBy = obs("popular")
    const user = obs(null)

    onMount(() => userService.fetchUser().then(u => user(u)))
    onDestroy(() => cleanup())
  </script>

  <div class="shop">

    <header class="shop__header">
      <h1>Shop</h1>
      <Cart/>
    </header>

    <script>
      const a = obs(0)
      const b = obs(0)
      const stats = combine(a, b).derived(([a, b]) => ({
        total: a + b,
        avg: (a + b) / 2
      }))
    </script>

    <div class="shop__stats">
      <p>Total Views: [stats.total]</p>
      <p>Avg: [stats.avg]</p>
    </div>

    <nav class="shop__categories">
      @await(fetchCategories()){
        <Spinner size="sm"/>
      } @then(cats){
        @for(cat of cats){
          <button
            class="category-btn [category === cat.slug ? 'category-btn--active' : '']"
            onclick=[() => category(cat.slug)]>
            [cat.name]
          </button>
        }
      } @catch(err){
        <ErrorView error=[err]/>
      }
    </nav>

    <select onchange=[e => sortBy(e.target.value)]>
      <option value="popular">Popular</option>
      <option value="newest">Newest</option>
      <option value="price-asc">Price: Low to High</option>
      <option value="price-desc">Price: High to Low</option>
    </select>

    <main class="shop__main">
      <ProductList category=[category] sortBy=[sortBy]/>
    </main>

  </div>
}
```

---

### Descriptor Object — The Compiled Output Format

Every `comp` block compiles to a plain JS descriptor object. This is what the runtime consumes to create and patch DOM.

```ts
type NodeDescriptor =
  | ElementDescriptor
  | TextDescriptor
  | ReactiveDescriptor
  | ComponentDescriptor
  | ConditionalDescriptor
  | ListDescriptor
  | AwaitDescriptor
  | SwitchDescriptor;

interface ElementDescriptor {
  type: "element";
  tag: string;
  props: Record<string, PropValue>;
  directives: DirectiveBinding[];
  children: NodeDescriptor[];
}

interface TextDescriptor {
  type: "text";
  value: string;
}

interface ReactiveDescriptor {
  type: "reactive";
  signal: ObsSignal;
}

interface ComponentDescriptor {
  type: "component";
  name: string;
  import: () => Promise<any>;
  props: Record<string, any>;
}

interface ConditionalDescriptor {
  type: "if";
  condition: ObsSignal | (() => boolean);
  children: NodeDescriptor[];
  else?: NodeDescriptor[];
}

interface ListDescriptor {
  type: "for";
  source: ObsSignal;
  render: (item: any) => NodeDescriptor[];
}

interface AwaitDescriptor {
  type: "await";
  promise: () => Promise<any>;
  pending: NodeDescriptor[];
  then: (value: any) => NodeDescriptor[];
  catch: (err: any) => NodeDescriptor[];
}

interface SwitchDescriptor {
  type: "switch";
  expr: () => any;
  cases: { value: any; children: NodeDescriptor[] }[];
  default?: NodeDescriptor[];
}

interface DirectiveBinding {
  name: string;
  value: () => any;
}

type PropValue = string | number | boolean | ObsSignal | (() => any);
```

### Compiled Output Example

Source:

```ts
export comp ProductCard {
  <script>
    const props = defineProps({
      product: Object,
      featured: Boolean
    })

    const emit = defineEmits({
      addToCart: Object
    })

    const wished = obs(false)
  </script>

  <div
    class="product-card [props.featured ? 'product-card--featured' : '']"
    id=[props.product.id]
    tooltip=[props.product.description]
  >
    <h3>[props.product.name]</h3>

    @if(props.featured){
      <Badge variant="gold" label="Featured"/>
    }

    <span>[formatPrice(props.product.price)]</span>

    <button
      disabled=[props.product.status === "outofstock"]
      onclick=[() => emit("addToCart", props.product)]>
      Add to Cart
    </button>
  </div>
}
```

Compiled output:

```ts
export const ProductCard = {
  type: "comp",
  name: "ProductCard",

  props: {
    product: Object,
    featured: Boolean,
  },

  emits: {
    addToCart: Object,
  },

  setup(props, emit, { obs, onMount, onDestroy, inject }) {
    const wished = obs(false);
    return { wished };
  },

  children: [
    {
      type: "element",
      tag: "div",
      props: {
        class: (props) => `product-card ${props.featured ? "product-card--featured" : ""}`,
        id: (props) => props.product.id,
      },
      directives: [
        {
          name: "tooltip",
          value: (props) => props.product.description,
        },
      ],
      children: [
        {
          type: "element",
          tag: "h3",
          props: {},
          directives: [],
          children: [{ type: "reactive", signal: (props) => props.product.name }],
        },
        {
          type: "if",
          condition: (props) => props.featured,
          children: [
            {
              type: "component",
              name: "Badge",
              import: () => import("./shop.web"),
              props: {
                variant: "gold",
                label: "Featured",
              },
            },
          ],
          else: null,
        },
        {
          type: "element",
          tag: "span",
          props: {},
          directives: [],
          children: [{ type: "reactive", signal: (props) => formatPrice(props.product.price) }],
        },
        {
          type: "element",
          tag: "button",
          props: {
            disabled: (props) => props.product.status === "outofstock",
            onclick: (props, emit) => () => emit("addToCart", props.product),
          },
          directives: [],
          children: [{ type: "text", value: "Add to Cart" }],
        },
      ],
    },
  ],
};
```

Key compilation rules:

- `defineProps` and `defineEmits` are hoisted out of `setup` into top-level keys
- All `<script>` blocks are merged into one `setup(props, emit, { obs, onMount, onDestroy, inject })` function in source order
- `[ ]` bindings on text content compile to `{ type: 'reactive', signal: (props) => expr }`
- `[ ]` bindings on attributes compile to `(props) => expr` getter functions
- Static string attributes compile to plain string values — no wrapper
- Event handlers compile to `(props, emit) => () => handler` — lazily bound
- Components referenced by imported object — never a string tag
- Directives get their own `directives` array separate from `props`
- `@include` is resolved at compile time — inlined as static content, no runtime trace

---

## Reactivity System

### `obs()`

The single reactive primitive. Works identically for primitives, objects, and arrays.

```ts
const _obsMarker = Symbol("aromix.obs"); // internal, never exported

function obs(initial) {
  let _value = initial;
  const subscribers = new Set();

  const signal = function (next?) {
    if (arguments.length === 0) return _value;
    _value = typeof next === "function" ? next(_value) : next;
    subscribers.forEach((fn) => fn(_value));
  };

  signal[_obsMarker] = true;

  signal.subscribe = (fn) => {
    subscribers.add(fn);
    return () => subscribers.delete(fn);
  };

  signal.derived = (fn) => {
    const result = obs(fn(_value));
    signal.subscribe((v) => result(fn(v)));
    return result;
  };

  return signal;
}
```

Usage:

```ts
// Primitives
const count = obs(0);
count(); // read → 0
count(5); // write → 5
count((v) => v + 1); // update → 6

// Objects
const user = obs({ name: "John", age: 25 });
user(); // read → { name: 'John', age: 25 }
user({ name: "Jane", age: 25 }); // write
user((v) => ({ ...v, age: 26 })); // update

// Arrays
const list = obs([1, 2, 3]);
list(); // read → [1, 2, 3]
list((v) => [...v, 4]); // update → [1, 2, 3, 4]

// Derived
const doubled = count.derived((v) => v * 2);
doubled(); // always count() * 2, updates automatically

// Subscribe
const unsub = count.subscribe((v) => console.log(v));
unsub(); // stop listening
```

### `combine()`

Merges multiple signals into one derived signal.

```ts
function combine(...signals: ObsSignal[]): ObsSignal {
  const read = () => signals.map((s) => s());
  const result = obs(read());
  signals.forEach((s) => s.subscribe(() => result(read())));
  return result;
}
```

Usage:

```ts
const a = obs(1);
const b = obs(2);

const sum = combine(a, b).derived(([a, b]) => a + b);
sum(); // 3

a(10);
sum(); // 12 — updated automatically
```

### Template Reactivity Rule

Inside templates, signals are never called with `()`. The compiler detects signal references via the `_obsMarker` symbol and wraps them automatically.

```ts
// You write
<p>[count]</p>
<div class=[isActive ? 'active' : '']>

// Compiler produces
{ type: 'reactive', signal: count.derived(v => v) }
{ prop: 'class', value: isActive.derived(v => v ? 'active' : '') }
```

Outside templates — call signals normally with `()`.

---

## Runtime — DOM Creation and Patching

The runtime is a small client-side module that takes a descriptor tree and creates real DOM, then subscribes to signals for surgical updates.

```ts
function mount(descriptor: NodeDescriptor, parent: Element): BoundNode {
  switch (descriptor.type) {
    case "element": {
      const el = document.createElement(descriptor.tag);
      for (const [key, value] of Object.entries(descriptor.props)) {
        setProp(el, key, value);
      }
      for (const directive of descriptor.directives) {
        initDirective(directive, el);
      }
      for (const child of descriptor.children) {
        mount(child, el);
      }
      parent.appendChild(el);
      return { el, descriptor };
    }

    case "text": {
      const node = document.createTextNode(descriptor.value);
      parent.appendChild(node);
      return { node };
    }

    case "reactive": {
      const node = document.createTextNode(String(descriptor.signal()));
      parent.appendChild(node);
      descriptor.signal.subscribe((v) => (node.textContent = String(v)));
      return { node };
    }

    case "component": {
      const placeholder = document.createComment(`component:${descriptor.name}`);
      parent.appendChild(placeholder);
      descriptor.import().then((mod) => {
        const comp = mod[descriptor.name];
        const childDescriptor = resolveComp(comp, descriptor.props);
        mount(childDescriptor, parent);
        placeholder.remove();
      });
      return { placeholder };
    }

    case "if": {
      const anchor = document.createComment("if");
      parent.appendChild(anchor);
      let mounted: BoundNode[] = [];

      const update = (value: any) => {
        mounted.forEach((n) => unmount(n));
        mounted = [];
        const branch = value ? descriptor.children : descriptor.else;
        if (branch) {
          branch.forEach((child) => mounted.push(mount(child, parent)));
        }
      };

      update(descriptor.condition());
      descriptor.condition.subscribe(update);
      return { anchor, mounted };
    }

    case "for": {
      const anchor = document.createComment("for");
      parent.appendChild(anchor);
      let mounted: BoundNode[][] = [];

      const update = (list: any[]) => {
        patchList(parent, anchor, mounted, list, descriptor.render);
      };

      update(descriptor.source());
      descriptor.source.subscribe(update);
      return { anchor, mounted };
    }

    case "await": {
      const anchor = document.createComment("await");
      parent.appendChild(anchor);
      let mounted: BoundNode[] = [];

      descriptor.pending.forEach((child) => mounted.push(mount(child, parent)));

      descriptor
        .promise()
        .then((value) => {
          mounted.forEach((n) => unmount(n));
          mounted = [];
          descriptor.then(value).forEach((child) => mounted.push(mount(child, parent)));
        })
        .catch((err) => {
          mounted.forEach((n) => unmount(n));
          mounted = [];
          descriptor.catch(err).forEach((child) => mounted.push(mount(child, parent)));
        });

      return { anchor, mounted };
    }

    case "switch": {
      const anchor = document.createComment("switch");
      parent.appendChild(anchor);
      let mounted: BoundNode[] = [];

      const update = (value: any) => {
        mounted.forEach((n) => unmount(n));
        mounted = [];
        const match = descriptor.cases.find((c) => c.value === value);
        const branch = match ? match.children : descriptor.default;
        if (branch) {
          branch.forEach((child) => mounted.push(mount(child, parent)));
        }
      };

      update(descriptor.expr());
      if (typeof descriptor.expr === "function" && descriptor.expr[_obsMarker]) {
        descriptor.expr.subscribe(update);
      }
      return { anchor, mounted };
    }
  }
}
```

### List Patching

`@for` never re-renders the full list. It diffs old vs new and only adds/removes changed nodes:

```ts
function patchList(parent, anchor, mounted, newList, renderFn) {
  const oldLen = mounted.length;
  const newLen = newList.length;

  for (let i = newLen; i < oldLen; i++) {
    mounted[i].forEach((n) => unmount(n));
  }
  mounted.length = newLen;

  for (let i = oldLen; i < newLen; i++) {
    const nodes = renderFn(newList[i]).map((d) => mount(d, parent));
    mounted[i] = nodes;
  }
}
```

---

## Runtime Compiler Pipeline

The compiler runs server-side, on demand, when the browser requests a `.web` file.

### Pipeline

```
Browser requests /src/components/shop.web
  ↓
view plugin intercepts GET /src/**/*.web
  ↓
Step 1 — Splitter
  finds comp block boundaries
  splits file into import chunks and comp chunks
  ↓
Step 2 — Script merger
  finds all <script> blocks inside each comp
  merges them into a single setup() function in source order
  ↓
Step 3 — Props/Emits hoister
  extracts defineProps() and defineEmits() from setup
  promotes them to top-level descriptor keys
  ↓
Step 4 — Template compiler
  tokenizes template section of each comp
  parses into descriptor AST
  generates descriptor object literal
  ↓
Step 5 — Reassemble
  joins imports + compiled comp descriptor objects
  now valid TypeScript
  ↓
Step 6 — esbuild.transform()
  strips TypeScript types
  outputs ESM JS
  ↓
Step 7 — Cache
  store by filepath + mtime
  serve to browser
```

### Template Token Types

```ts
type TemplateToken =
  | { type: "TAG_OPEN"; tag: string; selfClose: boolean }
  | { type: "TAG_CLOSE"; tag: string }
  | { type: "ATTR"; name: string; value: string }
  | { type: "ATTR_BINDING"; name: string; expr: string } // attr=[expr]
  | { type: "TEXT"; value: string }
  | { type: "BINDING"; expr: string } // [expr]
  | { type: "DIRECTIVE"; name: string; expr: string } // @if, @for, @switch etc
  | { type: "BLOCK_OPEN" }
  | { type: "BLOCK_CLOSE" }
  | { type: "COMPONENT"; name: string } // PascalCase tag
  | { type: "INCLUDE"; path: string; data?: string }; // @include()
```

### Generator

```ts
function generate(node: TemplateAST): string {
  switch (node.type) {
    case "element":
      return `{
        type: 'element',
        tag: '${node.tag}',
        props: { ${generateProps(node.props)} },
        directives: [ ${generateDirectives(node.directives)} ],
        children: [${node.children.map(generate).join(",")}]
      }`;

    case "text":
      return `{ type: 'text', value: ${JSON.stringify(node.value)} }`;

    case "binding":
      return `{ type: 'reactive', signal: (props, state) => ${node.expr} }`;

    case "if":
      return `{
        type: 'if',
        condition: (props, state) => ${node.condition},
        children: [${node.children.map(generate).join(",")}],
        else: ${node.else ? `[${node.else.map(generate).join(",")}]` : "null"}
      }`;

    case "for":
      return `{
        type: 'for',
        source: (props, state) => ${node.source},
        render: (${node.item}) => [${node.children.map(generate).join(",")}]
      }`;

    case "await":
      return `{
        type: 'await',
        promise: () => ${node.promise},
        pending: [${node.pending.map(generate).join(",")}],
        then: (${node.thenVal}) => [${node.then.map(generate).join(",")}],
        catch: (${node.catchVal}) => [${node.catch.map(generate).join(",")}]
      }`;

    case "switch":
      return `{
        type: 'switch',
        expr: (props, state) => ${node.expr},
        cases: [${node.cases
          .map(
            (c) => `{
          value: ${JSON.stringify(c.value)},
          children: [${c.children.map(generate).join(",")}]
        }`
          )
          .join(",")}],
        default: ${node.default ? `[${node.default.map(generate).join(",")}]` : "null"}
      }`;

    case "component":
      return `{
        type: 'component',
        name: '${node.name}',
        import: () => import('./${node.file}'),
        props: { ${generateProps(node.props)} }
      }`;

    case "include":
      // resolved at compile time — inlined as static text
      const content = readFileSync(node.path, "utf8");
      return `{ type: 'text', value: ${JSON.stringify(content)} }`;
  }
}
```

### Cache

```ts
interface CacheEntry {
  mtime: number;
  js: string;
}

const cache = new Map<string, CacheEntry>();

async function compileAndCache(filepath: string): Promise<string> {
  const mtime = (await stat(filepath)).mtimeMs;
  const hit = cache.get(filepath);

  if (hit && hit.mtime === mtime) return hit.js;

  const source = await readFile(filepath, "utf8");
  const compiled = compile(source);

  const { code } = await esbuild.transform(compiled, {
    loader: "ts",
    format: "esm",
    target: "esnext",
  });

  cache.set(filepath, { mtime, js: code });
  return code;
}
```

---

## Multi-Root SPA Architecture

Each shell is an independent application root. Roots do not share state, module graph, or router.

```
GET /          →  HomeHandler  →  HomeShell   (has router: /, /about, /contact)
GET /admin/*   →  AdminHandler →  AdminShell  (has router: /admin/*)
GET /docs/*    →  DocsHandler  →  DocsShell   (MPA — no router, stateless)
```

### Crossing Roots

Crossing from one root to another is always a full server request:

```ts
// Inside HomeShell — normal anchor tag, full page load
<a href="/admin">Go to admin</a>   // browser navigates, server serves AdminShell

// Within a root — client router intercepts, no server request
<a href="/about">About</a>         // client router handles, stays in HomeShell
```

### Client Router

Declared in the shell's entry script. Each root has its own independent router instance.

```ts
// admin.client.web
import { createRouter } from "@aromix/client";
import { AdminDashboard } from "./pages/AdminDashboard.web";
import { AdminUsers } from "./pages/AdminUsers.web";
import { AdminSettings } from "./pages/AdminSettings.web";

createRouter({
  root: "#root",
  routes: [
    { path: "/admin", component: AdminDashboard },
    { path: "/admin/users", component: AdminUsers },
    { path: "/admin/settings", component: AdminSettings },
  ],
});
```

On refresh (`/admin/users`):

```
Browser requests GET /admin/users
  → page map matches /admin/*
  → AdminShell served
  → admin.client.web boots
  → router reads window.location.pathname → '/admin/users'
  → mounts AdminUsers component into #root
```

---

## Service Boundary

Server services (`@provide()`) and client services (`@singleton()`) are strictly separated. The boundary is enforced by the runtime compiler.

```
UserService.ts          ← server only (@provide)
UserClient.ts           ← client only (@singleton)
formatDate.shared.ts    ← both
```

When the runtime compiler processes a browser request:

- If the import chain reaches a file containing `@provide()` — compile error, request rejected
- If server-side `inject()` is called with a `@singleton()` class — throws at `make()` time

### Client Services (`@singleton()`)

```ts
import { singleton, inject, obs, combine } from "@aromix/client";

@singleton()
class UserClient {
  users = obs([]);
  loading = obs(false);
  filter = obs("");

  filtered = combine(this.users, this.filter).derived(([users, f]) => users.filter((u) => u.name.includes(f)));

  async load() {
    this.loading(true);
    const data = await this.call("user:list", {});
    this.users(data);
    this.loading(false);
  }

  async create(input) {
    const user = await this.call("user:create", input);
    this.users((v) => [...v, user]);
    return user;
  }

  formatName(user) {
    return `${user.first} ${user.last}`;
  }
}
```

Using in a comp:

```ts
export comp UserList {
  <script>
    const users = inject(UserClient)
    onMount(() => users.load())
  </script>

  <div>
    <input
      placeholder="Filter users"
      oninput=[e => users.filter(e.target.value)]
    />

    @if(users.loading){
      <Spinner/>
    } @else {
      @for(user of users.filtered){
        <li>[users.formatName(user)]</li>
      }
    }
  </div>
}
```

`inject()` returns the singleton instance. Same instance everywhere — no prop drilling, no context providers.

---

## Shell Rendering — Server Side

The shell component is a plain JS function called server-side. It returns a descriptor tree. The view plugin resolver converts it to an HTML string.

```ts
function resolveToHTML(descriptor: NodeDescriptor): string {
  switch (descriptor.type) {
    case "element":
      const props = Object.entries(descriptor.props)
        .map(([k, v]) => {
          const val = typeof v === "function" && (v as any)[_obsMarker] ? v() : v;
          return `${k}="${val}"`;
        })
        .join(" ");
      const children = descriptor.children.map(resolveToHTML).join("");
      return `<${descriptor.tag} ${props}>${children}</${descriptor.tag}>`;

    case "text":
      return descriptor.value;

    case "reactive":
      return String(descriptor.signal());

    case "component":
      return `<!-- component:${descriptor.name} -->`;
  }
}
```

---

## Stability

| Symbol                        | Tier     |
| ----------------------------- | -------- |
| `@page()` signature           | LOCKED   |
| `ctx.render()` signature      | LOCKED   |
| `obs()` API                   | LOCKED   |
| `combine()` API               | LOCKED   |
| Descriptor object shape       | LOCKED   |
| `comp` block syntax           | LOCKED   |
| `[ ]` binding syntax          | LOCKED   |
| `@` directive syntax          | LOCKED   |
| `defineProps` / `defineEmits` | LOCKED   |
| `inject()` in `<script>`      | LOCKED   |
| `@singleton()` + `inject()`   | LOCKED   |
| `this.call()`                 | LOCKED   |
| `_obsMarker` symbol           | INTERNAL |
| Runtime compiler pipeline     | INTERNAL |
| Script block merger           | INTERNAL |
| Cache implementation          | INTERNAL |
| Page map resolution order     | LOCKED   |

---

## File Layout

```
packages/
  core/src/
    page.ts           — @page() decorator, page registry
    index.ts          — re-exports @page()

  client/src/
    obs.ts            — obs(), combine(), _obsMarker
    singleton.ts      — @singleton(), inject()
    runtime.ts        — mount(), setProp(), patchList()
    router.ts         — createRouter()
    index.ts          — re-exports all public API

  view/src/
    plugin.ts         — viewPlugin() factory, buildPluginApp integration
    compiler/
      splitter.ts     — split() — finds comp block boundaries
      script-merger.ts — merges <script> blocks into setup()
      hoister.ts      — hoists defineProps/defineEmits to top-level
      tokenizer.ts    — template tokenizer
      parser.ts       — descriptor AST builder
      generator.ts    — descriptor object literal generator
      pipeline.ts     — compileAndCache(), esbuild integration
    resolver.ts       — resolveToHTML() — descriptor → HTML string
    page-map.ts       — page map building, path resolution
    index.ts          — re-exports viewPlugin
```

---

## Error Reference

| Scenario                                   | Error                                                                                              |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `@page()` path does not start with `/`     | `@page(): path must start with /`                                                                  |
| Duplicate `@page()` path                   | `make(): duplicate page path '/admin'`                                                             |
| `ctx.render()` called without view plugin  | `ctx.render is not a function — is viewPlugin() registered?`                                       |
| Server service imported in client file     | `[aromix] compiler: cannot import server service 'UserService' in client context`                  |
| `@singleton()` passed to server `inject()` | `inject(): UserClient is a @singleton() — use inject() in client context`                          |
| Template syntax error                      | `[aromix] compiler: unexpected token at line N in shop.web`                                        |
| `@include` file not found                  | `[aromix] compiler: @include file not found: partials/footer.html`                                 |
| Directive not imported or defined          | `[aromix] compiler: unknown directive 'tooltip' in shop.web — import it or define it in this file` |
| Component import fails at runtime          | Component placeholder stays, error logged to console                                               |

---

## Out of Scope for This Blueprint

- Key-based list diffing for reordering — `@for` currently adds/removes by index
- Two-way binding beyond `<input>` — forms covered in separate blueprint
- CSS scoping — no scoped styles in v1, global CSS only
- SSR for components beyond the shell — components are client-only in v1
- `this.call()` type generation — covered in compiler blueprint
- Dev panel integration — covered in panel blueprint
- `@aromix/auth` client integration — covered in auth blueprint
