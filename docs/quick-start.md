# Quick start

This guide creates a project with one host and one remote, then renders the remote inside the host. Commands use **npm**; the [Installation](./installation.md#package-managers) page lists the Bun and pnpm equivalents.

Requirements: Node.js 20+ and Git. See [Installation](./installation.md).

## 1. Create the project

```bash
npx mfe-forge@latest init my-shop --package-manager npm
cd my-shop
```

When you pass a name, `init` skips the interactive prompts and creates:

```text
my-shop/
├── apps/
├── packages/
├── tools/
├── .gitignore
├── .gitattributes        # added by git init step
├── README.md
├── mfeforge.config.js
├── package.json
└── tsconfig.base.json
```

It then runs `git init` and `npm install`. Add `--skip-install` or `--skip-git` to skip either step. Run `init` without a name to get prompts for the organization, the package manager and optional features (the GitHub Actions workflow is only written when you select it).

## 2. Fix the workspace glob

Apps are generated at `apps/<scope>/<name>`, but the root `package.json` lists only `apps/*`. Change it to:

```json
"workspaces": ["apps/*/*", "packages/*"]
```

Without this change `npm install` does not install the apps' dependencies and the `dev:<scope>:<name>` scripts fail. (With pnpm, create `pnpm-workspace.yaml` instead; see [Installation](./installation.md#workspace-layout-fix).)

## 3. Generate a host and a remote

```bash
npx mfe generate host shop/host
npx mfe generate app shop/catalog
```

The output tells you which files were created. With an empty project and free ports, the host gets port `3000` and the remote `3001`; check the `port:` lines in each `vite.config.ts` for the actual values.

Generating the remote after the host also updates `apps/shop/host/vite.config.ts`:

```ts
remotes: {
  shopCatalogApp: 'http://localhost:3001/assets/remoteEntry.js',
},
```

and writes `apps/shop/host/src/remotes/declarations.d.ts` with a `declare module 'shopCatalogApp/App'` block. Each `generate` also adds a root script, here `dev:shop:host` and `dev:shop:catalog`.

## 4. Expose the component, not the bootstrap

The app template exposes `./App` as `./src/bootstrap.tsx`. That file mounts the remote into `#root` as soon as it is imported, which would replace the host's own UI when the host imports it. Point the exposed module at the component instead, in `apps/shop/catalog/vite.config.ts`:

```ts
exposes: {
  './App': './src/App.tsx',
},
```

The remote still runs standalone, because `src/main.tsx` imports `bootstrap.tsx` directly.

## 5. Render the remote in the host

Edit `apps/shop/host/src/App.tsx`. Add the import and a route:

```tsx
import { LazyRemote } from '@mfe-forge/core'

const Catalog = LazyRemote(() => import('shopCatalogApp/App'), {
  remoteName: 'shop/catalog',
})

// inside <Routes>, before the "*" route:
<Route path="/catalog/*" element={<Catalog />} />
```

Optionally add `{ path: '/catalog', label: 'Catalog' }` to `navItems` in `src/layouts/AppLayout.tsx`.

## 6. Install and run

```bash
npm install
```

The templates use `@originjs/vite-plugin-federation`, which only emits `remoteEntry.js` for a **built** remote. Build the remote and serve it with Vite's preview server, then start the host in dev mode:

```bash
# terminal 1: build and serve the remote on its port
npx mfe build shop/catalog
npm run preview --workspace=shop-catalog

# terminal 2: run the host
npm run dev:shop:host
```

Open `http://localhost:3000/catalog`. The host loads `http://localhost:3001/assets/remoteEntry.js` and renders the catalog app. Stop terminal 1 and reload: the host shows an alert with a **Try again** button instead of crashing.

::: tip
The package name is `shop-catalog` because no organization is configured. With `organization: 'acme'` it would be `@acme/shop-catalog`.
:::

## 7. Check the project

```bash
npx mfe doctor
npx mfe status
npx mfe sync --check
```

`doctor` prints one line per check and exits with code `2` if any fails. `status` lists every app with its port and writes `mfe-forge.manifest.json`. `sync --check` exits with `1` when a host's remotes or declarations are out of date.

## Next steps

- [Example project](./tutorials/example-project.md): two remotes, shared state and events, tests and a production build.
- [Concepts](./concepts.md): scopes, naming, ports and sync in detail.
- [CLI reference](./cli/): all commands and flags.
