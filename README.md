<p align="center"><img src="logo.svg" alt="MFE Forge Logo" width="200" /></p>

# MFE Forge

[![npm version](https://img.shields.io/npm/v/mfe-forge.svg)](https://www.npmjs.com/package/mfe-forge)
[![Docs](https://img.shields.io/badge/docs-GitHub%20Pages-blue)](https://rez-rayan-zin-eddine.github.io/mfe-forge/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> CLI and runtime packages for Vite + React micro-frontends using Module Federation.

MFE Forge scaffolds scoped hosts/remotes, discovers project topology, synchronizes federation declarations, and provides small runtime utilities for loading and coordinating MFEs. The project is pre-1.0 (`0.x`) and under active stabilization: expect breaking changes between minor versions. npm versions `2.0.0`–`8.1.0` are deprecated prototype releases; use `0.1.0` or later.

## What works today

- Scaffold projects with `init` and generate apps, hosts, packages, libraries, and design systems.
- Load `mfeforge.config.ts` / `.js` object configs (comments, imports, type annotations and `as`/`satisfies` are tolerated; no compiler is run).
- Generate and validate `mfe-forge.manifest.json` topology metadata.
- Inspect projects with `status`, `graph`, `inspect`, `deps`, `check`, and `migrate`.
- Synchronize host remotes and TypeScript declarations with idempotent `sync` modes.
- Use runtime error boundaries, event buses, cached lazy remote identity, routing helpers, Zustand stores, design tokens, and testing helpers.

Some planned capabilities—full process supervision, environment-aware remote contracts, complete E2E fixture orchestration, and advanced federation adapters—are not yet complete. See [Known limitations](docs/ai/known-issues.md).

## Quick start

```bash
npm install -g mfe-forge
mfe-forge init my-project
cd my-project
npm install # or pnpm install / bun install
mfe-forge generate host platform/host
mfe-forge generate app platform/dashboard
mfe-forge sync
mfe-forge status --json
```

Apps and hosts use `scope/name` paths. Generated projects currently use the package manager selected during `init`; the CLI adds root development scripts for generated apps.

## CLI at a glance

| Command | Purpose |
| --- | --- |
| `init [name]` | Create a project skeleton |
| `generate <type> [name]` | Create apps, hosts, packages, libraries, or design systems |
| `dev` | Start generated app scripts; multi-app mode currently uses `concurrently` when available |
| `build [app]` | Build discovered apps |
| `test [app]` | Run workspace/app test scripts |
| `sync` | Update host remotes, declarations, and manifest |
| `status`, `graph`, `inspect` | Inspect topology |
| `deps`, `check`, `doctor` | Inspect dependencies and health |
| `config` | Show, validate, and edit configuration |
| `migrate` | Inspect/apply the manifest migration |

Use `mfe-forge <command> --help` for the built command contract.

## Runtime packages

- `@mfe-forge/core` — error boundary, event bus, remote loader, remote registry.
- `@mfe-forge/router` — normalized cross-scope navigation, route generation, async guards.
- `@mfe-forge/store` — global/scoped Zustand stores and sync events.
- `@mfe-forge/design` — design tokens and CSS variable application.
- `@mfe-forge/testing` — React render, remote mock, polling, and Playwright-oriented helpers.

## Repository development

```bash
bun install --frozen-lockfile
bun run build
bun run test
bun run lint
bun run docs:build
```

Read [AGENTS.md](AGENTS.md) for the repository contract and [CONTRIBUTING.md](CONTRIBUTING.md) for contribution workflow.

## Documentation

- [VitePress documentation](https://rez-rayan-zin-eddine.github.io/mfe-forge/)
- [Getting started](docs/getting-started.md)
- [CLI reference](docs/cli.md)
- [Configuration](docs/config.md)
- [Architecture](docs/architecture.md)
- [Testing](docs/testing.md)
- [Publishing](docs/publishing.md)

## License

MIT © [D-Rayno](https://github.com/D-Rayno)
