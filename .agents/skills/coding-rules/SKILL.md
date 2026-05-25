# Coding Rules

## 1. No Ternary Operators

Never use `? :` ternary expressions. Always use `if/else` with an intermediate variable.

```ts
// BAD
let data = test ? "ok" : "not ok";

// GOOD
let data = "not ok";
if (test) {
	data = "ok";
}
```

## 2. Let TypeScript Infer Types

Do not manually annotate return types or generic parameters when TypeScript can infer them. Reduce type casting to the absolute minimum.

```ts
// BAD — TS already knows this returns number
function add(a: number, b: number): number {
	return a + b;
}

// GOOD
function add(a: number, b: number) {
	return a + b;
}
```

Only use type assertions (`as X`) when there is no alternative approach. Prefer runtime checks (e.g. key existence) over casting.

```ts
// BAD — unnecessary cast
const value = obj[key] as string;

// GOOD — check the key exists first
if (key in obj) {
	const value = obj[key];
	// value is now properly typed
}
```

## 3. No Inline Calculations in Function Calls or Constructors

Never pass computed expressions directly into function calls or `new` constructor arguments. Always store the result in an intermediate variable first.

```ts
// BAD
return new ObjectBuilder(ObjectBuilder.deepMerge(this.data, changes));

// GOOD
const merged = ObjectBuilder.deepMerge(this.data, changes);
return new ObjectBuilder(merged);
```

**Exception:** This rule does not apply to `if` block conditions. Complex boolean expressions inside `if (...)` are acceptable inline.

```ts
// OK — condition inside if is fine
if (change && typeof change === "object" && !Array.isArray(change)) {
	// ...
}
```

## 4. No Type Casting When a Runtime Check Works

If a value needs a type cast, ask whether a runtime check can solve it instead. Check if a key exists, check the type, narrow naturally.

```ts
// BAD
(result as Record<string, unknown>)[key] = change;

// GOOD
if (key in result) {
	result[key] = change;
}
```

## 5. No Underscore Prefix in Variable Names

Never use `_` as a prefix for variables (e.g. `_data`, `_unused`). If a variable is declared, it is used. If it is intentionally unused, restructure the code.

```ts
// BAD
const _result = someFn();

// GOOD
const result = someFn();
```

## 6. Naming Conventions

- **Normal variables** — `camelCase`
- **App-wide constants** (used throughout the app) — `PascalCase`
- **Intermediate consts** (part of a single operation) — `camelCase`, not PascalCase

```ts
// GOOD — app-wide constant
const DatabaseUrl = "postgres://localhost";

// GOOD — intermediate variable
const merged = ObjectBuilder.deepMerge(base, changes);

// BAD — intermediate should not be PascalCase
const Merged = ObjectBuilder.deepMerge(base, changes);
```

Never use `ALL_CAPS` for variable names.

## 7. Always Use Braces for If Blocks

Never write single-line if statements without braces. Always open a scope.

```ts
// BAD
if (this[$def].kind === "computed") {
	throw new Error("computed fields cannot be notNull");
}

// GOOD
if (this[$def].kind === "computed") {
	throw new Error("computed fields cannot be notNull");
}
```

## 8. Prefer Type Annotation Over Type Casting

Use variable type annotations instead of `as` casts on the value. Never duplicate — pick one, annotation first. Only fall back to casting if annotation is not possible.

```ts
// BAD — duplicate
const result: Pick<T, K> = {} as Pick<T, K>;

// BAD — cast when annotation works
const result = {} as Pick<T, K>;

// GOOD — annotation only
const result: Pick<T, K> = {};
```

## 9. Pass Generics Explicitly, Do Not Cast the Value

When calling any function or constructor that accepts a generic type parameter, pass the generic explicitly instead of casting the value to match.

```ts
// BAD — casting the value to satisfy the generic
return new ObjectBuilder(result as Omit<T, K>);

// BAD — same issue on a regular function call
someFn(value as SomeType);

// GOOD — pass the generic explicitly
return new ObjectBuilder<Omit<T, K>>(result);

// GOOD — same approach on a regular function call
someFn<SomeType>(value);
```

This applies everywhere — constructors, class methods, standalone functions, any call site where a generic is involved. If the value's type doesn't match what the generic expects, update the generic parameter, not the value.

## 10. No Large Inline Types — Extract to a Type Alias

If a type is verbose or complex, give it its own named type. Inline types should be small. If the type can be reused via generics, define it once and reference it.

```ts
// BAD — big inline type
const result = {} as { [K in keyof T]: U };

// GOOD — extracted to a reusable utility type
type MapValues<T, U> = { [K in keyof T]: U };
const result: MapValues<T, U> = {};
```

If the type is only used once and is short, inline is fine. If it spans multiple lines or looks verbose, extract it.

## 11. Do Not Extract Simple Conditions Into Variables

Do not pull boolean expressions out of an `if` statement into a separate variable unless the expression is reused multiple times. Write the condition directly inside the `if`.

```ts
// BAD — extracted to a variable for no reason
const bothPlainObjects = change && typeof change === "object"
	&& !Array.isArray(change) && existing && typeof existing === "object"
	&& !Array.isArray(existing);

if (bothPlainObjects) {
	// ...
}

// GOOD — condition lives inside the if
if (
	change && typeof change === "object" && !Array.isArray(change) && existing
	&& typeof existing === "object" && !Array.isArray(existing)
) {
	// ...
}
```

---

## 12. Use `structuredClone` Instead of Spread for Cloning

Never use the spread operator (`{ ...obj }`) to clone an object. Use `structuredClone()` instead. It is less noisy and performs a proper deep clone.

```ts
// BAD — shallow clone, noisy
const copy = { ...data };

// GOOD — deep clone, clean
const copy = structuredClone(data);
```

## 13. Write Code Sequentially — One Step Per Line

Do not chain multiple operations into a single expression. Each call, construction, or operation gets its own line and its own variable. Build up the result step by step.

```ts
// BAD — chained construction with inline computation
return new ObjectBuilder<Omit<T, K>>(
	ObjectBuilder.deepMerge(this.data, changes),
);

// GOOD — each step is its own line
const merged = ObjectBuilder.deepMerge(this.data, changes);
const builder = new ObjectBuilder<Omit<T, K>>(merged);
return builder;
```

This applies to everything: function calls, constructor calls, method chains, any operation that does more than one thing. Write it out sequentially.

## 14. Block Spacing — Empty Lines Inside Every Block

Always add an empty line after the opening brace and before the closing brace of any block. This gives code breathing room and prevents a cramped, cryptic look.

```ts
// BAD — no breathing room
function doSomething() {
	const x = 1;
	return x;
}

if (condition) {
	doWork();
}

for (const key of keys) {
	process(key);
}

// GOOD — empty line after opening, empty line before closing
function doSomething() {
	const x = 1;

	return x;
}

if (condition) {
	doWork();
}

for (const key of keys) {
	process(key);
}
```

This applies to all blocks: functions, methods, `if`, `else`, `for`, `for...of`, `for...in`, `while`, `switch`, `try`/`catch`/`finally`, class bodies, object literals, and any other `{ }` scope.

## 16. One Line = One Statement

A single expression or operation always stays on one line, no matter how long it gets. Never break a statement across multiple lines. One line of code equals one piece of work.

```ts
// BAD — broken across lines
if (
	change && typeof change === "object" && !Array.isArray(change) && existing
	&& typeof existing === "object" && !Array.isArray(existing)
) {
	result[key] = ObjectBuilder.deepMerge(existing, change);
}

// GOOD — single line, no matter the length
if (
	change && typeof change === "object" && !Array.isArray(change) && existing
	&& typeof existing === "object" && !Array.isArray(existing)
) {
	result[key] = ObjectBuilder.deepMerge(existing, change);
}
```

This applies to everything: conditions, function calls, variable assignments, return statements, anything. If it's one operation, it's one line.

## 17. Prettier Config — `printWidth: 9999`

Set `printWidth` to `9999` in `.prettierrc.json`. This prevents Prettier from ever wrapping lines. Line breaks are a developer decision, not a formatter decision.

```json
{
	"printWidth": 9999
}
```

Never write inline type assertions (`value as SomeType`) scattered throughout the code. Use a single reusable `cast` method to handle all type narrowing in one place.

```ts
// BAD — inline casts everywhere
const result = {} as Pick<T, K>;
const keys = Object.keys(this.data) as Array<keyof T>;
const copy = this.data as Prettify<T>;

// GOOD — all casts go through cast<U>()
const result = this.cast<Pick<T, K>>({});
const keys = this.cast<Array<keyof T>>(Object.keys(this.data));
const copy = this.cast<Prettify<T>>(this.data);
```

The `cast` method is a private helper that centralizes all type assertions:

```ts
private cast<U>(value: unknown): U {
    return value as U;
}
```

This keeps the rest of the code clean. If the casting strategy ever needs to change, you only update one method.

## 18. No Shorthands — Always Use Full Descriptive Names

Never use abbreviated or shorthand variable names. Every identifier must clearly describe what it holds or represents. This applies to:

- **Type parameters** — `Schema` not `S`, `Model` not `T`, `TargetType` not `T` or `Obj`
- **Loop variables** — `entryKey` / `entryValue` not `k` / `v`, `index` not `i`
- **Function parameters** — `handler` not `fn`, `accessors` not `map`, `configuration` not `config`
- **Internal variables** — `current` not `cur`, `fieldPath` not `dot` or `p`, `target` not `obj`
- **Types and interfaces** — `Operation` not `Op`, `PermissionSet` not `Can`, `OperationCapture` not `OpState`
- **Class names** — `ObjectProcessor` not `Obj`

```ts
// BAD — shorthands everywhere
type Op<T> = { (f: CrushKeys<T>[]): void }
function makeOp<T>() {
  const s: OpState<T> = { t: 'include', p: [] }
  const fn = (f: CrushKeys<T>[]) => { s.t = 'include'; s.p = f }
  return Object.assign(fn as any, { omit: fn.omit, s })
}

// GOOD — every name is descriptive
type Operation<Model> = { (fields: CrushKeys<Model>[]): void }
function createOperation<Model>() {
  const captured: OperationCapture<Model> = { type: 'include', paths: [] }
  const handler = (fields: CrushKeys<Model>[]) => { captured.type = 'include'; captured.paths = fields }
  return Object.assign(handler as any, { omit: handler.omit, captured })
}
```

**Exceptions:** Standard single-letter names that are universally understood in their context (e.g. `K` for key in mapped types, `T` in utility types like `Pick<T, K>`). When in doubt, spell it out.
