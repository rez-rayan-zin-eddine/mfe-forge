# CLI reference

The CLI reads the project in the current working directory. Run `mfe-forge <command> --help` for the installed version’s exact options. JSON modes print machine-readable output without human status text.

## Project creation

### `init [name]`

Creates `apps/`, `packages/`, `tools/`, a package-manager-specific workspace skeleton, and a generated `mfeforge.config.js`.

Options: `--template <template>`, `--package-manager <bun|pnpm|npm>`, `--skip-install`, `--skip-git`.

### `generate <type> [name]`

Types: `app`, `host`, `package`/`pkg`, `library`, `design-system`. Apps and hosts require `scope/name`.

Options: `--port`, `--host`, `--scope`, `--features`, `--skip-host`, `--dry-run`.

Generated apps receive a port, Vite/Module Federation template, and root development script. Existing hosts can be updated during generation; `sync` is the deterministic reconciliation command.

## Development and build

### `dev`

Options: `--scope`, `--app`, `--parallel <n>`, `--host-only`, `--build-watch`. The current implementation starts generated root scripts through `concurrently` for multi-app runs and falls back to sequential starts if that process fails. The numeric limit is not yet a full process-supervisor guarantee.

### `build [app]`

Builds discovered apps, optionally narrowed with `--scope`. Every target is attempted and a summary is printed; the command exits with code `2` if any build failed. Pass `--bail` to stop at the first failure. An explicit `[app]` that does not match a discovered app exits with code `1`. The command accepts `--parallel` for compatibility but does not yet provide a bounded worker pool or bundle analysis; do not rely on `--analyze` until that feature is implemented.

### `test [app]`

Runs the workspace or selected app’s existing test script (`[app]` accepts `scope/name` or an unambiguous bare name) and exits with code `2` when tests fail. The repository packages use Vitest. `--unit` and `--e2e` run the `test:unit` / `test:e2e` script instead of `test`; `--coverage` and `--watch` are forwarded to the script after `--`.

## Synchronization

### `sync`

Synchronizes host federation remotes and generated declarations, and writes `mfe-forge.manifest.json`.

- `--types` — update remote declarations
- `--hosts` — update host Vite remotes
- `--routes` — record route metadata intent; route source mutation is not yet implemented
- `--dry-run` — calculate changes without writing
- `--diff` — show only changed files
- `--check` — fail if changes are needed
- `--json` — emit structured results

Run `sync --dry-run --diff --json` before committing generated changes. A second `sync --check` should be clean.

## Inspection and health

- `status [--json]` — regenerate and summarize manifest topology.
- `graph --format json` — show host-to-remote relationships.
- `inspect <app> [--json]` — inspect one discovered app.
- `deps [--check] [--shared] [--json]` — inspect configured shared dependencies and version mismatches.
- `check [--json]` — validate manifest ports and duplicate app names.
- `doctor [--json]` — run Node, lockfile, port, host, and workspace checks. Exits with code `2` when any check fails. The JSON report has the shape `{ ok, summary: { pass, warn, fail }, checks: [{ id, status, message, hint? }] }`; include it when filing bug reports.
- `migrate [--check] [--json]` — inspect/apply the manifest-v1 migration.

## Configuration

- `config --show [--json]` — print normalized configuration.
- `config --get <key> [--json]` — read a dotted value.
- `config --set <key> --value <value> [--json]` — parse JSON values when possible and write the config file.
- `config --validate [--json]` — validate the normalized schema.
- `config --edit` — open the discovered config file.

## Exit behavior

Commands that detect invalid state or failed work set a non-zero exit status. Always use `--json` for automation rather than parsing colored human output.

| Code | Meaning |
| --- | --- |
| `0` | Success (also for `--help` and `--version`) |
| `1` | User error: unknown app or command, invalid option, missing argument |
| `2` | A delegated task failed: build, test, or dev server |
| `3` | The project configuration could not be loaded or is invalid |
