# Architecture guide

MFE Forge has three cooperating layers.

## Project OS

The CLI owns project lifecycle and topology:

- `mfeforge.config.*` is human-authored policy.
- `mfe-forge.manifest.json` is generated topology metadata.
- Discovery identifies scoped hosts/remotes and package metadata.
- `sync` reconciles host remotes and declarations idempotently.
- `status`, `graph`, `inspect`, `deps`, `check`, and `doctor` expose diagnostics for developers and agents.

A scope is a directory under `apps/` containing `scope/host` and zero or more remotes. Discovery currently uses Vite config presence and port declarations as its filesystem signals.

## Runtime OS

`@mfe-forge/core` provides `MFErrorBoundary`, `EventBus`, `RemoteLoader`, `LazyRemote`, and `RemoteRegistry`. `RemoteLoader` caches the lazy component by remote/module key so React identity is stable across renders. `RemoteRegistry` stores definitions and health metadata; it is intentionally small and does not yet implement network retry/timeout policy.

`@mfe-forge/router` provides normalized cross-scope navigation, route generation, route event sync, and async guards. `@mfe-forge/store` provides the global Zustand store, validated scoped store factories, and origin-bearing sync payloads. Separate bundles should not assume they share a singleton unless the bundler/runtime configuration ensures it.

## Federation

The current templates target `@originjs/vite-plugin-federation`. Hosts receive remote entries such as:

```ts
remotes: {
  dashboardApp: 'http://localhost:3001/assets/remoteEntry.js',
}
```

The abstraction for additional federation plugins and full remote contracts is planned, not complete.

## Templates and testing

Templates live under `packages/cli/src/templates`. Generated projects should be checked with init → generate → install → type-check → build → test → sync. The repository’s package tests cover the current utilities and runtime primitives; full generated-project fixture coverage remains a release follow-up.
