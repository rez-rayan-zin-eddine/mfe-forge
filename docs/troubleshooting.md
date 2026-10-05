# Troubleshooting

## Start with diagnostics

```bash
mfe-forge status --json
mfe-forge check --json
mfe-forge deps --check --json
mfe-forge doctor
```

## Port conflicts

Discovery reads `port` values from app Vite configs and reports duplicates. Pick a port in the configured range or pass `--port` when generating a new app.

## Remote module not found

1. Confirm the remote is discovered: `mfe-forge inspect scope/remote --json`.
2. Confirm the host relationship: `mfe-forge graph --format json`.
3. Preview synchronization: `mfe-forge sync --dry-run --diff --json`.
4. Apply and verify: `mfe-forge sync && mfe-forge sync --check`.
5. Start the remote and host using their generated development scripts.

## Declaration errors

Run `mfe-forge sync --types`, then inspect the generated `src/remotes/declarations.d.ts`. The current declaration adapter covers the default `App` exposure; arbitrary expose/type contract generation is not yet implemented.

## Configuration errors

Use `mfe-forge config --validate --json`. Keep the config as a plain `export default { ... }` object; executable TypeScript config expressions are outside the current loader contract.

## Shared dependency problems

Use `mfe-forge deps --check --json`. Ensure React, React DOM, router, and other configured shared packages resolve to compatible versions across workspace packages.

## Test failures

Run the failing package directly. If the design test reports missing `jsdom`, reinstall from the lockfile. If a dynamic remote mock reports an undefined module name, ensure the package uses `vi.doMock` rather than a hoisted `vi.mock` call.

## Known limitations

The numeric `dev --parallel` value is not yet enforced by a dedicated supervisor. `build --analyze`, full route source mutation, environment-aware remote URLs, and full generated fixture integration are not complete.
