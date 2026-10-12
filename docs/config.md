# Configuration reference

An MFE Forge workspace has two metadata files with separate roles (see ADR 0001 in `docs/ai/decisions/0001-manifest-and-config.md`):

| File                         | Author  | Role                                                                                                         |
| ---------------------------- | ------- | ------------------------------------------------------------------------------------------------------------ |
| `mfeforge.config.js` / `.ts` | You     | **Policy**: defaults, federation settings, port range, tooling choices.                                      |
| `mfe-forge.manifest.json`    | The CLI | **Topology**: discovered apps, hosts, packages, ports, and federation names. Generated; do not edit by hand. |

## Config file

[`mfe-forge init`](./cli/init.md) writes `mfeforge.config.js`:

```js
/** @type {import('mfe-forge').MFEConfig} */
export default {
  name: 'my-platform',
  organization: 'acme',
  defaults: {
    framework: 'react',
    language: 'typescript',
    styling: 'tailwind',
    stateManagement: 'zustand',
    packageManager: 'bun',
  },
  federation: {
    shared: ['react', 'react-dom', 'react-router-dom'],
  },
  dev: { portRange: [3000, 3999], autoStartHost: true, parallelLimit: 10, cors: true },
  testing: { unit: 'none', e2e: 'none' },
  ci: { provider: 'github', docker: true },
}
```

You can also use `defineConfig`, which returns its argument unchanged and exists only for editor typing:

```ts
// mfeforge.config.ts
import { defineConfig } from 'mfe-forge'

export default defineConfig({
  name: 'my-platform',
  dev: { portRange: [4000, 4999] },
})
```

### Loading rules

The configuration is read from the **current working directory only**. Parent directories are not searched.

1. **`mfeforge.config.ts`, otherwise `mfeforge.config.js`.** Only the first file that exists is considered. It is evaluated by a lightweight static loader, not by a compiler or module loader. The loader:
   - requires an `export default` expression;
   - removes comments, `import` statements, variable type annotations, `as` / `as const` / `satisfies` assertions, and generic arguments on `defineConfig<...>(...)`;
   - evaluates the result with `defineConfig` as an identity function.

   **Imported values are not resolved.** The exported object must be self-contained: literals, inline expressions, and local `const`s only.

2. **If `mfeforge.config.ts` cannot be evaluated**, a warning naming the file is printed and the **built-in defaults are used**. No other source is tried.
3. **If `mfeforge.config.js` cannot be evaluated statically** (for example it imports a helper), it is loaded through [cosmiconfig](https://github.com/cosmiconfig/cosmiconfig) as a regular module instead.
4. **If neither file exists**, cosmiconfig looks in this order for: `mfeforge.config.js`, `.mfeforgerc` (JSON or YAML), `.mfeforgerc.json`, and an `"mfeforge"` key in `package.json`.
5. If nothing is found, every field takes its default.

`name` defaults to the name of the current directory. The merged object is then validated. Unknown keys are dropped silently, and any violation aborts the command with exit code `3`:

```text
❌ Error: Invalid MFE Forge configuration:
  defaults.packageManager: Invalid enum value. Expected 'bun' | 'pnpm' | 'npm', received 'yarn'
```

::: warning
A broken `mfeforge.config.ts` does **not** fail the command: it prints `Warning: Failed to load ...` and continues with defaults. Read warnings on stderr carefully.
:::

### Writing the config

[`mfe-forge config --set`](./cli/config.md#set-key-value-value) and the interactive `config` mode rewrite the **whole normalized configuration** (defaults included) as a plain object literal into the first existing file among `mfeforge.config.ts`, `mfeforge.config.js`, `.mfeforgerc.json`. If none exists, they create `mfeforge.config.ts`. Comments and formatting are not preserved.

## Field reference

Every section is optional; omitted fields take the defaults below. "Used by" lists what currently reads the field. Fields marked _not read_ are validated and stored but have no effect on CLI behavior yet.

### Top level

| Field           | Type               | Default                | Description                                                                               | Used by               |
| --------------- | ------------------ | ---------------------- | ----------------------------------------------------------------------------------------- | --------------------- |
| `name`          | non-empty `string` | current directory name | Project name; written to the manifest.                                                    | `status`, manifest    |
| `organization`  | `string`           | none                   | npm scope **without** `@`. Generated packages are named `@<organization>/<scope>-<name>`. | `generate`, discovery |
| `scopes`        | `string[]`         | none                   | Declared team scopes. Scopes are discovered from `apps/` instead.                         | _not read_            |
| `registry.url`  | URL `string`       | none                   | Package registry URL. Must be a valid URL when `registry` is present.                     | _not read_            |
| `registry.auth` | `string`           | none                   | Registry auth reference. Do not commit secrets.                                           | _not read_            |

### `defaults`

| Field             | Type                                                           | Default        | Description                                                                                     | Used by                                      |
| ----------------- | -------------------------------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------- |
| `framework`       | `'react' \| 'vue' \| 'svelte'`                                 | `'react'`      | Only React templates exist.                                                                     | _not read_                                   |
| `language`        | `'typescript' \| 'javascript'`                                 | `'typescript'` | Templates are TypeScript only.                                                                  | _not read_                                   |
| `styling`         | `'tailwind' \| 'css-modules' \| 'styled-components' \| 'none'` | `'tailwind'`   | Templates always use Tailwind.                                                                  | _not read_                                   |
| `stateManagement` | `'zustand' \| 'redux' \| 'jotai' \| 'none'`                    | `'zustand'`    | Templates always include Zustand.                                                               | _not read_                                   |
| `packageManager`  | `'bun' \| 'pnpm' \| 'npm'`                                     | `'bun'`        | Package manager for generated scripts, `dev`, `build`, `test`, and the `doctor` lockfile check. | `generate`, `dev`, `build`, `test`, `doctor` |

### `federation`

| Field           | Type                                                              | Default                                      | Description                                                                                                              | Used by    |
| --------------- | ----------------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------- |
| `plugin`        | `'@originjs/vite-plugin-federation' \| '@module-federation/vite'` | `'@originjs/vite-plugin-federation'`         | Templates always use `@originjs/vite-plugin-federation`.                                                                 | _not read_ |
| `shared`        | `string[]`                                                        | `['react', 'react-dom', 'react-router-dom']` | Dependencies expected to be shared singletons. Generated `vite.config.ts` files have their own hard-coded `shared` list. | `deps`     |
| `runtimePlugin` | `string`                                                          | none                                         | Module Federation runtime plugin path.                                                                                   | _not read_ |

### `dev`

| Field           | Type               | Default        | Description                                                               | Used by    |
| --------------- | ------------------ | -------------- | ------------------------------------------------------------------------- | ---------- |
| `portRange`     | `[number, number]` | `[3000, 3999]` | Inclusive range searched when `generate` assigns ports to apps and hosts. | `generate` |
| `autoStartHost` | `boolean`          | `true`         | Editable in interactive `config`.                                         | _not read_ |
| `parallelLimit` | positive integer   | `10`           | Intended process limit for `dev`.                                         | _not read_ |
| `cors`          | `boolean`          | `true`         | Generated Vite configs always set `cors: true`.                           | _not read_ |

### `build`

| Field          | Type                 | Default    | Description         | Used by    |
| -------------- | -------------------- | ---------- | ------------------- | ---------- |
| `target`       | `string \| string[]` | `'esnext'` | Build target.       | _not read_ |
| `minify`       | `boolean`            | `false`    | Minify output.      | _not read_ |
| `cssCodeSplit` | `boolean`            | `false`    | CSS code splitting. | _not read_ |
| `sourcemap`    | `boolean`            | `true`     | Emit source maps.   | _not read_ |

Build settings live in each app's `vite.config.ts` (`build: { target: 'esnext', minify: false, cssCodeSplit: false }` in the templates).

### `testing`

| Field      | Type                                  | Default        | Description       | Used by    |
| ---------- | ------------------------------------- | -------------- | ----------------- | ---------- |
| `unit`     | `'vitest' \| 'jest' \| 'none'`        | `'vitest'`     | Unit test runner. | _not read_ |
| `e2e`      | `'playwright' \| 'cypress' \| 'none'` | `'playwright'` | E2E test runner.  | _not read_ |
| `coverage` | `boolean`                             | `true`         | Collect coverage. | _not read_ |

### `designSystem`

| Field       | Type      | Default | Description            | Used by    |
| ----------- | --------- | ------- | ---------------------- | ---------- |
| `enabled`   | `boolean` | `true`  | Design system enabled. | _not read_ |
| `tokens`    | `boolean` | `true`  | Design tokens enabled. | _not read_ |
| `storybook` | `boolean` | `true`  | Storybook enabled.     | _not read_ |

### `ci`

| Field          | Type                                                | Default    | Description                                        | Used by    |
| -------------- | --------------------------------------------------- | ---------- | -------------------------------------------------- | ---------- |
| `provider`     | `'github' \| 'gitlab' \| 'azure' \| 'none'`         | `'github'` | CI provider. `init` writes `'github'` or `'none'`. | _not read_ |
| `docker`       | `boolean`                                           | `true`     | Docker support.                                    | _not read_ |
| `deployTarget` | `'vercel' \| 'netlify' \| 'aws' \| 'gcp' \| 'none'` | `'none'`   | Deployment target.                                 | _not read_ |

::: tip Inspect the effective configuration
`mfe-forge config --show` prints the configuration after defaults are applied: exactly what the CLI uses.
:::

## Manifest {#manifest}

`mfe-forge.manifest.json` is written to the workspace root by [`sync`](./cli/sync.md) (unless `--dry-run`), [`status`](./cli/diagnostics.md#status), and [`migrate`](./cli/diagnostics.md#migrate) when it is missing. [`deps`](./cli/diagnostics.md#deps) and [`check`](./cli/diagnostics.md#check) read it when present.

```json
{
  "version": 1,
  "generatedAt": "2026-10-12T21:16:07.075Z",
  "project": { "name": "my-platform", "root": "/abs/path/to/my-platform" },
  "apps": [
    {
      "name": "shop/cart",
      "scope": "shop",
      "port": 3001,
      "url": "http://localhost:3001/assets/remoteEntry.js",
      "camelName": "shopCart",
      "pascalName": "ShopCart",
      "federationName": "shopCartApp",
      "packageName": "@acme/shop-cart",
      "entry": "./src/bootstrap.tsx"
    }
  ],
  "hosts": ["shop/host"],
  "packages": [{ "name": "@acme/utils", "path": "packages/utils", "dependencies": {} }],
  "environments": {}
}
```

| Field                            | Type            | Description                                                                                                                                                           |
| -------------------------------- | --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `version`                        | `1`             | Format version. `check` rejects other values.                                                                                                                         |
| `generatedAt`                    | ISO 8601 string | Time of generation. Changes on every write.                                                                                                                           |
| `project.name`                   | string          | `name` from the configuration.                                                                                                                                        |
| `project.root`                   | string          | **Absolute** path of the workspace root.                                                                                                                              |
| `apps[]`                         | `RemoteApp[]`   | Every `apps/<scope>/<name>/` that contains `vite.config.ts`, **hosts included**.                                                                                      |
| `apps[].name`                    | string          | `scope/name`.                                                                                                                                                         |
| `apps[].scope`                   | string          | Scope directory.                                                                                                                                                      |
| `apps[].port`                    | number          | First `port: <n>` in `vite.config.ts`, or `3000` if none is found.                                                                                                    |
| `apps[].url`                     | string          | `http://localhost:<port>/assets/remoteEntry.js`.                                                                                                                      |
| `apps[].camelName`, `pascalName` | string          | Case conversions of `scope/name`.                                                                                                                                     |
| `apps[].federationName`          | string          | `<camelName>App`; the key used in host `remotes`.                                                                                                                     |
| `apps[].packageName`             | string          | Computed from `organization` and the path. It is **not** read from the app's `package.json`.                                                                          |
| `apps[].entry`                   | string          | Always `./src/bootstrap.tsx`.                                                                                                                                         |
| `hosts`                          | string[]        | `scope/host` for each scope with `apps/<scope>/host/vite.config.ts`.                                                                                                  |
| `packages[]`                     | object[]        | Each `packages/<dir>/` with a `package.json`: `name` (from `package.json`, or the directory name), `path` (relative), and `dependencies` (runtime dependencies only). |
| `environments`                   | object          | Reserved for per-environment remote URLs. Always `{}` today.                                                                                                          |

The `RemoteApp` type also declares optional `exposes`, `routes`, and `shared` fields, but discovery never populates them.

::: tip Should I commit the manifest?
`generatedAt` and the absolute `project.root` change between runs and machines, so a committed manifest produces noisy diffs. Either add it to `.gitignore` and regenerate it in CI with `mfe-forge status`, or accept the churn.
:::

## Related

- [`config` command](./cli/config.md)
- [CLI overview](./cli/index.md)
- [Concepts](./concepts.md)
