# MFE Forge framework overview

MFE Forge combines a CLI, generated project conventions, and runtime packages for Vite + React Module Federation projects. It is convention-oriented rather than a replacement for Vite or a process supervisor.

## Current architecture

```text
Agent OS → Project OS (CLI/config/manifest/discovery/sync) → Runtime OS (loader/events/store/router)
```

The Agent OS is documented in `AGENTS.md` and `.agents/`. The Project OS is exposed through `status`, `graph`, `inspect`, `deps`, `check`, `doctor`, `sync`, and `migrate`. The Runtime OS lives in the published package source under `packages/`.

## Current CLI package commands

`init`, `generate`, `dev`, `build`, `test`, `sync`, `doctor`, `config`, `status`, `graph`, `inspect`, `deps`, `check`, and `migrate`. See [docs/cli.md](docs/cli.md) for actual flags and limitations.

## Stability statement

The project is not yet a fully production-ready release. Full process supervision, robust environment-aware remote contracts, advanced federation adapters, and generated fixture coverage remain follow-up work. Packages are published on the pre-1.0 `0.x` line until those gaps are closed.

## Development

```bash
bun install --frozen-lockfile
bun run build
bun run test
bun run docs:build
```
