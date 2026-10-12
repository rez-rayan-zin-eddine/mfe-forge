# Migration

This page covers two kinds of migration: moving an existing micro frontend setup into an MFE Forge project, and upgrading between MFE Forge versions.

## Upgrading MFE Forge

### From the deprecated `2.x`–`8.x` releases

npm versions `2.0.0` to `8.1.0` of `mfe-forge` were prototype releases and are deprecated. The supported line restarted at `0.1.0`. There is no automated migration; create a new project with the current CLI and move your apps into it as described below. If you install by range, make sure it resolves to `0.x`:

```bash
npm install -D mfe-forge@^0.1.1
```

### Within `0.x`

All six packages (`mfe-forge` and `@mfe-forge/core`, `router`, `store`, `design`, `testing`) share one version number. Upgrade them together:

```bash
npm install -D mfe-forge@<version>
npm install @mfe-forge/core@<version> @mfe-forge/router@<version> @mfe-forge/store@<version> --workspace=<app>
```

Generated apps pin the runtime packages to the exact CLI version that generated them, so each app's `package.json` needs updating. Before 1.0, a minor bump (for example `0.1.x` to `0.2.0`) may contain breaking changes; read the [changelog](https://github.com/rez-rayan-zin-eddine/mfe-forge/blob/main/packages/cli/CHANGELOG.md) and the release notes on GitHub.

Templates are copied at generation time. Upgrading the CLI does **not** change existing apps; new template improvements only apply to newly generated apps. Compare a freshly generated app (`mfe-forge generate app tmp/probe --dry-run` lists the files) with your existing ones to port changes.

### Upcoming: Module Federation 2.0

The roadmap plans to replace `@originjs/vite-plugin-federation` with `@module-federation/vite` in `0.2.0`, with remotes read from configuration instead of patched into `vite.config.ts`, and a codemod. The config schema already accepts `federation.plugin: '@module-federation/vite'`, but no CLI behaviour depends on that value yet. This section will be updated when that release ships.

## Moving an existing Vite + Module Federation setup

1. **Create a project next to your code**:

   ```bash
   npx mfe-forge@latest init my-platform --skip-install
   cd my-platform
   ```

   Set `"workspaces": ["apps/*/*", "packages/*"]` in the root `package.json` ([why](./installation.md#workspace-layout-fix)).

2. **Choose scopes and move apps** into `apps/<scope>/<name>`. The shell of each scope must live at `apps/<scope>/host`:

   ```text
   apps/
   └── storefront/
       ├── host/        # your existing shell
       ├── catalog/     # existing remotes
       └── checkout/
   ```

   Every app directory must contain a `vite.config.ts` (not `.js` or `.mts`) to be discovered.

3. **Align federation names.** MFE Forge expects each remote's federation `name` to be camelCase of `scope/name` plus `App` (`storefrontCatalogApp`), its `filename` to be `remoteEntry.js` served under `/assets/`, and an exposed `./App` module. The host's `remotes` entries are generated from these conventions, so a remote that keeps its old name will not match.

4. **Use literal ports.** Put a literal `port: <n>` in `server` and `preview`. Discovery cannot read ports from environment variables.

5. **Keep an inline `remotes: { ... }` block** in the host's federation call. `sync` replaces this block as text; remotes built with variables or spreads are not supported. Move any remotes from other scopes or external origins into code outside that block.

6. **Share the same singletons** in every app: `react`, `react-dom`, `react-router-dom` and `zustand`, plus `@mfe-forge/core` and `@mfe-forge/store` if you use their global event bus or store across MFEs.

7. **Synchronise and check**:

   ```bash
   npm install
   npx mfe sync --dry-run
   npx mfe sync
   npx mfe doctor
   ```

8. **Add root scripts** for apps you moved. `generate` adds `dev:<scope>:<name>` scripts automatically, but moved apps need them by hand, for example `"dev:storefront:catalog": "npm run dev --workspace=storefront-catalog"`. `mfe-forge dev` runs these scripts by name.

## From webpack Module Federation

MFE Forge templates use Vite. Each app needs:

- `index.html` at the app root with `<div id="root"></div>` and `<script type="module" src="/src/main.tsx"></script>` instead of `HtmlWebpackPlugin`;
- `vite.config.ts` with `@vitejs/plugin-react` and `@originjs/vite-plugin-federation` configured as in the templates (`name`, `filename: 'remoteEntry.js'`, `exposes`, `shared`);
- the async boundary pattern: `main.tsx` does `import('./bootstrap')`;
- `build.target: 'esnext'`, which the templates set because the federation plugin relies on top-level await.

Webpack-specific features such as `__webpack_public_path__` or runtime remotes via `window` containers have no direct equivalent in the originjs plugin. Generate one app with `mfe-forge generate app <scope>/<name>` and compare its configuration with yours.

## From single-spa

single-spa composes applications through lifecycles (`bootstrap`, `mount`, `unmount`) and import maps. MFE Forge composes React components through Module Federation instead:

1. Replace each application's single-spa lifecycle export with a default-exported React component (the exposed `./App`).
2. Replace the root config with a host app whose routes render remotes with `LazyRemote` from `@mfe-forge/core`.
3. Replace custom-event communication with `globalEventBus` or `createEventBus` from `@mfe-forge/core`, or keep DOM `CustomEvent`s; the two can coexist.

This only works when every application is React. If you need several frameworks on one page, stay with single-spa or combine it with federation yourself.

## Gradual migration

For a large monolith, migrate incrementally:

1. Create the host and one remote with MFE Forge and serve the legacy app alongside it (for example behind a route that renders the legacy app in an iframe or through its existing mount function).
2. Move one feature at a time into a remote.
3. Use `@mfe-forge/core`'s event bus for messages between new remotes, and a thin adapter for messages to the legacy app.
4. Remove the legacy route when the last feature has moved.

## Configuration

`mfeforge.config.js` (or `.ts`) must default-export a plain object. A typical migrated config:

```js
/** @type {import('mfe-forge').MFEConfig} */
export default {
  name: 'my-platform',
  organization: 'acme',
  defaults: { packageManager: 'pnpm' },
  federation: { shared: ['react', 'react-dom', 'react-router-dom', 'zustand'] },
  dev: { portRange: [4000, 4099] },
}
```

All other fields take their schema defaults. See [Configuration](./config.md).
