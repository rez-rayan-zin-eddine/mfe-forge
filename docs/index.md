---
layout: home

hero:
  name: 'MFE Forge'
  text: 'Micro frontends for Vite and React'
  tagline: A CLI that scaffolds and synchronises Module Federation hosts and remotes, plus small runtime packages for loading and coordinating them. Pre-1.0.
  image:
    src: /logo.svg
    alt: MFE Forge logo
  actions:
    - theme: brand
      text: Get started
      link: /getting-started
    - theme: alt
      text: Quick start
      link: /quick-start
    - theme: alt
      text: CLI reference
      link: /cli/

features:
  - title: Scope-based scaffolding
    details: init creates the workspace; generate creates hosts, remotes, packages, libraries and a design system. Apps live at apps/<scope>/<name>, and names, package names, federation names and dev scripts are derived from that path.
  - title: Host and remote sync
    details: generate and sync rewrite each host's remotes block and remote type declarations from the apps in its scope, and record the topology in mfe-forge.manifest.json. sync --check fails CI when a host is out of date.
  - title: Port allocation
    details: Each new host or remote gets the first free port in dev.portRange that no other app uses, written into vite.config.ts and the dev script. doctor reports conflicts.
  - title: Orchestration with real exit codes
    details: dev, build and test run per-app scripts for all apps, one scope or one app. A failed build or test exits with code 2, an invalid config with code 3.
  - title: Diagnostics
    details: doctor, status, graph, inspect, deps, check and config, most with --json output for scripts and CI.
  - title: Resilient runtime
    details: '@mfe-forge/core provides an accessible error boundary with retry, lazy remote loading, a remote registry and an event bus. router, store, design and testing cover navigation, Zustand state, tokens and tests.'
---

## Quick start

```bash
npx mfe-forge@latest init my-platform --package-manager npm
cd my-platform
# set "workspaces": ["apps/*/*", "packages/*"] in package.json (see Installation)
npx mfe generate host platform/host
npx mfe generate app platform/dashboard
npm install
npx mfe doctor
```

The npm package is `mfe-forge`; it installs the binaries `mfe-forge` and `mfe`. The [Quick start](./quick-start.md) continues from here and renders the remote inside the host. Requirements are listed under [Installation](./installation.md).

::: warning Status
MFE Forge is on the `0.x` line and minor versions may break. Templates currently use `@originjs/vite-plugin-federation` with Vite 5.4; Module Federation 2.0 support is planned. See [Status and maturity](./getting-started.md#status-and-maturity).
:::

## Packages

| Package                                       | Description                                                                                 |
| --------------------------------------------- | ------------------------------------------------------------------------------------------- |
| [`mfe-forge`](./cli/)                         | CLI: `init`, `generate`, `dev`, `build`, `test`, `sync`, `doctor`, `config` and diagnostics |
| [`@mfe-forge/core`](./packages/core.md)       | `MFErrorBoundary`, `LazyRemote`, `RemoteLoader`, `RemoteRegistry`, `EventBus`               |
| [`@mfe-forge/router`](./packages/router.md)   | `useMFENavigation`, `useRouteSync`, `generateRoutes`, `createRouteGuard` for React Router 7 |
| [`@mfe-forge/store`](./packages/store.md)     | `useGlobalStore`, `createScopedStore`, `syncStoreAcrossMFEs` for Zustand 5                  |
| [`@mfe-forge/design`](./packages/design.md)   | Design `tokens` and `applyTokens` for CSS custom properties                                 |
| [`@mfe-forge/testing`](./packages/testing.md) | `renderMFE`, `mockRemoteModule`, `waitForRemoteLoad`, Playwright `e2eHelpers`               |

All six packages are released together under one version number.

## Learn more

- [Concepts](./concepts.md): scopes, hosts, remotes, the manifest and federation sync.
- [Example project](./tutorials/example-project.md): a storefront with two remotes, shared state and tests.
- [Architecture](./architecture.md): how the CLI and packages are built.
- [Troubleshooting](./troubleshooting.md): error messages and doctor checks explained.
