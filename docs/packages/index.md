# Packages

MFE Forge ships one CLI and five runtime/tooling packages. All are versioned together, are ESM-only, require Node.js 20 or later, and are released under the MIT license.

::: warning Pre-1.0
Every package is on the `0.x` line. APIs may change between minor versions; pin versions and read the changelog when upgrading.
:::

| Package                           | Version | Purpose                                                          | Peer dependencies                                   |
| --------------------------------- | ------- | ---------------------------------------------------------------- | --------------------------------------------------- |
| [`mfe-forge`](../cli/)            | 0.1.1   | CLI for scaffolding and managing the workspace                   | none                                                |
| [`@mfe-forge/core`](./core)       | 0.1.1   | Error boundaries, event bus, remote loading, remote registry     | `react@^19`, `react-dom@^19`                        |
| [`@mfe-forge/router`](./router)   | 0.1.1   | Cross-scope navigation, route events, route generation, guards   | `react@^19`, `react-dom@^19`, `react-router-dom@^7` |
| [`@mfe-forge/store`](./store)     | 0.1.1   | Global and scoped Zustand stores, event-bus sync                 | `zustand@^5`                                        |
| [`@mfe-forge/design`](./design)   | 0.1.1   | Shared design tokens as a typed object and CSS custom properties | see package page                                    |
| [`@mfe-forge/testing`](./testing) | 0.1.1   | Vitest, Testing Library and Playwright helpers                   | see package page                                    |

## mfe-forge (CLI)

The `mfe-forge` command scaffolds a workspace (`init`), generates scoped hosts and remotes (`generate host|app`), discovers the project topology and keeps each host's federation remotes and type declarations in sync (`sync`). It is the only package you run rather than import. See the [CLI reference](../cli/) and [configuration](../config).

## @mfe-forge/core

The runtime foundation every host and remote can share. `MFErrorBoundary` isolates a failing remote behind an accessible fallback with a working "Try again"; `RemoteLoader` and `LazyRemote` wrap a remote in `Suspense` plus that boundary and perform a real retry; `EventBus` / `globalEventBus` provide prefix-namespaced publish/subscribe between MFEs; `RemoteRegistry` stores remote definitions and health metadata. See [core reference](./core).

## @mfe-forge/router

Thin helpers on top of React Router 7: `useMFENavigation` navigates to `/<scope>/<path>` with slash normalization and reports the current scope, `useRouteSync` broadcasts `route:changed` events over an event bus, `generateRoutes` turns a scope-to-routes registry into `<Route>` elements, and `createRouteGuard` builds a sync-or-async access guard. See [router reference](./router).

## @mfe-forge/store

Shared state built on Zustand 5. `useGlobalStore` holds cross-cutting state (user, theme, locale, feature flags); `createScopedStore` creates an independent per-MFE store with a `reset()` action; `syncStoreAcrossMFEs` emits `<prefix>:sync` events carrying the new state and an origin id. See [store reference](./store).

## @mfe-forge/design

Shared design tokens (`colors`, `radius`, `font`, `spacing`) exposed as a typed `tokens` object and applied to the DOM as CSS custom properties with `applyTokens()`. See [design reference](./design).

## @mfe-forge/testing

Test helpers for MFE Forge projects: `renderMFE` renders a component with a route, initial state and wrapper inside `React.StrictMode`, plus utilities for mocking remote modules and Playwright end-to-end checks that rely on the `data-testid` hooks emitted by `@mfe-forge/core`. Install it as a dev dependency. See [testing reference](./testing).

## Sharing runtime packages

When remotes are built separately, share `react`, `react-dom`, `react-router-dom`, `zustand` and the `@mfe-forge/*` runtime packages as Module Federation singletons. Otherwise each bundle gets its own `globalEventBus`, `useGlobalStore` and remote cache, and cross-MFE communication silently stops working. See [architecture](../architecture) and [troubleshooting](../troubleshooting).
