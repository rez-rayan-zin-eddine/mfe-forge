# Concepts

This page defines the vocabulary MFE Forge uses and explains how the CLI derives everything from a project's directory layout.

## Project

A project is a workspace created by [`mfe-forge init`](./cli/init.md). The CLI always treats the **current working directory** as the project root, so run commands from the directory that contains `mfeforge.config.js` (or `.ts`). The layout is:

```text
my-project/
├── apps/                    # hosts and remote apps, grouped by scope
│   └── <scope>/
│       ├── host/            # the scope's host (shell)
│       └── <name>/          # remote apps
├── packages/                # shared packages and libraries
├── tools/                   # free for your own scripts
├── mfeforge.config.js       # human-authored policy (config)
├── mfe-forge.manifest.json  # generated topology (manifest), written by sync/status/migrate
├── package.json             # workspaces + root scripts
└── tsconfig.base.json
```

## Scope

A **scope** is the first segment of an app name: in `shop/catalog`, the scope is `shop`. Scopes model a team, a product area or a domain. Hosts and remote apps **must** be scoped; `generate app catalog` fails with:

```text
Apps and hosts must be scoped: "catalog" → try "catalog-scope/catalog"
```

A directory under `apps/` counts as a scope as soon as one of its subdirectories contains a `vite.config.ts`.

## Host

A **host** (shell) is the app that composes remotes at runtime. A host is recognised purely by convention: it is the directory `apps/<scope>/host` with a `vite.config.ts`. Generate one with:

```bash
mfe-forge generate host shop/host
```

Each host only consumes the remotes of its own scope. The host template declares an empty `remotes: {}` block that [`sync`](./cli/sync.md) fills in, and a `src/remotes/declarations.d.ts` file that `sync` regenerates.

## Remote

A **remote** is any other directory `apps/<scope>/<name>` that contains a `vite.config.ts`. The app template configures the federation plugin to build a `remoteEntry.js` that exposes `./App` (pointing at `src/bootstrap.tsx`).

Names derived from `shop/catalog`:

| Value                       | Derivation                                                                | Example                                       |
| --------------------------- | ------------------------------------------------------------------------- | --------------------------------------------- |
| Directory                   | `apps/<scope>/<name>`                                                     | `apps/shop/catalog`                           |
| Federation name             | camelCase of `scope/name` + `App`                                         | `shopCatalogApp`                              |
| Exposed module              | `<federationName>/App`                                                    | `shopCatalogApp/App`                          |
| Package name                | `scope-name`, prefixed with `@<organization>/` when `organization` is set | `shop-catalog` or `@acme/shop-catalog`        |
| Root dev script             | `dev:<scope>:<name>`                                                      | `dev:shop:catalog`                            |
| Remote URL used by the host | `http://localhost:<port>/assets/remoteEntry.js`                           | `http://localhost:3001/assets/remoteEntry.js` |

Note that the host is itself discovered as an app too (`shop/host`, federation name `shopHostApp`), but it is excluded from its own `remotes` list.

## Ports

Each host and remote gets a fixed dev port written into its `vite.config.ts` (`server.port` and `preview.port`) and `package.json` (`vite --port <n>`). When you do not pass `--port`, `generate` picks the first port in `dev.portRange` (default `[3000, 3999]`) that is neither used by another app (literal `port: <n>` in a `vite.config.ts`, or `--port <n>` in a `dev` script) nor currently bound on your machine.

Discovery reads the port back from the first `port: <number>` match in each `vite.config.ts`. Ports computed at runtime (for example `process.env.PORT`) are invisible to the CLI; it falls back to `3000`.

## Packages and libraries

`generate package <name>` and `generate library <name>` create workspace packages under `packages/<name>` (a `/` in the name becomes `-`). A **package** exports TypeScript source directly (`"main": "./src/index.ts"`); a **library** builds to `dist/` with `tsup`. Neither takes part in federation; they are ordinary workspace dependencies. `generate design-system` creates a Storybook-based component package; see [Design system](./design-system.md).

## Config versus manifest

MFE Forge keeps two files with distinct roles ([ADR 0001](https://github.com/rez-rayan-zin-eddine/mfe-forge/blob/main/docs/ai/decisions/0001-manifest-and-config.md)):

- **`mfeforge.config.*`** is policy you write: organization, default package manager, shared dependency names, port range, build and testing preferences. It is validated with zod on every command. See [Configuration](./config.md).
- **`mfe-forge.manifest.json`** is generated topology: `version: 1`, the project name and root, every discovered app (name, scope, port, URL, federation name, package name, entry), the hosts, the packages under `packages/` with their dependencies, and an `environments` object that is currently always empty. `sync`, `status` and `migrate` write it; `check` and `deps` read it (or compute it on the fly when it is missing).

Commit the manifest if you want diffs of topology in code review; regenerate it with `mfe-forge sync` or `mfe-forge status`.

## Shared dependencies

Federation only works when host and remotes use one copy of React. Every app and host template declares the same `shared` block:

```ts
shared: {
  react: { singleton: true, requiredVersion: '^19.1.0' },
  'react-dom': { singleton: true, requiredVersion: '^19.1.0' },
  'react-router-dom': { singleton: true, requiredVersion: '^7.5.0' },
  zustand: { singleton: true, requiredVersion: '^5.0.12' },
},
```

These versions are hard-coded in the templates. The `federation.shared` array in the config (default `['react', 'react-dom', 'react-router-dom']`) is **not** written into `vite.config.ts`; it is used by [`mfe-forge deps`](./cli/diagnostics.md), which reports a mismatch when packages under `packages/` declare different versions of a shared dependency. If you upgrade React in one app, upgrade it everywhere and update the `requiredVersion` values by hand.

::: warning Share the runtime packages when they carry state
`globalEventBus` (from `@mfe-forge/core`) keeps its subscribers in an in-memory `Map`, and `useGlobalStore` (from `@mfe-forge/store`) is a module-level Zustand store. The templates do **not** list `@mfe-forge/core` or `@mfe-forge/store` in `shared`, so by default each remote bundles its own copy and events or global state do not cross the host/remote boundary. Add them as singletons in the host and in every remote when you rely on them for cross-MFE communication:

```ts
'@mfe-forge/core': { singleton: true },
'@mfe-forge/store': { singleton: true },
```

:::

## Federation sync

`sync` is the operation that turns the filesystem into host configuration:

```text
  apps/ on disk                     discovery                    per host (apps/<scope>/host)
 ┌──────────────────┐    ┌──────────────────────────┐    ┌──────────────────────────────────┐
 │ shop/host        │    │ apps:  shop/host  :3000  │    │ vite.config.ts                   │
 │ shop/catalog     │ -> │        shop/catalog :3001│ -> │   remotes: { shopCatalogApp: …,  │
 │ shop/cart        │    │        shop/cart    :3002│    │              shopCartApp: … }    │
 │ admin/host       │    │ hosts: shop/host,        │    │ src/remotes/declarations.d.ts    │
 └──────────────────┘    │        admin/host        │    │   declare module 'shopCartApp/App'│
                         └──────────────────────────┘    └──────────────────────────────────┘
                                                          + mfe-forge.manifest.json (root)
```

The `remotes: { ... }` block is located with a regular expression and replaced entirely, so any hand-written entries in it are overwritten. When the block is missing, `sync` prints a warning and leaves the file alone. `generate app` and `generate host` perform the same update for the affected host. Run `mfe-forge sync --check` in CI to fail when a host is out of date.

## Runtime loading

In the host, a remote is loaded through a dynamic import of its exposed module:

```tsx
import { LazyRemote } from '@mfe-forge/core'

const Catalog = LazyRemote(() => import('shopCatalogApp/App'), { remoteName: 'shop/catalog' })

// <Route path="/catalog/*" element={<Catalog />} />
```

`LazyRemote` wraps `React.lazy` in an `MFErrorBoundary` and a `Suspense` fallback. If the remote fails to load, the boundary renders an alert with a **Try again** button, and retrying creates a fresh lazy import (a rejected `React.lazy` never retries by itself). `RemoteLoader` offers the same behaviour as a component keyed by remote name and keeps an LRU cache of at most 100 lazy components. Cross-MFE communication uses the `EventBus` from `@mfe-forge/core` and the stores from `@mfe-forge/store`. See [`@mfe-forge/core`](./packages/core.md) and [`@mfe-forge/store`](./packages/store.md).
