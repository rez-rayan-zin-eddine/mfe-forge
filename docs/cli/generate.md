# `mfe-forge generate`

Scaffold a remote app, a host, a source package, a buildable library, or a design system.

## Synopsis

```text
mfe-forge generate <type> [name] [options]
mfe-forge g <type> [name] [options]
```

## Description

`generate` renders one of the built-in Mustache templates in `packages/cli/src/templates/` into the workspace, assigns a dev-server port to apps and hosts, wires new remotes into the scope's host, and adds a `dev:<scope>:<name>` script to the root `package.json`.

Run it from the workspace root. The configuration is loaded first, so an invalid configuration aborts with exit code `3` before anything is written.

## Arguments

| Argument | Required | Description                                                                                                                       |
| -------- | -------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `type`   | Yes      | One of `app`, `host`, `package` (alias `pkg`), `library`, `design-system`.                                                        |
| `name`   | No       | Item name. `scope/name` is **required** for `app` and `host`. Prompted for when omitted; the prompt accepts `^[a-z][a-z0-9-/]*$`. |

## Options

| Flag                | Type                   | Default                           | Description                                                                                                                                                     |
| ------------------- | ---------------------- | --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--port <port>`     | number                 | next free port in `dev.portRange` | Dev/preview port for `app` and `host`. Ignored for other types. Not validated or conflict-checked.                                                              |
| `--host <host>`     | `scope/name`           | `<scope>/host`                    | Host into which a new `app` is registered.                                                                                                                      |
| `--scope <scope>`   | string                 | `default`                         | Scope used when `name` has no `scope/` prefix. Only meaningful for `package`, `library`, and `design-system`, because apps and hosts must be scoped explicitly. |
| `--features <list>` | comma-separated string | `""`                              | Parsed into a list and passed to templates, but **no built-in template uses it** today.                                                                         |
| `--skip-host`       | boolean                | `false`                           | For `app`: do not register the app in a host.                                                                                                                   |
| `--dry-run`         | boolean                | `false`                           | Print the target directory and template file list, then exit without writing.                                                                                   |
| `-h`, `--help`      | boolean                |                                   | Show help.                                                                                                                                                      |

## Naming and scope rules

The name is normalized before use:

1. It is lowercased.
2. A leading npm scope made of word characters (for example `@acme/`) is stripped. Hyphenated npm scopes such as `@my-org/` are **not** stripped.
3. If the result contains `/`, the first segment is the **scope** and the second is the **name**. Otherwise the scope is `--scope` or `default`.

Derived identifiers, shown for `shop/cart` with `organization: 'acme'`:

| Identifier       | Rule                                                                          | Example           |
| ---------------- | ----------------------------------------------------------------------------- | ----------------- |
| Full name        | `scope/name`                                                                  | `shop/cart`       |
| camelName        | camelCase of the full name                                                    | `shopCart`        |
| PascalName       | PascalCase of the full name                                                   | `ShopCart`        |
| Federation name  | `<camelName>App`                                                              | `shopCartApp`     |
| npm package name | `@<organization>/<scope>-<name>`, or `<scope>-<name>` without an organization | `@acme/shop-cart` |
| Root dev script  | `dev:<scope>:<name>`                                                          | `dev:shop:cart`   |

::: tip
Set `organization` without a leading `@` (`acme`, not `@acme`). The CLI adds the `@` itself.
:::

## Generator types

### `app`

A Vite + React remote that exposes `./App` through `@originjs/vite-plugin-federation`.

- **Location:** `apps/<scope>/<name>/`
- **Files:** `index.html`, `package.json`, `tsconfig.json`, `vite.config.ts`, `src/App.tsx`, `src/bootstrap.tsx`, `src/main.tsx`, `src/index.css`
- **Federation:** `name: '<camelName>App'`, `filename: 'remoteEntry.js'`, `exposes: { './App': './src/bootstrap.tsx' }`, and `react`, `react-dom`, `react-router-dom`, `zustand` shared as singletons.
- **Scripts:** `dev` (`vite --port <port>`), `build` (`tsc -b && vite build`), `preview`, `test` (`vitest`), `test:e2e` (`playwright test`), `lint`, `type-check`.
- **Dependencies:** `@mfe-forge/core`, `@mfe-forge/router`, `@mfe-forge/store`. They resolve to `workspace:*` when `packages/core` exists in the workspace; otherwise they are pinned to the CLI version.

### `host`

A Vite + React shell that consumes the remotes in its scope.

- **Location:** `apps/<scope>/<name>/`. Use `host` as the name (`shop/host`): discovery, `sync`, `dev --scope`, and `doctor` only recognize hosts in a directory named `host`.
- **Files:** the same as `app`, plus `src/layouts/AppLayout.tsx` and `src/remotes/declarations.d.ts`.
- **Federation:** an empty `remotes: {}` block that `generate` and [`sync`](./sync.md) fill in; no `exposes`.
- **On creation:** every app already present in the same scope is written into `remotes`, and a matching `declare module '<federationName>/App'` is written to `src/remotes/declarations.d.ts`.

### `package` {#package}

A source-only TypeScript package (alias `pkg`).

- **Location:** `packages/<name>/`. A `scope/name` input becomes `packages/<scope>-<name>/`.
- **Files:** `package.json` (main, types, and exports point at `./src/index.ts`), `tsconfig.json`, `src/index.ts`.
- **Scripts:** `type-check`, `lint`, `test`. No build step.

### `library`

A buildable TypeScript library.

- **Location:** same rules as `package`.
- **Files:** `package.json`, `tsconfig.json`, `src/index.ts`.
- **Scripts:** `build` and `dev` with `tsup` (ESM + `.d.ts` into `dist/`), `test`, `type-check`, `lint`.

### `design-system` {#design-system}

A Storybook-based component library built on `@mfe-forge/design`.

- **Location:** `apps/<scope>/<name>/`, for example `apps/default/ui/` for `generate design-system ui`. It has no `vite.config.ts`, so it is **not** discovered as an app by `dev`, `build`, or `sync`.
- **Files:** `package.json`, `tsconfig.json`, `.storybook/main.ts`, `.storybook/preview.ts`, `src/index.ts`, `src/index.css`, `src/tokens/index.ts`, `src/components/{index,Button,Card,Input}.tsx`, `src/utils/cn.ts`.
- **Scripts:** `dev` (`storybook dev -p 6006`), `build` (`storybook build`), `type-check`, `lint`.

See [`@mfe-forge/design`](../packages/design.md).

## Port assignment

Ports apply to `app` and `host` only.

1. If `--port` is given, it is used as-is (parsed with `parseInt`).
2. Otherwise the CLI scans every directory under `apps/` (recursively, skipping `node_modules`) for literal ports, looking for `port: <n>` in `vite.config.ts` and `--port <n>` in the `dev` script of `package.json`.
3. Starting at the first value of `dev.portRange` (default `3000`), it picks the first port that is both unused by the workspace and free on the machine (via `portfinder`), up to the end of the range.
4. If no port is available, generation fails with `No available ports found in the configured range`.

The chosen port is written into `vite.config.ts` (`server.port`, `preview.port`) and into the `dev` and `preview` scripts.

::: warning
Ports computed at runtime (for example `port: Number(process.env.PORT)`) are not detected. Hosts do not get a reserved port; the first generated app or host takes the start of the range.
:::

## Remote registration

After an `app` is generated (unless `--skip-host` is set):

1. The target host is `--host`, or `<scope>/host`.
2. If `apps/<host>/` does not exist, a warning is printed (`Host "<host>" not found. Run "mfe-forge generate host <host>" to create it.`) and generation still succeeds.
3. If the host's `remotes` block does not already contain `<camelName>App`, the whole block is **rewritten** with one entry for every app in the **host's** scope:

   ```ts
   remotes: {
           shopCartApp: 'http://localhost:3001/assets/remoteEntry.js',
         },
   ```

4. `src/remotes/declarations.d.ts` is regenerated with a `declare module '<federationName>/App'` for every app in the host's scope, unless it already declares the new app.
5. If no `remotes: {` block exists, a warning is printed and the config is left unchanged.

::: warning Cross-scope hosts
Registration always lists the apps in the **host's** scope. `--host admin/host` for an app in the `shop` scope therefore does not add that app, and a later [`sync`](./sync.md) removes manual cross-scope entries. Keep remotes in the same scope as their host.
:::

Remote URLs always point to `http://localhost:<port>/assets/remoteEntry.js`. Production URLs must be configured separately.

## Root `package.json` script

For **every** type, if a root `package.json` exists and the script is not already defined, `generate` adds:

```json
"dev:<scope>:<name>": "<pm> --filter <packageName> dev"
```

npm projects get `npm run dev --workspace=<packageName>` instead. [`dev`](./dev.md) relies on these scripts. Packages also receive a script (for example `dev:default:utils`), even though the `package` template has no `dev` script.

## Examples

```bash
# Host first, then remotes in the same scope
mfe-forge generate host shop/host
mfe-forge generate app shop/cart
mfe-forge g app shop/catalog --port 3105

# Generate without touching a host
mfe-forge g app shop/experiments --skip-host

# Shared code
mfe-forge g pkg utils                 # packages/utils, package name "default-utils"
mfe-forge g library shared-lib        # packages/shared-lib
mfe-forge g design-system ui --scope brand   # apps/brand/ui

# Preview
mfe-forge g app shop/cart --dry-run
```

`--dry-run` output:

```text
📋 Dry run — files that would be generated:
  /path/to/workspace/apps/shop/cart/
    index.html
    package.json
    src/App.tsx
    ...
```

Dry runs do not check whether the target already exists, do not assign a port, and do not report the host or `package.json` changes.

## Failure modes

All failures exit with code `1` unless noted otherwise.

| Situation                | Message                                                                         |
| ------------------------ | ------------------------------------------------------------------------------- |
| Unknown type             | `Invalid type "<type>". Valid: app, host, package, design-system, library, pkg` |
| Unscoped app or host     | `Apps and hosts must be scoped: "<name>" → try ...`                             |
| Target directory exists  | `Directory already exists: <path>`                                              |
| Template rendering error | `Template error: ...`; the partial target directory is removed.                 |
| No free port             | `Generation failed` / `No available ports found in the configured range`        |
| Invalid configuration    | Exit `3` before any file is written.                                            |

## Related

- [`sync`](./sync.md) — reconcile all hosts deterministically
- [`doctor`](./doctor.md) — detect port conflicts and scopes without a host
- [Concepts](../concepts.md) and [Architecture](../architecture.md)
