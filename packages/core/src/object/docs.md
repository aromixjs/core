# Object Builder Reference

Fluent, type-safe object manipulation. Every operation in the chain recomputes the TypeScript type. `value()` exits the chain and returns a clean resolved plain object — no `Omit<>`, `Pick<>`, or `Record<>` wrappers in hover or autocomplete.

## API

### `object(val)`

Wraps any plain object and starts the chain.

```ts
const result = object({ name: 'alice', age: 30, role: 'admin' })
  .omit(['role'])
  .patch({ age: 31 })
  .value()
// → { name: string; age: number }
```

---

### `.patch(changes)`

Deep partial update. Only the keys you pass are touched at any depth. Nested objects are merged field by field — not replaced wholesale. Arrays and primitives are replaced outright.

```ts
const user = {
  name: 'alice',
  address: { city: 'Dhaka', zip: '1200' },
  tags: ['admin', 'staff'],
}

// update one nested key — everything else untouched
object(user).patch({ address: { city: 'Chittagong' } }).value()
// → { name: 'alice', address: { city: 'Chittagong', zip: '1200' }, tags: [...] }

// arrays are replaced, not merged
object(user).patch({ tags: ['owner'] }).value()
// → { ..., tags: ['owner'] }

// original is never mutated
object(user).patch({ name: 'bob' })
user.name // still 'alice'
```

**Rule:** if both the existing value and the incoming value are plain objects, they are merged recursively. Anything else (array, primitive, null, class instance) is replaced.

---

### `.omit(keys)`

Removes the named keys. Type narrows to exclude those keys.

```ts
const row = { id: 1, name: 'alice', passwordHash: 'abc', stripeId: 'x' }

object(row).omit(['passwordHash', 'stripeId']).value()
// → { id: number; name: string }
// passwordHash and stripeId are gone from both the value and the type
```

---

### `.pick(keys)`

Keeps only the named keys. Type narrows to only those keys.

```ts
const row = { id: 1, name: 'alice', role: 'admin', internal: true }

object(row).pick(['id', 'name']).value()
// → { id: number; name: string }
```

---

### `.defaults(fallbacks)`

Fills keys that are `undefined`. Existing values are never overwritten, even if they are `null` or `false`.

```ts
const partial = { name: 'alice', role: undefined, status: undefined }

object(partial).defaults({ role: 'user', status: 'active', name: 'fallback' }).value()
// → { name: 'alice', role: 'user', status: 'active' }
// name kept as 'alice' — was already set
// role and status filled from fallbacks
```

---

### `.mapValues(fn)`

Runs `fn` over every value. The type changes to reflect the new value type.

```ts
const fields = { name: 'string', age: 'number', active: 'boolean' }

object(fields).mapValues(v => v.toUpperCase()).value()
// → { name: 'STRING'; age: 'NUMBER'; active: 'BOOLEAN' }
```

Useful for transforming field maps into schema maps:

```ts
object(fieldDefs).mapValues(f => f.valibotSchema).value()
// → { [fieldName]: AnySchema }
```

---

### `.mapKeys(fn)`

Renames every key based on `fn`. Values are unchanged.

```ts
const row = { first_name: 'alice', last_name: 'smith' }

object(row).mapKeys(k => k.replace('_', '')).value()
// → { firstname: 'alice', lastname: 'smith' }
```

---

### `.filter(fn)`

Keeps only entries where `fn` returns true. Return type becomes `Partial<T>` since TypeScript cannot know at compile time which keys will pass.

```ts
const fields = { name: 'alice', role: undefined, age: 30, bio: undefined }

object(fields).filter(v => v !== undefined).value()
// → { name: 'alice', age: 30 }
```

Useful for building subsets of field definitions:

```ts
object(fieldDefs).filter((f, key) => f.client.insert === true).value()
// → only fields the client can insert
```

---

### `.clone()`

Deep clones the current object. Safe to use before any operation that you do not want touching the original.

```ts
const original = { config: { debug: true } }
const copy     = object(original).clone().value()

copy.config.debug = false
original.config.debug // still true
```

---

### `.value()`

Exits the chain and returns the final object. The type is always a clean resolved plain object — `Omit<>`, `Pick<>`, and `Record<>` wrappers are fully expanded before returning.

```ts
const result = object({ a: 1, b: 2, c: 3 })
  .omit(['c'])
  .pick(['a'])
  .value()

// hover shows: { a: number }
// not: Pick<Omit<{ a: number; b: number; c: number }, 'c'>, 'a'>
```

---

## Chaining

Operations compose in any order. Each step recomputes the type based on the previous step's output — not the original.

```ts
const def = {
  name:         'alice',
  passwordHash: 'hashed',
  role:         'admin',
  internal:     true,
  client:       { read: true, insert: true, update: false },
}

object(def)
  .omit(['internal'])
  // type: { name, passwordHash, role, client }

  .patch({ client: { read: true, insert: false, update: true } })
  // type: { name, passwordHash, role, client } — client updated deeply

  .pick(['name', 'role', 'client'])
  // type: { name, role, client }

  .value()
// → { name: string; role: string; client: { read: boolean; insert: boolean; update: boolean } }
```

---

## Rules

| Situation | Behavior |
|---|---|
| `patch` on a nested plain object | recursively merged |
| `patch` on an array | replaced outright |
| `patch` on a primitive or null | replaced outright |
| `defaults` on a key with any value including `null` or `false` | not overwritten |
| `defaults` on a key that is `undefined` | filled |
| `filter` return type | always `Partial<T>` — TypeScript cannot narrow dynamically |
| `value()` type | always a clean resolved plain object |
| Original object | never mutated by any operation |