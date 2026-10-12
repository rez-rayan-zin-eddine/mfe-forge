# `mfe-forge dev`

Start development servers for discovered apps and hosts.

## Synopsis

```text
mfe-forge dev [options]
```

## Description

`dev` selects target apps, then runs the root `package.json` script `dev:<scope>:<name>` for each one. Those scripts are written by [`generate`](./generate.md#root-package-json-script) and delegate to the app's own `dev` script through the package manager's workspace filter.

- **One target:** `<pm> run dev:<scope>:<name>` runs in the foreground with inherited stdio.
- **Several targets:** the commands run in parallel through `npx --yes concurrently --kill-others-on-fail`, with output prefixed by app name.

## Options

| Flag                    | Type                      | Default | Description                                                       |
| ----------------------- | ------------------------- | ------- | ----------------------------------------------------------------- |
| `-s`, `--scope <scope>` | string                    |         | Run every app in the scope, plus `<scope>/host` if it exists.     |
| `-a`, `--app <app>`     | `scope/name` or bare name |         | Run one app. A bare name must be unambiguous across scopes.       |
| `-p`, `--parallel <n>`  | number                    | `10`    | Accepted but **not applied**; all selected targets start at once. |
| `--host-only`           | boolean                   | `false` | Run only hosts (`apps/<scope>/host`).                             |
| `--build-watch`         | boolean                   | `false` | Accepted but **not implemented**; it has no effect.               |
| `-h`, `--help`          | boolean                   |         | Show help.                                                        |

Precedence when several selectors are given: `--app`, then `--scope`, then `--host-only`. With none, every discovered app (hosts included) is started.

::: info Configuration fields not used
`dev.parallelLimit` and `dev.autoStartHost` are validated but not read by `dev`.
:::

## Target discovery

An app is any directory `apps/<scope>/<name>/` that contains `vite.config.ts`. A host is the app named `host` in a scope. Design systems and `packages/*` are not started.

## Examples

```bash
mfe-forge dev                  # everything
mfe-forge dev --scope shop     # shop/* plus shop/host
mfe-forge dev --app cart       # only shop/cart (if "cart" is unique)
mfe-forge dev --host-only
```

## Behavior details

- `concurrently` is fetched on demand with `npx --yes`, so the first multi-app run needs network access, and npm must be available even in Bun or pnpm projects.
- `--kill-others-on-fail` stops every server as soon as one exits with an error.
- If the `concurrently` process itself fails (including when a server crashes), the CLI **falls back to starting each target sequentially** in the foreground. Each sequential server blocks until it exits; an exit prints `⚠ <app> exited` and moves on to the next target.
- The script name for `shop/cart` is `dev:shop:cart`. If you remove that root script, `dev` cannot start the app.

::: warning Workspace globs
The default scripts use `<pm> --filter <package>`, which only finds apps that are workspace members. The `init` template's `apps/*` glob does not match `apps/<scope>/<name>`; use `apps/*/*`. pnpm also needs a `pnpm-workspace.yaml`. See [`init`](./init.md#files-produced).
:::

## Failure modes

| Situation                                                 | Result                             |
| --------------------------------------------------------- | ---------------------------------- |
| `--app` does not resolve                                  | `App "<app>" not found`, exit `1`. |
| No targets matched (empty project, empty scope, no hosts) | `No apps found to run`, exit `0`.  |
| The single target's script fails                          | `Dev server failed`, exit `2`.     |
| Configuration invalid                                     | Exit `3`.                          |

## Related

- [`generate`](./generate.md) — creates the `dev:*` scripts
- [`doctor`](./doctor.md) — checks port conflicts and workspaces
- [Troubleshooting](../troubleshooting.md)
