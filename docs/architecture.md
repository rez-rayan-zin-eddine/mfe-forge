# Architecture

This page describes how the MFE Forge repository is organised, what each package is responsible for, and how data flows through the CLI. It is written for contributors and for users who want to know what the tool does to their files.

## Monorepo layout

```text
mfe-forge/
├── packages/
│   ├── cli/          mfe-forge          CLI (bins: mfe-forge, mfe), config, discovery, manifest, templates
│   ├── core/         @mfe-forge/core    error boundary, remote loader, remote registry, event bus
│   ├── router/       @mfe-forge/router  navigation helpers, route generation, route guards
│   ├── store/        @mfe-forge/store   global and scoped Zustand stores, store-to-event-bus sync
│   ├── design/       @mfe-forge/design  design tokens and CSS custom properties
│   └── testing/      @mfe-forge/testing render helper, remote module mocks, polling, Playwright helpers
├── docs/             VitePress site; docs/ai/ holds engineering notes and ADRs
├── .agents/          rules and skills for the agent operating contract (AGENTS.md)
├── .changeset/       Changesets config (fixed versioning across all six packages)
├── .github/workflows ci.yml, release.yml, deploy-docs.yml, audit.yml
├── turbo.json        task pipeline (build, test, type-check, check:package)
└── package.json      Bun workspaces (packages/*), root scripts
```

All packages are TypeScript, ESM-only, built with `tsup`, tested with Vitest, and released together at one version number.

## Package responsibilities

| Package                                       | Responsibility                                              | Main exports                                                                                                                              |
| --------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| [`mfe-forge`](./cli/)                         | Scaffolding, discovery, sync, orchestration and diagnostics | bins `mfe-forge` / `mfe`; library exports `defineConfig`, `loadConfig`, `runDoctor`, `CliError`, `ExitCode` and types such as `MFEConfig` |
| [`@mfe-forge/core`](./packages/core.md)       | Resilient remote rendering and in-process messaging         | `MFErrorBoundary`, `RemoteLoader`, `LazyRemote`, `RemoteRegistry`, `EventBus`, `globalEventBus`, cache helpers                            |
| [`@mfe-forge/router`](./packages/router.md)   | Cross-scope navigation on top of React Router 7             | `useMFENavigation`, `useRouteSync`, `generateRoutes`, `createRouteGuard`                                                                  |
| [`@mfe-forge/store`](./packages/store.md)     | Shared and per-MFE state on top of Zustand 5                | `useGlobalStore`, `createScopedStore`, `syncStoreAcrossMFEs`                                                                              |
| [`@mfe-forge/design`](./packages/design.md)   | Design tokens                                               | `tokens`, `applyTokens`                                                                                                                   |
| [`@mfe-forge/testing`](./packages/testing.md) | Test utilities for MFEs                                     | `renderMFE`, `mockRemoteModule`, `waitForRemoteLoad`, `e2eHelpers`                                                                        |

The runtime packages do not depend on each other at install time. They are independent building blocks that the generated templates combine.

## Inside the CLI

```text
packages/cli/src/
├── bin/index.ts          Commander program; maps CliError to exit codes
├── commands/             one file per command (init, generate, dev, build, test, sync,
│                         doctor, config, diagnostics = status/graph/inspect/deps/check/migrate)
├── utils/
│   ├── config.ts         load + validate mfeforge.config.* (zod), save, get/set by dotted key
│   ├── discovery.ts      scan apps/<scope>/<name>/vite.config.ts → RemoteApp[]; find hosts
│   ├── manifest.ts       create / write / load / validate mfe-forge.manifest.json
│   ├── port.ts           free-port allocation inside dev.portRange
│   ├── files.ts          Mustache template copy, JSON update, naming helpers
│   ├── package-manager.ts  bun / pnpm / npm command builders
│   └── exit.ts           ExitCode and CliError
├── templates/            app, host, package, library, design-system, init, ci, docker
└── types/index.ts        MFEConfig, ProjectContext, RemoteApp, ProjectManifest
```

### Data flow

Every project command starts the same way:

```text
cwd
 │
 ├─ loadConfig(cwd) ─────────────── mfeforge.config.ts / .js  (static object evaluation)
 │                                  └─ fallback: cosmiconfig (.mfeforgerc, .mfeforgerc.json, package.json "mfeforge")
 │                                  └─ zod schema → defaults filled, or CliError exit 3
 │
 ├─ getProjectContext ───────────── { rootDir: cwd, appsDir: cwd/apps, packagesDir: cwd/packages, config, scopes }
 │
 ├─ discoverApps / discoverHosts ── read apps/*/*/vite.config.ts, regex the port, derive names
 │
 └─ command
      generate  → copyTemplate (Mustache) → update root package.json scripts → patch host
      sync      → replace host remotes block + write declarations.d.ts → writeManifest
      dev/build/test → execa(<pm> run <script>) per target
      doctor/check/deps/status/graph/inspect/migrate → read-only report (status/migrate write the manifest)
```

### Configuration loading

`mfeforge.config.ts` and `mfeforge.config.js` are not imported. The loader reads the file as text, strips comments, `import` statements, simple type annotations, `as` / `satisfies` assertions and `defineConfig<...>` generics, replaces `export default` with `return`, and evaluates the result with `Function`. This keeps the CLI free of a TypeScript compiler, at the cost that the default export must be a self-contained object. A `.ts` file that fails to evaluate produces a warning and the defaults; a `.js` file that is not a plain object falls through to cosmiconfig. See [Configuration](./config.md).

### Templates

Templates are plain directories rendered with Mustache. Every text file is rendered (a `.mustache` suffix is stripped from the output name); binary files are copied verbatim. The variables available to app and host templates include `name`, `scope`, `fullName`, `camelName`, `pascalName`, `packageName`, `port`, `organization` and `mfeForgeVersion`. When the project contains `packages/core` (as when generating inside the MFE Forge repository itself), runtime dependencies are written as `workspace:*` instead of the CLI version.

The `ci` and `docker` template directories ship with the package but no command renders them today; see [Publishing](./publishing.md).

### Exit codes

`build`, `dev` and `test` throw a `CliError` that the entry point turns into an exit code:

| Code | Meaning                                                                             |
| ---- | ----------------------------------------------------------------------------------- |
| `0`  | success                                                                             |
| `1`  | user error: unknown app, bad flag combination, invalid argument                     |
| `2`  | a delegated task failed (build, test, dev server) or `doctor` found a failing check |
| `3`  | configuration could not be loaded or is invalid                                     |

Some commands set `process.exitCode = 1` directly: `sync --check`, `check`, `deps --check`, `migrate --check`, `config --validate` and `inspect` with an unknown app. `init` and `generate` exit with `1` on any failure.

## Runtime design

- **Errors stay local.** `MFErrorBoundary` catches render errors of one remote and shows an accessible fallback (`role="alert"`, a heading and a **Try again** button). `LazyRemote` and `RemoteLoader` rebuild the lazy import on reset, because a rejected `React.lazy` stays rejected.
- **Bounded caching.** `RemoteLoader` keeps at most 100 lazy components (`MAX_CACHE_SIZE`) in an LRU map keyed by `remoteName/moduleName`.
- **In-process messaging.** `EventBus` is a synchronous, in-memory publish/subscribe with a configurable prefix (`mfe:` by default, `mfe:global:` for `globalEventBus`). It does not use DOM events, so cross-MFE delivery depends on sharing `@mfe-forge/core` as a federation singleton.
- **Registry as metadata.** `RemoteRegistry` stores remote definitions (`name`, `url`, optional `environment`) and health records. It does not fetch or load anything by itself.

## Design decisions

Decisions are recorded as ADRs in [`docs/ai/decisions`](https://github.com/rez-rayan-zin-eddine/mfe-forge/tree/main/docs/ai/decisions):

- [ADR 0001: manifest and config roles](https://github.com/rez-rayan-zin-eddine/mfe-forge/blob/main/docs/ai/decisions/0001-manifest-and-config.md). `mfeforge.config.*` is human-authored policy; `mfe-forge.manifest.json` is generated topology used by diagnostics and sync. Filesystem scanning is not the only source of truth.
- [ADR 0002: operational agent OS](https://github.com/rez-rayan-zin-eddine/mfe-forge/blob/main/docs/ai/decisions/0002-agent-operating-model.md). One canonical contract (`AGENTS.md`) with thin tool-specific adapters, invariant rules and procedural skills.

Other conventions that shape the code:

- **Convention over configuration.** Hosts are `apps/<scope>/host`; remotes are any other directory with a `vite.config.ts`; names and URLs are derived, not configured.
- **Fixed versioning.** All six packages move together through Changesets, so a CLI version maps to exactly one runtime version.
- **Text-level host patching (temporary).** The host's `remotes` block is replaced with a regex. The [roadmap](https://github.com/rez-rayan-zin-eddine/mfe-forge/blob/main/ROADMAP.md) replaces this with a Vite plugin that reads remotes from configuration (phase B, with a planned ADR 0003 for a federation adapter interface).

## Known limitations

See the maintained list in [`docs/ai/known-issues.md`](https://github.com/rez-rayan-zin-eddine/mfe-forge/blob/main/docs/ai/known-issues.md) and the user-facing summary in [Troubleshooting](./troubleshooting.md).
