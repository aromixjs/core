Clean, focused, extensible:

```ts
app.assets({
  path: "./assets",
  prefix: "/assets",
  cache: true,
})
```

### Type

```ts
interface AssetsOptions {
  path: string
  prefix?: string
  cache?: boolean | {
    maxAge?: number
    immutable?: boolean
  }
}
```

### Examples

Minimal:

```ts
app.assets({
  path: "./assets"
})
```

Custom route:

```ts
app.assets({
  path: "./uploads",
  prefix: "/files"
})
```

Advanced caching:

```ts
app.assets({
  path: "./assets",
  cache: {
    maxAge: 86400,
    immutable: true
  }
})
```
