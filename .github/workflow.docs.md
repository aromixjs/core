# CI/CD

## Version (`version.yml`)

Triggered when change files are pushed to `main` (path: `change/**`).

1. Installs dependencies
2. Checks if change files exist (`change/*.json`)
3. Builds all packages
4. Runs `beachball bump` to bump versions, update changelogs, and remove change files
5. Opens a PR titled `chore: version packages` with the version bumps

## Publish (`publish.yml`)

Triggered when the version PR merges to `main` (path: `packages/**/package.json`).

1. Installs dependencies
2. Verifies the merge is from the version PR (commit message starts with `chore: version packages` and no change files remain)
3. Builds all packages
4. Copies root `README.md` into each package (so npm shows the right readme)
5. Publishes all changed packages to npm via `beachball publish` (creates git tags like `@aromix/core_v0.2.0`)
6. Creates a GitHub Release from the most recent tag

## Adding a change file

```bash
pnpm change
```

This opens an interactive prompt to describe the change. It creates a JSON file under `change/`. Commit and push it to trigger the version workflow.
