# Diagnostics commands

Inspection commands that read the workspace topology or the generated manifest: `status`, `graph`, `inspect`, `deps`, `check`, and `migrate`.

::: warning Always use the JSON flag in scripts
Without `--json` (or `--format json` for `graph`), these commands print a Node.js object inspection (`{ project: 'p', apps: 2 }`), not JSON. Nested values may be abbreviated (`[Array]`).
:::

## How these commands get their data

| Command   | Data source                                                | Writes the manifest?              |
| --------- | ---------------------------------------------------------- | --------------------------------- |
| `status`  | Fresh filesystem scan                                      | **Yes**, always                   |
| `graph`   | Fresh filesystem scan                                      | No                                |
| `inspect` | Fresh filesystem scan                                      | No                                |
| `deps`    | Existing `mfe-forge.manifest.json`, otherwise a fresh scan | No                                |
| `check`   | Existing `mfe-forge.manifest.json`, otherwise a fresh scan | No                                |
| `migrate` | Whether the manifest file exists                           | Yes, if missing and not `--check` |

::: tip Stale manifests
`deps` and `check` trust an existing manifest even when it is out of date. Run `mfe-forge status` or `mfe-forge sync` first to refresh it.
:::

---

## `status`

Regenerate the manifest and summarize the topology.

```text
mfe-forge status [--json]
```

| Flag     | Type    | Default | Description                |
| -------- | ------- | ------- | -------------------------- |
| `--json` | boolean | `false` | Print the summary as JSON. |

```json
{
  "project": "my-platform",
  "apps": 2,
  "hosts": ["shop/host"],
  "packages": 1,
  "manifest": "mfe-forge.manifest.json"
}
```

`apps` counts every discovered app, hosts included. In human mode, a line per app follows the summary: `shop/cart :3001 (remote)` or `shop/host :3000 (host)`.

---

## `graph`

Show which remotes each host consumes.

```text
mfe-forge graph [--format <text|json>]
```

| Flag                | Type             | Default | Description                                     |
| ------------------- | ---------------- | ------- | ----------------------------------------------- |
| `--format <format>` | `text` \| `json` | `text`  | Any value other than `json` is treated as text. |

JSON shape:

```jsonc
{
  "nodes": [
    /* RemoteApp descriptors, hosts included */
  ],
  "edges": [
    {
      "host": "shop/host",
      "remotes": [
        {
          "name": "shop/cart",
          "federationName": "shopCartApp",
          "url": "http://localhost:3001/assets/remoteEntry.js",
          "packages": ["shop-cart"],
        },
      ],
    },
  ],
}
```

Text mode prints the object followed by one line per host: `shop/host -> shop/cart` (or `(none)`). Edges are derived from scope membership, the same rule [`sync`](./sync.md) uses, not from the contents of `vite.config.ts`. `packages` contains only the remote's own package name, not its dependencies.

---

## `inspect`

Print the descriptor of one app.

```text
mfe-forge inspect <app> [--json]
```

| Argument / flag | Description                                                                                                                 |
| --------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `<app>`         | `scope/name`, or a bare name. A bare name returns the **first** app whose name ends in `/<app>`; ambiguity is not reported. |
| `--json`        | Print JSON.                                                                                                                 |

```json
{
  "name": "shop/cart",
  "scope": "shop",
  "port": 3001,
  "url": "http://localhost:3001/assets/remoteEntry.js",
  "camelName": "shopCart",
  "pascalName": "ShopCart",
  "federationName": "shopCartApp",
  "packageName": "shop-cart",
  "entry": "./src/bootstrap.tsx"
}
```

If no app matches, the command prints `App not found: <app>` and exits `1`.

---

## `deps`

Report version mismatches for the dependencies listed in `federation.shared`.

```text
mfe-forge deps [--check] [--shared] [--json]
```

| Flag       | Type    | Default | Description                          |
| ---------- | ------- | ------- | ------------------------------------ |
| `--check`  | boolean | `false` | Exit `1` when mismatches exist.      |
| `--shared` | boolean | `false` | Print only `{ shared, mismatches }`. |
| `--json`   | boolean | `false` | Print JSON.                          |

```json
{
  "shared": ["react", "react-dom", "react-router-dom"],
  "dependencies": [{ "package": "@acme/utils", "name": "react", "version": "^19.1.0" }],
  "mismatches": [],
  "valid": true
}
```

A shared dependency is a **mismatch** when it appears with more than one distinct version range across the manifest's packages.

::: warning Scope of the check
Only `dependencies` of `packages/*` are considered (not `devDependencies` or `peerDependencies`). Apps and hosts under `apps/` are **not** inspected, so version drift between remotes is not detected by this command.
:::

---

## `check` {#check}

Validate manifest topology.

```text
mfe-forge check [--json]
```

| Flag     | Type    | Default | Description |
| -------- | ------- | ------- | ----------- |
| `--json` | boolean | `false` | Print JSON. |

Validations:

| Rule                               | Error message                       |
| ---------------------------------- | ----------------------------------- |
| Manifest `version` is `1`          | `Unsupported manifest version: <n>` |
| App names are unique               | `Duplicate app: <name>`             |
| Ports are integers from 1 to 65535 | `Invalid port for <name>`           |
| No two apps share a port           | `Port <n> is used by <a> and <b>`   |

```json
{ "valid": false, "errors": ["Port 3001 is used by shop/cart and shop/catalog"] }
```

Exits `1` when `errors` is not empty. For environment checks (Node.js, lockfile, workspaces, hosts), use [`doctor`](./doctor.md).

---

## `migrate`

Create the version 1 manifest if it does not exist.

```text
mfe-forge migrate [--check] [--json]
```

| Flag      | Type    | Default | Description                                                               |
| --------- | ------- | ------- | ------------------------------------------------------------------------- |
| `--check` | boolean | `false` | Report pending migrations and exit `1` if there are any, without writing. |
| `--json`  | boolean | `false` | Print JSON.                                                               |

```json
{ "migrations": [], "pending": ["manifest-v1"] }
```

The only migration is `manifest-v1`, which is pending when `mfe-forge.manifest.json` is missing. Without `--check`, a pending migration is applied by writing the manifest. The printed result still shows the state **before** applying it. Existing manifests are not upgraded or rewritten.

## Exit codes

| Command           | `0`                              | `1`                       | `3`            |
| ----------------- | -------------------------------- | ------------------------- | -------------- |
| `status`, `graph` | always                           |                           | invalid config |
| `inspect`         | app found                        | app not found             | invalid config |
| `deps`            | no `--check`, or no mismatches   | `--check` with mismatches | invalid config |
| `check`           | valid                            | errors found              | invalid config |
| `migrate`         | no `--check`, or nothing pending | `--check` with pending    | invalid config |

## Related

- [Manifest format](../config.md#manifest)
- [`sync`](./sync.md)
- [`doctor`](./doctor.md)
