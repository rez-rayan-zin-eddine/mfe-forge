# `mfe-forge build`

Build discovered applications for production by running each one's `build` script.

## Synopsis

```text
mfe-forge build [app] [options]
```

## Description

`build` resolves its targets, then runs `<pm> run build` in each app directory (`apps/<scope>/<name>`) **sequentially**, with output captured. By default every target is attempted, failures are collected, and a summary is printed at the end.

Targets are apps discovered under `apps/<scope>/<name>/` with a `vite.config.ts`, hosts included. `packages/*` libraries and design systems are not built by this command; build them with their own scripts.

## Arguments

| Argument | Required | Description                                                           |
| -------- | -------- | --------------------------------------------------------------------- |
| `app`    | No       | One app, as `scope/name` or a bare name that is unique across scopes. |

## Options

| Flag                    | Type    | Default | Description                                                                   |
| ----------------------- | ------- | ------- | ----------------------------------------------------------------------------- |
| `-s`, `--scope <scope>` | string  |         | Build every app in the scope (ignored when `app` is given).                   |
| `--bail`                | boolean | `false` | Stop after the first failed build. Remaining targets are reported as skipped. |
| `--parallel`            | boolean | `false` | Accepted for compatibility. Builds still run sequentially.                    |
| `--analyze`             | boolean | `false` | Accepted but **not implemented**; no bundle analysis is produced.             |
| `-h`, `--help`          | boolean |         | Show help.                                                                    |

## Examples

```bash
mfe-forge build                # all apps
mfe-forge build shop/cart
mfe-forge build users          # resolves admin/users if unique
mfe-forge build --scope shop --bail
```

## Output

For each target, a spinner reports `Built <app>` or `Failed to build <app>`, followed by the captured stderr (or the error message). The run ends with a summary:

```text
✔ built 2, ✖ failed 1, ○ skipped 0
```

`○ skipped` appears only when `--bail` stopped the run early.

## Failure modes

| Situation                                     | Result                                            |
| --------------------------------------------- | ------------------------------------------------- |
| `app` does not resolve (unknown or ambiguous) | `App "<app>" not found`, exit `1`. No build runs. |
| `--scope` matches no apps                     | `No apps found in scope "<scope>"`, exit `1`.     |
| One or more builds fail                       | `Build failed for: <a>, <b>`, exit `2`.           |
| Configuration invalid                         | Exit `3`.                                         |

An empty project (no apps, no filter) prints `Building 0 application(s)` and exits `0`.

---

## `mfe-forge test`

Run a test script for the workspace or for a single app.

### Synopsis

```text
mfe-forge test [app] [options]
```

### Options

| Flag               | Type    | Default | Description                                   |
| ------------------ | ------- | ------- | --------------------------------------------- |
| `-u`, `--unit`     | boolean | `false` | Run the `test:unit` script instead of `test`. |
| `-e`, `--e2e`      | boolean | `false` | Run the `test:e2e` script instead of `test`.  |
| `-c`, `--coverage` | boolean | `false` | Forward `--coverage` to the script.           |
| `-w`, `--watch`    | boolean | `false` | Forward `--watch` to the script.              |

### Behavior

- Without `app`, the command runs `<pm> run <script>` in the workspace root. With `app`, it runs in `apps/<scope>/<name>`.
- Forwarded flags are appended after `--`, for example `bun run test -- --coverage`.
- Output is streamed (`stdio: inherit`).

::: warning
Generated apps define `test` and `test:e2e` but no `test:unit`, so `--unit` fails unless you add that script. The `init` template's root `test` script is `mfe-forge test`; running `mfe-forge test` from the root without your own root test script therefore calls itself recursively. Replace the root `test` script with your actual runner.
:::

### Failure modes

| Situation                     | Result                                            |
| ----------------------------- | ------------------------------------------------- |
| `--unit` and `--e2e` together | `Use either --unit or --e2e, not both`, exit `1`. |
| `app` not found               | exit `1`.                                         |
| Script fails or is missing    | `Tests failed`, exit `2`.                         |

## Related

- [`dev`](./dev.md)
- [`doctor`](./doctor.md)
- [Testing package](../packages/testing.md)
