# Troubleshooting

Start with the built-in diagnostics, run from the project root:

```bash
mfe-forge doctor          # human-readable; exit code 2 when a check fails
mfe-forge doctor --json   # { ok, summary: { pass, warn, fail }, checks: [{ id, status, message, hint }] }
mfe-forge check           # manifest and port validation
mfe-forge status          # what the CLI discovered
```

Include the `doctor --json` output when you [report a bug](https://github.com/rez-rayan-zin-eddine/mfe-forge/issues).

## Doctor checks

| Check id       | Failure message                                      | Fix                                                                                                                                                                                                                                                                      |
| -------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `node-version` | `Node vX is too old`                                 | Install Node.js 20 or newer.                                                                                                                                                                                                                                             |
| `lockfile`     | `No lock file found for <pm>`                        | Run `<pm> install`. The expected file is `bun.lock`/`bun.lockb`, `pnpm-lock.yaml` or `package-lock.json` depending on `defaults.packageManager`. If you switched package managers, update the config with `mfe-forge config --set defaults.packageManager --value <pm>`. |
| `ports`        | `Port conflicts: a and b both use port N`            | Change `port` in one `vite.config.ts` (both `server` and `preview`) and the `--port` in that app's `dev` and `preview` scripts.                                                                                                                                          |
| `hosts`        | `Scopes without a host: x`                           | `mfe-forge generate host x/host`. Only reported when the project has at least one app.                                                                                                                                                                                   |
| `workspaces`   | `Root package.json missing workspaces configuration` | Add `"workspaces": ["apps/*/*", "packages/*"]`. The check only verifies the field exists, not that it matches your apps.                                                                                                                                                 |

## Commands run from the wrong directory

**Symptom:** `No apps found to run`, `App "x" not found`, `doctor` reports `No root package.json found`, or `config --show` prints a `name` that is your current folder name.

The CLI uses the **current working directory** as the project root and does not search parent directories for `apps/`. `cd` to the folder that contains `mfeforge.config.js` and `apps/`.

## Configuration errors

**`Invalid MFE Forge configuration:` followed by `path: message` lines, exit code 3.** The config parsed but failed the schema. Common cases: `defaults.packageManager` not one of `bun`, `pnpm`, `npm`; `dev.portRange` not a two-number array; an unknown enum value in `testing`, `ci` or `federation.plugin`. Run `mfe-forge config --validate` to list the issues.

**`Warning: Failed to load .../mfeforge.config.ts: ... Falling back to default configuration.`** The `.ts` loader does not compile TypeScript. It strips imports, comments, simple type annotations and `as`/`satisfies`, then evaluates the default export. It fails on:

- `No default export found in configuration file`;
- references to imported values (the imports are removed, so the identifiers are undefined);
- a default export that is not an object: `Default export must evaluate to a configuration object`;
- TypeScript syntax beyond the simple cases (interfaces, enums, complex generics).

Keep the default export a self-contained object literal. When this warning appears, every command runs with default settings, including the `bun` package manager.

## Generation errors

| Message                                                                       | Cause                                           | Fix                                                                                                          |
| ----------------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `Invalid type "x". Valid: app, host, package, design-system, library, pkg`    | Unknown generator                               | Use one of the listed types. `pkg` is an alias of `package`.                                                 |
| `Apps and hosts must be scoped: "x" → try "x-scope/x"`                        | Missing scope                                   | Use `scope/name`, for example `shop/catalog`.                                                                |
| `Directory already exists: <path>`                                            | Target exists                                   | Pick another name or remove the directory. `init` prints `Directory <name> already exists`.                  |
| `Host "x/host" not found. Run "mfe-forge generate host x/host" to create it.` | Remote generated before its host (warning only) | Generate the host; it picks up existing remotes of its scope. Or pass `--host <scope/host>` / `--skip-host`. |
| `No available ports found in the configured range`                            | Every port in `dev.portRange` is used or bound  | Widen `dev.portRange` or pass `--port`.                                                                      |
| `Template error: ...`                                                         | Template rendering failed                       | The partial directory is removed. Report it as a bug.                                                        |

Names entered at the interactive prompt must match `^[a-z][a-z0-9-/]*$`. An `@org/` prefix on the name is stripped.

## Host does not pick up a remote

**`Warning: "remotes: {" section not found in .../vite.config.ts`** (from `generate`) or **`Warning: Could not find "remotes: {" section in ...`** (from `sync`). The CLI locates the host's remotes with a regular expression on the literal text `remotes: {`. If you moved remotes into a variable, a spread or a helper function, the CLI cannot update them; keep an inline `remotes: { ... }` object in the federation call.

Other causes:

- The remote is in another scope. A host only receives remotes from its own `apps/<scope>/`.
- The remote directory has no `vite.config.ts`, so discovery ignores it.
- The block contains hand-written entries: `sync` replaces the entire block, so they are removed. Keep manual remotes outside the CLI-managed block or re-add them after syncing.

`mfe-forge sync --dry-run --diff` shows which files would change without writing.

## Remote fails to load in the host

**The host shows "Something went wrong" for a remote, or the browser console reports a failed request for `remoteEntry.js`.**

1. With `@originjs/vite-plugin-federation`, a remote served by `vite` (dev mode) does not provide `/assets/remoteEntry.js`. Build the remote and serve it with `vite preview` (the generated `preview` script), as shown in the [Quick start](./quick-start.md#_6-install-and-run).
2. Check the port: the host's `remotes` URL must match the remote's `preview.port`. Run `mfe-forge sync` after changing ports.
3. In production, the remote URL still points at `http://localhost:<port>`; see [Publishing](./publishing.md#point-hosts-at-deployed-remotes).
4. After fixing the cause, click **Try again**. `LazyRemote` and `RemoteLoader` create a new import on reset. If you use your own `React.lazy`, a rejected import stays rejected until the page reloads.

**The host page is replaced by the remote's UI, or React warns about calling `createRoot` on a container that already has a root.** The app template exposes `./App` as `./src/bootstrap.tsx`, which mounts into `#root` when imported. Expose `./src/App.tsx` instead; `main.tsx` still loads `bootstrap.tsx` for standalone runs.

**Events or global state do not reach other MFEs.** `globalEventBus` and `useGlobalStore` are module-level state. Unless `@mfe-forge/core` and `@mfe-forge/store` are listed as `singleton` in `shared` in the host and every remote, each bundle has its own copy. See [Concepts](./concepts.md#shared-dependencies).

**"Invalid hook call" or two React copies.** Keep `react`, `react-dom`, `react-router-dom` and `zustand` as singletons with the same `requiredVersion` in every app, and install one React version across the workspace. `mfe-forge deps --check` reports differing versions of `federation.shared` dependencies among packages under `packages/`.

## Dev server problems

- **`dev:<scope>:<name>` fails with "No packages matched the filter" or a missing workspace.** The root `workspaces` glob does not include `apps/*/*`. See [Installation](./installation.md#workspace-layout-fix). With pnpm, add `pnpm-workspace.yaml`.
- **Only the first app starts.** In multi-app mode `dev` runs `npx --yes concurrently`. If that fails (for example offline without `concurrently` in the cache), it falls back to running scripts one after another, and the first long-running server blocks the rest. Install `concurrently` as a dev dependency or start apps individually.
- **`--build-watch` has no effect.** The flag is accepted but not implemented yet.
- **`--parallel` on `dev`** is accepted but not used to limit processes.

## Build and test failures

- `build` prints `✔ built N, ✖ failed M` and exits with code `2` and `Build failed for: ...` when any app fails. The stderr of each failed build is printed. Add `--bail` to stop at the first failure.
- `build --scope x` with no apps fails with `No apps found in scope "x"`.
- `build` runs each app's own `build` script (`tsc -b && vite build`), so TypeScript errors fail the build.
- `--analyze` and `--parallel` are accepted on `build` but do not change behaviour; builds run sequentially.
- `test` with both `--unit` and `--e2e` fails with `Use either --unit or --e2e, not both`. A failing script yields `Tests failed` and exit code `2`.
- The generated `test` script is plain `vitest`, which watches when run in an interactive terminal. Use `CI=1 mfe-forge test` for a single run. Generated hosts do not list `vitest` as a dependency.

## Ports

Discovery reads only the first literal `port: <number>` in each `vite.config.ts`, and allocation also reads `--port <number>` in `dev` scripts. Ports from environment variables are invisible to the CLI, so discovery reports `3000` and new apps may collide. Keep ports literal.

## Package names with an organization

Set `organization` without the `@` (`acme`, not `@acme`). The CLI prepends `@` when it builds package names, so `@acme` produces `@@acme/shop-catalog`.

## Still stuck

Check [known issues](https://github.com/rez-rayan-zin-eddine/mfe-forge/blob/main/docs/ai/known-issues.md), then open an issue with the `doctor --json` output, your OS, Node and package manager versions. Security problems go through [SECURITY.md](https://github.com/rez-rayan-zin-eddine/mfe-forge/blob/main/SECURITY.md).
