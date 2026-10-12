# Testing guide

This guide covers testing generated remotes and hosts, mocking Module Federation imports, and how the MFE Forge repository tests itself. API details for the helpers are in the [@mfe-forge/testing reference](./packages/testing.md).

## Setting up a generated app

Generated apps and hosts include a `test` script (`vitest`) and `vitest` as a dev dependency, but no test files, no DOM environment and no Testing Library. Add them:

```bash
bun add -d @mfe-forge/testing @testing-library/react jsdom
```

```ts
// vite.config.ts (or a separate vitest.config.ts)
export default defineConfig({
  // ...existing plugins
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
  },
})
```

`@mfe-forge/testing` requires `react@^19`, `@testing-library/react@^16` and `vitest >=1.5 <6`. The app template pins `vitest@^1.5.0`, which is in range.

::: tip Federation plugin in tests
If your Vite config includes the federation plugin, Vitest loads it too. If that causes resolution errors, put test settings in a dedicated `vitest.config.ts` that only uses `@vitejs/plugin-react`.
:::

## Unit testing a remote

A remote's exposed component is an ordinary React component. Test it directly, using `renderMFE` to get StrictMode and a URL:

```tsx
// src/App.test.tsx
import { screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { renderMFE } from '@mfe-forge/testing'
import App from './App'

it('shows the cart route', () => {
  renderMFE(<App />, {
    route: '/cart',
    wrapper: ({ children }) => <BrowserRouter>{children}</BrowserRouter>,
  })
  expect(screen.getByText(/cart/i)).toBeTruthy()
})
```

Things to keep in mind:

- `route` only calls `history.pushState`. Supply a router via `wrapper` (or have the component render one).
- `initialState` sets `window.__MFE_INITIAL_STATE__`, which no MFE Forge package reads. To seed a store, set it directly: `useGlobalStore.setState({ ... })`, or for scoped stores create them in the test with `createScopedStore` and reset with `clearScopedStore()` in `afterEach`. See [@mfe-forge/store](./packages/store.md).
- Effects run twice under StrictMode.

## Mocking federated remotes in a host

A host imports remotes with specifiers like `checkoutApp/App` that only exist at runtime. In unit tests, replace them:

```tsx
import { afterEach, it, expect, vi } from 'vitest'
import { screen } from '@testing-library/react'
import { mockRemoteModule, renderMFE } from '@mfe-forge/testing'

afterEach(() => {
  vi.resetModules()
})

it('renders the checkout remote', async () => {
  mockRemoteModule('checkoutApp/App', () => <div>Checkout stub</div>)

  // Import after mocking: vi.doMock is not hoisted.
  const { default: App } = await import('./App')
  renderMFE(<App />, { route: '/checkout' })

  expect(await screen.findByText('Checkout stub')).toBeTruthy()
})
```

If Vitest cannot resolve the specifier at all, alias it to a stub file so the mock has a target:

```ts
// vitest.config.ts
resolve: {
  alias: { 'checkoutApp/App': new URL('./test/remote-stub.tsx', import.meta.url).pathname },
},
```

`mockRemoteModule` only provides a `default` export. For remotes with named exports, call `vi.doMock` yourself.

## Testing failure handling

Wrap remotes in `MFErrorBoundary` from `@mfe-forge/core` and test the fallback by making the mock throw:

```tsx
import { MFErrorBoundary } from '@mfe-forge/core'

it('shows the fallback when a remote throws', () => {
  const Broken = () => {
    throw new Error('boom')
  }
  renderMFE(
    <MFErrorBoundary remoteName="checkout">
      <Broken />
    </MFErrorBoundary>
  )
  expect(screen.getByRole('alert')).toBeTruthy()
  expect(screen.getByTestId('mfe-error')).toBeTruthy()
})
```

The default fallback renders `data-testid="mfe-error"`, `data-remote-name`, a `role="alert"` card and a "Try again" button that resets the boundary. See [@mfe-forge/core](./packages/core.md) for the full props.

## Waiting for asynchronous loads

For DOM conditions, prefer Testing Library's `findBy*` / `waitFor`. `waitForRemoteLoad(callback, timeout = 5000)` is a plain poller (every 100 ms) for non-DOM conditions:

```ts
await waitForRemoteLoad(() => Boolean((window as any).checkoutApp), 2000)
```

## End-to-end tests

Generated apps declare `@playwright/test` and a `test:e2e` script (`playwright test`), but no Playwright config or specs are generated. `e2eHelpers` from `@mfe-forge/testing` can be passed a Playwright `page`, with caveats:

- `navigateToMFE` waits for `[data-mfe-scope="<scope>"]`, which nothing in MFE Forge renders. Add the attribute to your remote root, or use `page.goto` directly.
- `waitForRemote` waits for `[data-remote-name]`, which only the default error fallback renders, so it resolves on failure. Add your own attribute for the success case.
- `assertMFERendered` throws if any `[data-testid="mfe-error"]` is on the page.

A minimal spec without the helpers:

```ts
import { test, expect } from '@playwright/test'

test('host loads the checkout remote', async ({ page }) => {
  await page.goto('/checkout')
  await expect(page.getByTestId('mfe-error')).toHaveCount(0)
})
```

## Workspace-level checks

The CLI can verify topology without running any app:

```bash
mfe-forge check --json
mfe-forge deps --check --json
mfe-forge sync --check
```

Run `sync` twice when changing it; the second run should report no changes. See the [CLI reference](./cli/).

## How this repository tests itself

All package tests use **Vitest**, orchestrated by Turborepo.

```bash
bun install --frozen-lockfile
bun run test                       # turbo run test
bun run --cwd packages/design test # one package
```

| Package              | Environment                                                                    | What is covered                                                                                                                                                                                                |
| -------------------- | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@mfe-forge/design`  | jsdom                                                                          | `applyTokens` writes color, radius and font variables.                                                                                                                                                         |
| `@mfe-forge/testing` | jsdom by default; one file opts into `node` with `// @vitest-environment node` | `waitForRemoteLoad` success/timeout; `renderMFE` route handling, `initialState` set/cleanup on rerender and unmount, custom wrapper inside StrictMode, option passthrough, and safe behavior with no `window`. |

Other packages (core, router, store, cli) have their own Vitest suites. There is no end-to-end suite and no generated-project fixture matrix in the repository yet.

## CI

`.github/workflows/ci.yml` runs on pushes and pull requests to `main`:

| Job               | Steps                                                                                                                                                            |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `verify`          | `bun install --frozen-lockfile`, `bun run lint`, `bun run type-check`, `bun run build`, `bun run test`, `bun run check:package` (publint `--strict` per package) |
| `docs`            | `bun run docs:build`                                                                                                                                             |
| `changeset-check` | Pull requests only: requires a changeset when `packages/*/src/**` or `packages/*/package.json` change.                                                           |

Reproduce CI locally:

```bash
bun run lint && bun run type-check && bun run build && bun run test && bun run check:package && bun run docs:build
```

Separate workflows run a dependency audit (`audit.yml`), docs deployment (`deploy-docs.yml`) and releases (`release.yml`).

## Related

- [@mfe-forge/testing reference](./packages/testing.md)
- [Troubleshooting](./troubleshooting.md)
- [Getting started](./getting-started.md)
