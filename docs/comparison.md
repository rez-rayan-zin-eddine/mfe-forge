# Comparison

MFE Forge sits in a crowded space. This page explains what it does and does not do relative to common alternatives, so you can decide whether it fits. Descriptions of other tools are kept general; check their own documentation for current details.

## What MFE Forge is

- A **convention-based scaffolder and synchroniser** for Vite + React 19 micro frontends that use Module Federation through `@originjs/vite-plugin-federation`.
- A set of **small runtime helpers** (error boundary, lazy remote loading, event bus, Zustand stores, router helpers, tokens, test utilities).
- **Pre-1.0.** APIs and templates may change between minor versions.

## What it is not

- Not a build system or task runner with caching. `build` runs each app's `build` script sequentially.
- Not a federation runtime. Loading is done by the federation plugin; MFE Forge generates its configuration.
- Not framework-agnostic. Templates are React-only. The config schema accepts `vue` and `svelte` as `defaults.framework` values, but no templates exist for them.
- Not a deployment platform. Production remote URLs are not managed yet; see [Publishing](./publishing.md).

## At a glance

| Capability                                       | MFE Forge (0.x)                                                    | Nx                                                | Turborepo                         | single-spa                                  | Module Federation tooling (`@module-federation/*`) |
| ------------------------------------------------ | ------------------------------------------------------------------ | ------------------------------------------------- | --------------------------------- | ------------------------------------------- | -------------------------------------------------- |
| Primary purpose                                  | MFE scaffolding and host/remote sync for Vite + React              | Monorepo build system with generators and plugins | Monorepo task runner with caching | Framework-agnostic MFE router and lifecycle | Federation runtime and bundler plugins             |
| Generates hosts and remotes                      | Yes (`generate host`, `generate app`)                              | Yes, through its Module Federation generators     | No                                | Through its own CLI                         | Not the focus                                      |
| Keeps host `remotes` in sync with the filesystem | Yes, regex-based (`sync`)                                          | Through its own conventions                       | No                                | Not applicable (import maps)                | No                                                 |
| Remote type declarations                         | Generic `ComponentType` declarations written by `sync`             | Depends on setup                                  | No                                | No                                          | MF 2.0 can generate types from remotes             |
| Task caching                                     | No                                                                 | Yes                                               | Yes                               | No                                          | No                                                 |
| Bundlers                                         | Vite 5.4 only                                                      | Several                                           | Any                               | Any                                         | Webpack, Rspack, Vite and others                   |
| Frameworks                                       | React 19                                                           | Many                                              | Any                               | Many                                        | Any                                                |
| Runtime helpers                                  | Error boundary, loader, event bus, stores, router, tokens, testing | Not in scope                                      | Not in scope                      | Lifecycles, parcels                         | Runtime API and plugins                            |
| Maturity                                         | Pre-1.0, single maintainer                                         | Mature                                            | Mature                            | Mature                                      | Mature                                             |

## Choosing

**Consider MFE Forge if** you are starting a new React + Vite micro frontend setup, want scope-based structure (`apps/<scope>/<name>`) with derived names and ports, and are comfortable with a young tool whose templates you may edit by hand.

**Consider Nx** if you need a full monorepo build system with caching, affected-based CI, many frameworks and an established plugin ecosystem.

**Consider Turborepo** if you already have working MFEs and mainly need fast, cached task orchestration. MFE Forge and Turborepo do different jobs; the MFE Forge repository itself uses Turborepo for its own tasks.

**Consider single-spa** if you need to mix frameworks (React, Vue, Angular) in one page or migrate a legacy app gradually through import maps.

**Consider using `@module-federation/vite` or the Module Federation 2.0 runtime directly** if you need its manifest, runtime plugins, type generation or Rspack interoperability today. MFE Forge plans to adopt it (roadmap phase B, `0.2.0`), but the current templates use `@originjs/vite-plugin-federation`.

## Combining tools

MFE Forge projects are ordinary npm/Bun/pnpm workspaces. You can add Turborepo or Nx on top for caching, replace the federation plugin in a single app's `vite.config.ts`, or use only the runtime packages (`@mfe-forge/core`, `store`, `router`) in an existing federation setup without the CLI.
