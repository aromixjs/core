# AV Spec (Draft v7)

`.av` file extension

## 1. File

```ts
import card from './card.av'

<!view use:ui="@aromix/ui-kit" use:t="./traits" contract={...}>
  <style> ... </style>
  <markup + directives + bindings>
  <script> ... </script>
</!view>
```

- Exactly one `<!view>` per file. File = component. Filename = component name.
- Code above `<!view>`, markup inside it.
- No server `<script>`. `contract` on `<!view>` is the only server connection.

## 2. Composition

| Source | Syntax | Can use `contract=` |
|---|---|---|
| Local, same-repo component | `import  card from './card.av'`, used as `<card />` | Yes |
| Namespaced (library component or trait) | `use:prefix="source"` on `<!view>`, used as `<prefix:Name />` or `prefix:name={value}` | No |

- `import` real TS import. Resolved at compile time by the compiler's own module resolution; identity comes from the binding itself, not from any naming/casing convention. Never exists at runtime fully replaced during compilation.
- `use:prefix="source"` — `source` is a local path or a package name, resolved compile-time. LSP types come from generated ambient declarations for that namespace.


## 3. Data `contract` only

No props, ever. No `contract` = no data (pure static markup).

```html
<!view contract={paymentWorkflow.contract}>
  @for(const item of contract.cart.items) {
    <card contract={contract.cart.item(item.id)} />
  }
  <button event:pay>Pay</button>
</!view>
```

- `contract` = live object (data + callable actions), never manually typed — inferred from the expression itself.
- Sources: live primitive (`runner(graph).contract()` / entity equivalent), or a plain ad-hoc literal (`contract={{ title: 'About' }}`) for pages/blocks with no backing primitive.
- Child gets a narrower slice, passed explicitly: `contract={contract.cart.item(id)}` — never inherited automatically.

## 4. Control Flow

```
@if(cond) { } @else if(cond) { } @else { }
@switch(expr) { @case(v) { } @default { } }
@for(const x of xs) { } @empty { }
@with(expr) { }
@try { } @catch(err) { }
```

Adjacency enforced at parse time: `@else if`/`@else` must immediately follow `@if`/`@else if`; `@empty` immediately follows `@for`; `@catch` immediately follows `@try`; duplicate `@case` values = compile error.

## 5. Namespaced Bindings (traits / library behavior)

```ts
export function tooltip(ctx: TraitContext<HTMLElement, string>) {
  ctx.el.title = ctx.value;
}
```

Single element: `<h1 t:tooltip={contract.user.name}>`

Multi-element / shared instance:

```html
<div .datepicker root="">
  <input .datepicker.trigger="picker" />
  <div .datepicker.popup="picker">
    @for(const day of picker.days) {
      <button .datepicker.day="picker" data-day={day}>{day.label}</button>
    }
  </div>
</div>
```

- `prefix:name.role="key"` — `key` names one shared instance; `.role` selects which behavior that element gets from it.
- OPEN: how `key` (a string) becomes the readable `picker` identifier in `@for(... of picker.days)` is not yet specified.
- Erased from server output. Per-page usage collected, deduped, bundled only for what's used.

## 6. Styles

```html
<style>
  .panel { padding: 1rem; }
</style>
```

Auto-scoped (compiler-generated attribute), deduped, inlined. No separate file.

## 7. Scripts

```html
<script>
  document.querySelectorAll('.panel').forEach(el =>
    el.addEventListener('click', () => el.classList.toggle('open')));
</script>
```

Plain client JS, no server scope reachable. Extracted/deduped/inlined like namespaced bindings.

## 8. Tag Resolution

| Pattern | Resolves to |
|---|---|
| Identifier matching a local `import` binding | Local component |
| `prefix:Name` where `prefix` matches a `use:` declaration | Namespaced component |
| Any name containing a hyphen (`<sl-dialog>`) | Custom element, always |
| Any other name, in the HTML5 whitelist | Host element |
| Any other name, not in the whitelist | Compile error |

No casing convention — identity comes from the actual `import`/`use:` binding, not from how the tag is written.

## 9. Compilation

```
Source → Parse → AST → Transform → IR → Codegen → executable render fn (string builder, not VDOM)
```

Compiles on first use, cached in memory (or warmed eagerly at boot). Client bundles tree-shaken per page from actual usage.
