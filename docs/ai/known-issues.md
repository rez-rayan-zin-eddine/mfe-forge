# Known issues

- Full generated-project integration coverage (init → generate → install → build → test → sync) is still pending.
- Federation plugin-specific type generation remains adapter work.
- `generate`/`sync` update host `vite.config.ts` files by locating the `remotes: { ... }` block textually. They warn and skip the file when the block is missing, but remotes declared through variables or spread expressions are not understood.
- The `mfeforge.config.ts` loader does not run a TypeScript compiler; the default export must be a self-contained object (imports are stripped, not resolved).
- Port allocation only sees literal ports (`port: 3001`, `--port 3001`); ports computed at runtime (e.g. `process.env.PORT`) are not detected.
- `dev` multi-app mode relies on `concurrently`; the sequential fallback blocks on the first long-running server.
- `RemoteLoader` caches at most 100 lazy remote components (LRU). Use `clearRemoteComponentCache` / `evictRemoteComponent` from `@mfe-forge/core` to force a reload.
