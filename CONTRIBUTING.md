# Contributing to MFE Forge

By participating you agree to follow the [code of conduct](CODE_OF_CONDUCT.md). Report security issues privately as described in [SECURITY.md](SECURITY.md); for questions see [SUPPORT.md](SUPPORT.md).

## Setup

```bash
git clone https://github.com/rez-rayan-zin-eddine/mfe-forge.git
cd mfe-forge
bun install --frozen-lockfile
bun run build
bun run test
bun run docs:build
```

Repository development needs Node 20+ and the Bun version pinned in the root `package.json` (`packageManager`). Generated projects support Bun, pnpm and npm.

## Workflow

1. Read [`AGENTS.md`](AGENTS.md) and the relevant `.agents/skills/` procedure.
2. Create a focused branch.
3. Inspect existing APIs/tests before editing.
4. Add tests for changed behavior.
5. Keep docs and CLI help truthful.
6. Add a changeset (`bun changeset`) when a published package or template changes.
7. Run focused checks, then the full matrix: `bun run lint && bun run type-check && bun run build && bun run test && bun run check:package && bun run docs:build`.
8. Review `git diff --check` and report known limitations.

## Repository structure

- `packages/cli` — CLI, config, discovery, manifest, sync, and templates
- `packages/core` — runtime loader, registry, event bus, error boundary
- `packages/router` — route helpers and navigation
- `packages/store` — global/scoped Zustand state and sync
- `packages/design` — tokens and CSS variables
- `packages/testing` — React and remote testing helpers
- `docs` — VitePress site and persistent AI engineering knowledge

## Commit and PRs

Use Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`). PRs should state behavior, verification commands, and remaining limitations; the pull request template lists the checklist.

## Release

The packages follow the `0.x` development line; all packages are versioned together. Use Changesets for versioning; do not run `npm publish` without passing authentication, dry-run, and full verification gates. See [docs/publishing.md](docs/publishing.md).
