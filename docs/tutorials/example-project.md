# Tutorial: a storefront with two remotes

This walkthrough builds a small storefront: a `shop` host that composes a **catalog** remote and a **cart** remote. Along the way it covers naming, sync, shared state, cross-MFE events, testing, diagnostics and a production build. It assumes you have read the [Quick start](../quick-start.md); commands use **npm**.

Final layout:

```text
storefront/
├── apps/
│   └── shop/
│       ├── host/       shopHostApp      :3000
│       ├── catalog/    shopCatalogApp   :3001
│       └── cart/       shopCartApp      :3002
├── packages/
│   └── contracts/      shared event names and types
├── mfe-forge.manifest.json
├── mfeforge.config.js
└── package.json
```

Ports assume an empty project and free ports; the CLI picks the first free port in `dev.portRange` for each app.

## 1. Create the workspace

```bash
npx mfe-forge@latest init storefront --package-manager npm
cd storefront
```

Edit the root `package.json` so the workspaces match the two-level app layout (see [Installation](../installation.md#workspace-layout-fix)):

```json
"workspaces": ["apps/*/*", "packages/*"]
```

Optionally set an npm organization. Give the bare name without `@`; the CLI adds the `@` itself when it builds package names:

```bash
npx mfe config --set organization --value acme
```

The rest of this tutorial assumes **no** organization, so package names are `shop-host`, `shop-catalog`, `shop-cart` and `contracts`.

::: tip
`config --set` rewrites `mfeforge.config.js` as a plain object literal (`export default { ... }`) with every default filled in. That is expected.
:::

## 2. Generate the host and the remotes

```bash
npx mfe generate host shop/host
npx mfe generate app shop/catalog
npx mfe generate app shop/cart
```

Use `--dry-run` first if you want to see the file list without writing anything:

```bash
npx mfe generate app shop/cart --dry-run
```

Because the host exists before the apps, each `generate app` rewrites the host's `remotes` block with **all** remotes of the scope and regenerates `src/remotes/declarations.d.ts`. Confirm everything is consistent:

```bash
npx mfe sync --dry-run
npx mfe graph
```

`graph` prints `shop/host -> shop/catalog, shop/cart`. `sync --dry-run` should report `ok` for both host files.

## 3. Expose components, not bootstraps

For **both** remotes, change the exposed module in `vite.config.ts` from `./src/bootstrap.tsx` to the component file. `bootstrap.tsx` mounts into `#root` on import, which would take over the host page:

```ts
exposes: {
  './App': './src/App.tsx',
},
```

## 4. Share the runtime packages

The cart and the catalog will talk through `globalEventBus` and `useGlobalStore`. Both are in-memory module state, so the host and every remote must use one copy of each package. In `apps/shop/host/vite.config.ts`, `apps/shop/catalog/vite.config.ts` and `apps/shop/cart/vite.config.ts`, extend `shared`:

```ts
shared: {
  react: { singleton: true, requiredVersion: '^19.1.0' },
  'react-dom': { singleton: true, requiredVersion: '^19.1.0' },
  'react-router-dom': { singleton: true, requiredVersion: '^7.5.0' },
  zustand: { singleton: true, requiredVersion: '^5.0.12' },
  '@mfe-forge/core': { singleton: true },
  '@mfe-forge/store': { singleton: true },
},
```

## 5. Add a contracts package

A shared package keeps event names and payload types in one place:

```bash
npx mfe generate package contracts
```

This creates `packages/contracts` with source-only exports (`"main": "./src/index.ts"`). Replace `packages/contracts/src/index.ts`:

```ts
export const CART_ITEM_ADDED = 'cart:item-added'

export interface CartItemAdded {
  sku: string
  title: string
  price: number
}
```

Add `"contracts": "*"` to the `dependencies` of `apps/shop/catalog/package.json` and `apps/shop/cart/package.json`, then install:

```bash
npm install
```

## 6. Emit from the catalog

Replace the `/` route element of `apps/shop/catalog/src/App.tsx` with a small product list:

```tsx
import { globalEventBus } from '@mfe-forge/core'
import { CART_ITEM_ADDED, type CartItemAdded } from 'contracts'

const products: CartItemAdded[] = [
  { sku: 'mug', title: 'Mug', price: 12 },
  { sku: 'tee', title: 'T-shirt', price: 25 },
]

function ProductList() {
  return (
    <ul>
      {products.map((p) => (
        <li key={p.sku}>
          {p.title} ({p.price} EUR)
          <button onClick={() => globalEventBus.emit<CartItemAdded>(CART_ITEM_ADDED, p)}>
            Add to cart
          </button>
        </li>
      ))}
    </ul>
  )
}
```

`globalEventBus` prefixes every event with `mfe:global:`, so the handler key becomes `mfe:global:cart:item-added`. Subscribers on the same bus instance use the same unprefixed name.

## 7. Listen and store in the cart

The cart keeps its own state in a scoped store from `@mfe-forge/store`. Create `apps/shop/cart/src/cart-store.ts`:

```ts
import { createScopedStore } from '@mfe-forge/store'
import type { CartItemAdded } from 'contracts'

export const useCartStore = createScopedStore('cart', { items: [] as CartItemAdded[] })
```

`createScopedStore` returns a Zustand hook with a `reset()` action. Subscribe to the event once, at module level, in `apps/shop/cart/src/App.tsx`:

```tsx
import { globalEventBus } from '@mfe-forge/core'
import { CART_ITEM_ADDED, type CartItemAdded } from 'contracts'
import { useCartStore } from './cart-store'

globalEventBus.on<CartItemAdded>(CART_ITEM_ADDED, (item) => {
  useCartStore.setState((s) => ({ items: [...s.items, item] }))
})

function CartSummary() {
  const items = useCartStore((s) => s.items)
  const reset = useCartStore((s) => s.reset)
  const total = items.reduce((sum, i) => sum + i.price, 0)
  return (
    <section aria-label="Cart">
      <p>
        {items.length} item(s), {total} EUR
      </p>
      <button onClick={reset}>Clear</button>
    </section>
  )
}
```

Use `<CartSummary />` as the `/` route element.

## 8. Compose in the host

In `apps/shop/host/src/App.tsx`:

```tsx
import { LazyRemote } from '@mfe-forge/core'

const Catalog = LazyRemote(() => import('shopCatalogApp/App'), { remoteName: 'shop/catalog' })
const Cart = LazyRemote(() => import('shopCartApp/App'), { remoteName: 'shop/cart' })
```

Add the routes inside `<Routes>`, before the `*` route:

```tsx
<Route
  path="/shop/*"
  element={
    <div className="grid grid-cols-2 gap-8 p-8">
      <Catalog />
      <Cart />
    </div>
  }
/>
```

and a nav entry `{ path: '/shop', label: 'Shop' }` in `src/layouts/AppLayout.tsx`. The module names resolve to types thanks to the generated `src/remotes/declarations.d.ts`.

## 9. Run it

The originjs federation plugin serves `remoteEntry.js` only from a build, so build the remotes and serve them with `vite preview`, and run the host with the dev server:

```bash
npx mfe build shop/catalog
npx mfe build shop/cart

npm run preview --workspace=shop-catalog   # terminal 1, port 3001
npm run preview --workspace=shop-cart      # terminal 2, port 3002
npm run dev:shop:host                      # terminal 3, port 3000
```

Open `http://localhost:3000/shop` and click **Add to cart**: the cart total updates across the remote boundary. Stop one preview server and reload; that panel shows "Something went wrong" with a **Try again** button while the other keeps working.

`npx mfe dev` starts every `dev:<scope>:<name>` script through `npx --yes concurrently`. It is convenient for hosts and standalone remote development, but with the originjs plugin a remote served by `vite` (dev) does not expose `remoteEntry.js` to the host.

## 10. Test the cart

Install the test dependencies in the cart app:

```bash
npm install -D @mfe-forge/testing @testing-library/react @testing-library/dom jsdom --workspace=shop-cart
```

Add a `test` section to `apps/shop/cart/vite.config.ts`:

```ts
/// <reference types="vitest" />
// ...
test: { environment: 'jsdom' },
```

Create `apps/shop/cart/src/cart.test.tsx`:

```tsx
import { act } from 'react'
import { describe, it, expect } from 'vitest'
import { renderMFE } from '@mfe-forge/testing'
import { globalEventBus } from '@mfe-forge/core'
import { MemoryRouter } from 'react-router-dom'
import App from './App'

describe('cart', () => {
  it('adds items announced on the event bus', () => {
    const { getByText } = renderMFE(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    )
    act(() => globalEventBus.emit('cart:item-added', { sku: 'mug', title: 'Mug', price: 12 }))
    expect(getByText('1 item(s), 12 EUR')).toBeTruthy()
  })
})
```

Run it once (the app's `test` script is plain `vitest`, which watches in an interactive terminal):

```bash
CI=1 npx mfe test shop/cart
```

`mfe test` exits with code `2` if the script fails. See [Testing](../testing.md) and [`@mfe-forge/testing`](../packages/testing.md).

## 11. Diagnose

```bash
npx mfe doctor          # node version, lock file, ports, hosts per scope, workspaces
npx mfe check           # manifest version, duplicate apps, invalid or duplicate ports
npx mfe deps --check    # shared dependency versions across packages/*
npx mfe status --json   # topology summary, also writes mfe-forge.manifest.json
npx mfe inspect cart    # one app's discovered metadata
```

Add `npx mfe sync --check` to CI so a pull request that adds a remote without syncing the host fails.

## 12. Build for production

```bash
npx mfe build            # every discovered app, sequentially
npx mfe build --scope shop --bail
```

Each app's `dist/` contains `index.html`, `assets/` and, for remotes, `assets/remoteEntry.js`. The host's `remotes` block still points at `http://localhost:<port>`; before deploying you must replace those URLs with your production origins. [Publishing](../publishing.md) explains how.

## Where to go next

- [Concepts](../concepts.md) for the naming and sync rules used above.
- [`@mfe-forge/core`](../packages/core.md), [`@mfe-forge/store`](../packages/store.md) and [`@mfe-forge/router`](../packages/router.md) for the full runtime APIs.
- [Troubleshooting](../troubleshooting.md) if a step did not behave as described.
