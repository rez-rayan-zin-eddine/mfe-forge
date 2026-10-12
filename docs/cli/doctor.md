# `mfe-forge doctor`

Diagnose common environment and topology problems.

## Synopsis

```text
mfe-forge doctor [--json]
```

## Description

`doctor` runs a fixed set of read-only checks against the workspace in the current directory and reports each one as `pass`, `warn`, or `fail`. It never modifies files. The exit code is `2` if any check fails, and `0` otherwise (warnings do not fail the run).

## Options

| Flag           | Type    | Default | Description                                          |
| -------------- | ------- | ------- | ---------------------------------------------------- |
| `--json`       | boolean | `false` | Print the structured report instead of human output. |
| `-h`, `--help` | boolean |         | Show help.                                           |

## Checks

Checks run in this order. Their `id` values are stable and appear in JSON output.

### `node-version`

| Status | Condition                            | Message                     |
| ------ | ------------------------------------ | --------------------------- |
| pass   | Node.js major version is 20 or newer | `Node v22.x.x`              |
| fail   | Node.js older than 20                | `Node <version> is too old` |

**Fix:** install Node.js 20 or newer.

### `lockfile`

Checks that the workspace root contains a lockfile for `defaults.packageManager`.

| Package manager | Accepted lockfiles      |
| --------------- | ----------------------- |
| `bun`           | `bun.lock`, `bun.lockb` |
| `pnpm`          | `pnpm-lock.yaml`        |
| `npm`           | `package-lock.json`     |

| Status | Message                       |
| ------ | ----------------------------- |
| pass   | `Lock file present for <pm>`  |
| fail   | `No lock file found for <pm>` |

**Fix:** run `<pm> install`. If the configured package manager is wrong, change it with `mfe-forge config --set defaults.packageManager --value pnpm`.

### `ports`

Detects apps that share a dev-server port. Ports are read from the first `port: <n>` in each app's `vite.config.ts`; an app with no literal port is treated as port `3000`.

| Status | Message                                              |
| ------ | ---------------------------------------------------- |
| pass   | `No port conflicts`                                  |
| fail   | `Port conflicts: <a> and <b> both use port <n>; ...` |

**Fix:** change `server.port` and `preview.port` in one of the `vite.config.ts` files, and the `--port` value in that app's `dev`/`preview` scripts. Then run [`mfe-forge sync`](./sync.md) so hosts pick up the new URL.

### `hosts`

Runs only when at least one app exists. Every scope that contains apps must also contain `apps/<scope>/host`.

| Status | Message                               |
| ------ | ------------------------------------- |
| pass   | `All scopes have hosts`               |
| fail   | `Scopes without a host: <scope>, ...` |

**Fix:** `mfe-forge generate host <scope>/host`.

### `workspaces`

| Status | Condition                                                | Message                                              |
| ------ | -------------------------------------------------------- | ---------------------------------------------------- |
| pass   | Root `package.json` has `workspaces` or `bun.workspaces` | `Workspaces configured`                              |
| fail   | Root `package.json` has neither                          | `Root package.json missing workspaces configuration` |
| warn   | No root `package.json`                                   | `No root package.json found`                         |

**Fix:** add `"workspaces": ["apps/*/*", "packages/*"]` to the root `package.json`. Only the field's presence is checked, not whether its globs match your apps.

## Output

```text
🔍 Running diagnostics...

  ✔ Node v22.11.0
  ✖ No lock file found for pnpm
      Run `pnpm install`
  ✔ No port conflicts
  ✔ All scopes have hosts
  ✔ Workspaces configured

4 passed, 0 warnings, 1 failed
```

JSON report (`DoctorReport`):

```json
{
  "ok": false,
  "summary": { "pass": 4, "warn": 0, "fail": 1 },
  "checks": [
    { "id": "node-version", "status": "pass", "message": "Node v22.11.0" },
    {
      "id": "lockfile",
      "status": "fail",
      "message": "No lock file found for pnpm",
      "hint": "Run `pnpm install`"
    }
  ]
}
```

`hint` is present only on non-passing checks. The same report is available programmatically:

```ts
import { loadConfig, runDoctor } from 'mfe-forge'

const root = process.cwd()
const report = await runDoctor({
  rootDir: root,
  config: loadConfig(root),
  appsDir: `${root}/apps`,
  packagesDir: `${root}/packages`,
  scopes: [],
})
```

`runDoctor(context, nodeVersion?)` takes a `ProjectContext` and returns a `Promise<DoctorReport>`.

::: tip
Attach `mfe-forge doctor --json` output to bug reports.
:::

## Failure modes

| Situation               | Exit code           |
| ----------------------- | ------------------- |
| All checks pass or warn | `0`                 |
| Any check fails         | `2`                 |
| Configuration invalid   | `3` (no checks run) |

## Related

- [`check`](./diagnostics.md#check) — manifest-based validation
- [Troubleshooting](../troubleshooting.md)
