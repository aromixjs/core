# AGENTS.md

## Project

Aromix — a runtime-agnostic server framework (core) with per-runtime adapters (bun, cloudflare) and a CLI scaffolder. Early-stage; much of the runtime plumbing is stubbed.

## Workspace

pnpm monorepo, packages live under `packages/*`.

| Package              | Purpose                                                                                       | Depends on                               |
| -------------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------- |
| `@aromix/core`       | Runtime-agnostic framework (entities, KV schema, object builder, msgpack codec, build config) | valibot, @msgpack/msgpack                |
| `@aromix/bun`        | Bun.serve() adapter                                                                           | @aromix/core                             |
| `@aromix/cloudflare` | Cloudflare Workers adapter                                                                    | @aromix/core                             |
| `@aromix/cli`        | `aromix init` / `aromix build` CLI                                                            | ts-morph, handlebars, esbuild, fast-glob |
| `playground`         | Private test harness                                                                          | @aromix/core, @aromix/bun                |

## Commands

```
pnpm build          # all packages (tsup)
pnpm dev            # all packages (tsup --watch)
pnpm typecheck      # tsc --build (project references)
pnpm clean          # rm -rf dist in every package
pnpm format         # prettier --write
pnpm test           # vitest run (all packages)
pnpm test:watch     # vitest watch mode

# Per-package shortcuts
pnpm core:build     pnpm core:dev     pnpm core:test
pnpm bun:build      pnpm bun:dev
pnpm cloudflare:build  pnpm cloudflare:dev
pnpm cli:build      pnpm cli:dev
pnpm cli:link       # global link the CLI

# Playground
pnpm playground:build   pnpm playground:dev
```

## Build / Typecheck

- **tsup** config per package: single entry `src/index.ts`, outputs ESM + CJS + `.d.ts`, target ES2022, `clean: true`, `splitting: true`.
- **TypeScript**: `tsconfig.base.json` shared; each package extends it. Root `tsc --build` uses project references.
- **Declaration-only emit** at root level (`emitDeclarationOnly: true`); tsup handles JS bundling.
- Order: `build -> typecheck` (build must run first so `.d.ts` exist for cross-package typecheck).

## Key gotchas

- `entity/kv/builder.ts` is **commented out** (was using `remeda`, dependency removed). Needs re-implementation before `kv`, `kvSchema` can be used.
- `kvSchema` is exported from `core/src/index.ts` but **does not exist yet** — the export is also commented out.
- `toFetchHandler()` in `core/src/fetch/fetch.ts` is a **stub** (all code commented out). Same for `serve()` in both bun and cloudflare adapters.
- `entity()` in `core/src/entity/entity.ts` is a **stub** (empty body).
- `@aromix/node` adapter does not exist yet but is referenced by the CLI init command.
- Playground `src/index.ts` is **commented out** because it depends on the disabled kv builder.

## Architecture (spec vs reality)

`spec/` contains the full design vision (program/command/stream/socket, schema/service/model/job/cron/workflow, plugin system). **None of this is implemented yet.** The current codebase only has:

- `ObjectBuilder` — fluent object manipulation (patch, omit, pick, defaults, mapValues, mapKeys, filter, clone) — **fully implemented and tested**
- `Codec` — msgpack encode/decode for request/response — **implemented**
- `kv` field builder — `kv.string()/.number()/.boolean()` with `.notNull()`, `.default()`, `.client()`, `.computed()` — **commented out, needs re-implementation**
- `KvStorage` / `KvAdapter` interfaces — **implemented**
- `build()` config helper — **implemented**
- `macro.ts` — global type augmentation for `Aromix.load<T>()` — **types only, no runtime**

## Testing

- Vitest configured at workspace root (`vitest.config.ts`).
- Tests live under `packages/*/tests/**/*.test.ts`.
- Run all tests: `pnpm test` (or `pnpm test:watch` for watch mode).
- Run core tests only: `pnpm core:test`.
- One test file exists: `packages/core/tests/object-builder.test.ts` (23 tests, all passing).
- No CI configured yet.

## Style

- ESM-first (`"type": "module"` in all packages).
- Prettier for formatting (ts, js, json, md, cjs).
- `experimentalDecorators: true` in tsconfig (for future `@provide()` / `inject()` pattern from spec).
- `forceConsistentCasingInFileNames: true`.
