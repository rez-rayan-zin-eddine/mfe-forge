# @mfe-forge/testing

Small helpers for testing MFE Forge remotes and hosts with Vitest and React Testing Library: a render wrapper, a remote-module mock, a polling wait, and a few Playwright-style end-to-end helpers.

For workflows and patterns, see the [Testing guide](../testing.md).

## Install

```bash
bun add -d @mfe-forge/testing @testing-library/react vitest jsdom
```

| Requirement                    | Value        |
| ------------------------------ | ------------ |
| Module format                  | ESM only     |
| Node.js                        | `>=20.0.0`   |
| Peer: `react`                  | `^19.0.0`    |
| Peer: `@testing-library/react` | `^16.0.0`    |
| Peer: `vitest`                 | `>=1.5.0 <6` |

The package imports `vi` from `vitest` at module load, so it can only be imported inside a Vitest run. `renderMFE` needs a DOM environment (`jsdom` or `happy-dom`) to actually render; it does not install one for you.

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: { environment: 'jsdom' },
})
```

## Exports

| Export              | Kind                      |
| ------------------- | ------------------------- |
| `renderMFE`         | function                  |
| `mockRemoteModule`  | function                  |
| `waitForRemoteLoad` | async function            |
| `e2eHelpers`        | object of async functions |

The options interface `MFERenderOptions` is used in `renderMFE`'s signature but is not exported by name.

## `renderMFE(ui, options?)`

```ts
function renderMFE(ui: React.ReactElement, options?: MFERenderOptions): RenderResult

interface MFERenderOptions extends RenderOptions {
  route?: string
  initialState?: Record<string, any>
}
```

Renders `ui` with React Testing Library's `render`, wrapped in `React.StrictMode`.

| Option                    | Type                  | Default     | Behavior                                                                                                                               |
| ------------------------- | --------------------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `route`                   | `string`              | `'/'`       | Calls `window.history.pushState({}, '', route)` before rendering, so `window.location` reflects it. Query strings and hashes are kept. |
| `initialState`            | `Record<string, any>` | `undefined` | Assigned to `window.__MFE_INITIAL_STATE__`. When omitted, any previous value is deleted.                                               |
| `wrapper`                 | `React.ComponentType` | none        | Rendered inside `StrictMode`, around `ui`. Use it for routers, store providers, query clients.                                         |
| any other `RenderOptions` |                       |             | Passed through to RTL `render` (`container`, `baseElement`, `queries`, ...).                                                           |

Returns the RTL `RenderResult`. Its `unmount()` is wrapped to also delete `window.__MFE_INITIAL_STATE__`.

What it does **not** do:

- It does not mount a router. `route` only changes the browser URL; your component (or `wrapper`) must provide a router that reads it, such as `BrowserRouter`.
- It does not create a store. No MFE Forge package currently reads `window.__MFE_INITIAL_STATE__`; your own code must read it if you want to seed state that way. Prefer seeding stores directly or through `wrapper`.
- Because the state lives on `window`, two concurrent renders share it: unmounting one clears it for the other.
- `StrictMode` double-invokes effects in development, so effect counters will see two runs.
- In a Node environment without `window`, the URL and state steps are skipped instead of throwing.

```tsx
import { screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { renderMFE } from '@mfe-forge/testing'
import { App } from '../src/App'

it('renders the order page', () => {
  renderMFE(<App />, {
    route: '/orders/42?tab=items',
    wrapper: ({ children }) => <BrowserRouter>{children}</BrowserRouter>,
  })
  expect(screen.getByRole('heading', { name: /order 42/i })).toBeTruthy()
})
```

## `mockRemoteModule(moduleName, component)`

```ts
function mockRemoteModule(moduleName: string, component: React.ComponentType<any>): void
```

Calls `vi.doMock(moduleName, () => ({ default: component }))`.

| Parameter    | Description                                                            |
| ------------ | ---------------------------------------------------------------------- |
| `moduleName` | Remote specifier exactly as imported, for example `'checkoutApp/App'`. |
| `component`  | Component returned as the module's `default` export.                   |

Notes:

- `vi.doMock` is **not hoisted**. It only affects imports evaluated after the call, so call it before the code under test performs `import('checkoutApp/App')`, or import the host component dynamically after mocking.
- Only a `default` export is provided. Named exports from the remote will be `undefined`.
- Vitest must be able to resolve the specifier. Federation specifiers like `checkoutApp/App` are not real packages; if resolution fails, add a `resolve.alias` for the specifier in your Vitest config (pointing at any stub file) so the mock has something to replace.
- Use `vi.resetModules()` / `vi.doUnmock()` between tests if different tests need different mocks.

```tsx
import { screen } from '@testing-library/react'
import { mockRemoteModule, renderMFE } from '@mfe-forge/testing'

it('renders the checkout remote inside the shell', async () => {
  mockRemoteModule('checkoutApp/App', () => <div>Checkout stub</div>)
  const { Shell } = await import('../src/Shell') // imported after the mock
  renderMFE(<Shell />, { route: '/checkout' })
  expect(await screen.findByText('Checkout stub')).toBeTruthy()
})
```

## `waitForRemoteLoad(callback, timeout?)`

```ts
function waitForRemoteLoad(callback: () => boolean, timeout?: number): Promise<void>
```

| Parameter  | Type            | Default  | Description                                                       |
| ---------- | --------------- | -------- | ----------------------------------------------------------------- |
| `callback` | `() => boolean` | required | Polled every 100 ms. Resolves as soon as it returns `true`.       |
| `timeout`  | `number` (ms)   | `5000`   | Rejects with `Error('Remote module load timeout')` once exceeded. |

The callback runs synchronously and immediately on the first iteration. It is a generic poller; for DOM conditions, RTL's `waitFor` / `findBy*` are usually a better fit.

```ts
await waitForRemoteLoad(() => document.querySelector('[data-testid="cart"]') !== null, 2000)
```

## `e2eHelpers`

Helpers typed with `page: any`, written for a Playwright `Page` (they call `page.goto`, `page.waitForSelector`, `page.$`). Playwright is not a dependency of this package.

| Helper              | Signature                                            | Behavior                                                                                           |
| ------------------- | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `navigateToMFE`     | `(page, scope: string, path = '/') => Promise<void>` | `page.goto('/' + scope + path)`, then waits up to 10 s for `[data-mfe-scope="<scope>"]`.           |
| `waitForRemote`     | `(page, remoteName: string) => Promise<void>`        | Waits up to 10 s for `[data-remote-name="<remoteName>"]`.                                          |
| `assertMFERendered` | `(page, scope: string) => Promise<void>`             | Throws `MFE "<scope>" rendered with errors` if any `[data-testid="mfe-error"]` exists on the page. |

::: warning Markup contract
These selectors are not all produced by MFE Forge:

- No MFE Forge package or template renders `data-mfe-scope`. `navigateToMFE` will time out unless your app adds that attribute itself.
- `data-remote-name` is rendered only by the **default error fallback** of `MFErrorBoundary` in `@mfe-forge/core`, so `waitForRemote` currently resolves when a remote has _failed_, not when it has loaded. Add your own `data-remote-name` to a successful render if you rely on it.
- `data-testid="mfe-error"` is the default `MFErrorBoundary` fallback. A custom `fallback` will not match. The check is page-wide; `scope` is only used in the error message.
  :::

## Related

- [Testing guide](../testing.md)
- [@mfe-forge/core](./core.md)
- [@mfe-forge/design](./design.md)
