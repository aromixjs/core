# Changesets

This directory contains changeset files that describe version bumps and changelog entries.

## Workflow

1. Run `pnpm changeset` to create a new changeset
2. Commit the generated markdown file
3. On release, run `pnpm version` to apply all changesets and update versions/changelogs
4. Run `pnpm release` to publish updated packages to npm

## Ignored packages

The `playground` package is ignored and will not be versioned or published.
