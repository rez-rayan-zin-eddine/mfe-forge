# @mfe-forge/testing

> Vitest, Testing Library, and Playwright helpers for MFE Forge micro-frontends.

Part of the [MFE Forge](https://github.com/rez-rayan-zin-eddine/mfe-forge) project. Pre-1.0 (`0.x`): APIs may change between minor versions.

## Installation

```bash
npm install -D @mfe-forge/testing
# peer dependencies: react@^19, @testing-library/react@^16, vitest
```

Use a DOM environment (`environment: 'jsdom'` in `vitest.config.ts`) for `renderMFE`.

## `renderMFE`

```tsx
import { renderMFE } from '@mfe-forge/testing'

renderMFE(<CartApp />, {
  route: '/checkout/cart',          // pushed onto window.history before rendering
  initialState: { items: ['apple'] }, // exposed as window.__MFE_INITIAL_STATE__ until unmount
  wrapper: Providers,                 // composed inside React.StrictMode
})
```

Returns the Testing Library render result.

## `mockRemoteModule`

```ts
import { mockRemoteModule } from '@mfe-forge/testing'

mockRemoteModule('cartApp/App', () => <div>mock cart</div>)
const { default: CartApp } = await import('cartApp/App')
```

Uses `vi.doMock`, so it affects imports performed after the call.

## `waitForRemoteLoad`

```ts
await waitForRemoteLoad(() => document.querySelector('[data-remote-name="cartApp"]') !== null, 3000)
```

Polls every 100 ms and throws `Remote module load timeout` after the timeout (default 5000 ms).

## Playwright helpers

```ts
import { e2eHelpers } from '@mfe-forge/testing'

await e2eHelpers.navigateToMFE(page, 'checkout', '/cart') // waits for [data-mfe-scope="checkout"]
await e2eHelpers.waitForRemote(page, 'cartApp')           // waits for [data-remote-name="cartApp"]
await e2eHelpers.assertMFERendered(page, 'checkout')      // fails if [data-testid="mfe-error"] is present
```

`MFErrorBoundary`'s default fallback from `@mfe-forge/core` renders `data-testid="mfe-error"` and `data-remote-name`. Mark your MFE root elements with `data-mfe-scope` / `data-remote-name` for the navigation helpers.

## License

MIT
