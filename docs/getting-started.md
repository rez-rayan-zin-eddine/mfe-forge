# Introduction

MFE Forge is a command-line tool plus a set of small runtime packages for building **micro frontends (MFEs)** with **Vite**, **React 19** and **Module Federation**. The CLI scaffolds a workspace, generates hosts and remote applications, keeps the host's federation configuration in sync with the remotes that exist on disk, and inspects the result. The runtime packages give those applications error boundaries, lazy remote loading, an event bus, routing helpers, shared Zustand stores, design tokens and test helpers.

::: warning Pre-1.0 software
MFE Forge is on the `0.x` line (current release: `0.1.1`). Minor versions may contain breaking changes. npm versions `2.0.0` to `8.1.0` of `mfe-forge` are deprecated prototype releases; use `0.1.0` or later.
:::

## Why MFE Forge

Module Federation lets independently built applications share code at runtime, but a working setup needs many pieces that are tedious to keep consistent by hand:

- each remote needs a unique federation name, a free dev port and an exposed entry;
- each host needs a `remotes` entry and a TypeScript module declaration for every remote it consumes;
- React, React DOM, React Router and Zustand must be declared as shared singletons on both sides;
- the host must survive a remote that is down or throws.

MFE Forge encodes these conventions. You name an application `scope/name`, and the CLI derives the directory, the package name, the federation name, the port and the dev script from it, then wires remotes into the host of the same scope.

## Feature overview

| Area                | What you get                                                                                                                         | Reference                                                        |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| Project scaffolding | `init` creates a workspace with `apps/`, `packages/`, `tools/`, a root `package.json`, `tsconfig.base.json` and `mfeforge.config.js` | [`init`](./cli/init.md)                                          |
| Code generation     | `generate` (alias `g`) creates hosts, remote apps, packages, libraries and a design-system package from templates                    | [`generate`](./cli/generate.md)                                  |
| Federation sync     | `sync` rewrites each host's `remotes` block and `src/remotes/declarations.d.ts`, and writes `mfe-forge.manifest.json`                | [`sync`](./cli/sync.md)                                          |
| Orchestration       | `dev`, `build` and `test` run the per-app scripts for all apps, one scope or one app                                                 | [`dev`](./cli/dev.md), [`build`](./cli/build.md)                 |
| Diagnostics         | `doctor`, `status`, `graph`, `inspect`, `deps`, `check`, `migrate`; most support `--json`                                            | [`doctor`](./cli/doctor.md), [diagnostics](./cli/diagnostics.md) |
| Configuration       | `mfeforge.config.*`, validated with a zod schema; `config` reads and edits it                                                        | [Configuration](./config.md)                                     |
| Runtime             | `@mfe-forge/core`, `router`, `store`, `design`, `testing`                                                                            | [Packages](./packages/)                                          |

## How the pieces fit

```text
            you                                   mfe-forge CLI
             |                                         |
             |  mfe-forge generate app shop/catalog    |
             +---------------------------------------->|
                                                       | 1. copies templates/app into apps/shop/catalog
                                                       | 2. picks a free port in dev.portRange
                                                       | 3. adds "dev:shop:catalog" to the root package.json
                                                       | 4. if apps/shop/host exists, rewrites its remotes
                                                       |    block and declarations.d.ts
                                                       v
  apps/shop/host  (federation name shopHostApp)       apps/shop/catalog  (shopCatalogApp)
  vite.config.ts                                      vite.config.ts
    remotes: {                                          exposes: { './App': './src/bootstrap.tsx' }
      shopCatalogApp:                                   filename: 'remoteEntry.js'
       'http://localhost:3001/assets/remoteEntry.js'
    }
  src/App.tsx                                          uses @mfe-forge/core, router, store
    React.lazy(() => import('shopCatalogApp/App'))
```

At runtime the host loads `remoteEntry.js` from the remote's URL, negotiates the shared singletons and renders the exposed component. `@mfe-forge/core` wraps that render in an error boundary with a retry button and an accessible loading state. See [Concepts](./concepts.md) for each term and [Architecture](./architecture.md) for the internals.

## Status and maturity

This summary is drawn from the project [roadmap](https://github.com/rez-rayan-zin-eddine/mfe-forge/blob/main/ROADMAP.md) and the [known issues](https://github.com/rez-rayan-zin-eddine/mfe-forge/blob/main/docs/ai/known-issues.md) list.

What works today:

- Scaffolding with `init` and `generate`, deterministic naming and port allocation.
- Idempotent `sync` with `--dry-run`, `--check` and `--json` modes.
- `build` and `test` exit non-zero when a target fails (`2` for task failures, `3` for configuration errors).
- Runtime error boundary with `role="alert"` and a "Try again" button that re-imports the remote, and a loading fallback with `role="status"`.

Known limitations you should plan around:

- Templates use [`@originjs/vite-plugin-federation`](https://github.com/originjs/vite-plugin-federation) and pin Vite `~5.4`. Moving to Module Federation 2.0 (`@module-federation/vite`) is the main item of roadmap phase B (`0.2.0`).
- The host's `remotes` block is rewritten **as text**. Remotes declared through variables or spread expressions are not understood.
- `mfeforge.config.ts` is evaluated without a TypeScript compiler. Imports are stripped, so the default export must be a self-contained object literal.
- Remote URLs are always `http://localhost:<port>/assets/remoteEntry.js`. There is no per-environment remote URL support yet; see [Publishing](./publishing.md).
- The generated root `package.json` lists `apps/*` as a workspace, but apps live two levels deep (`apps/<scope>/<name>`). Add `apps/*/*` yourself; see [Installation](./installation.md#workspace-layout-fix).
- There is no end-to-end test of `init → generate → install → build → load remote` yet.

## Next steps

- [Installation](./installation.md): requirements and package manager support.
- [Quick start](./quick-start.md): a host and a remote running in a few minutes.
- [Example project](./tutorials/example-project.md): a complete walkthrough with two remotes and shared state.
- [CLI reference](./cli/): every command and flag.
