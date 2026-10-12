# @mfe-forge/router

Routing coordination for MFE Forge built on React Router 7: navigation across scopes, route-change broadcasting over an event bus, route generation from a scope registry, and sync or async route guards.

**Version:** 0.1.1 · **Module format:** ESM only · **Node:** `>=20` · **License:** MIT

## When to use it

- A host composes several MFEs under URL prefixes such as `/checkout/...` and `/admin/...` (one prefix per _scope_), and MFEs need to link to each other without hard-coding full URLs.
- MFEs that do not share a router need to react to navigation in the host.
- You want to declare routes per scope as data and turn them into `<Route>` elements.

## Installation

::: code-group

```bash [npm]
npm install @mfe-forge/router
```

```bash [pnpm]
pnpm add @mfe-forge/router
```

:::

| Peer dependency    | Range     |
| ------------------ | --------- |
| `react`            | `^19.0.0` |
| `react-dom`        | `^19.0.0` |
| `react-router-dom` | `^7.0.0`  |

::: warning Router context required
`useMFENavigation` and `useRouteSync` call React Router's `useNavigate` / `useLocation`, so they must run inside a router (`<BrowserRouter>`, `<MemoryRouter>`, `RouterProvider`, ...). Share `react-router-dom` as a Module Federation singleton so remotes see the host's router context.
:::

## Import paths

Only the root entry is published:

```ts
import {
  useMFENavigation,
  useRouteSync,
  generateRoutes,
  createRouteGuard,
  type MFERoute,
  type RouteRegistry,
} from '@mfe-forge/router'
```

---

## useMFENavigation

```ts
function useMFENavigation(): {
  navigateTo: (scope: string, path?: string) => void
  getCurrentScope: () => string
  getCurrentPath: () => string
  location: Location // from react-router-dom
}
```

### Return value

| Member                          | Type                                     | Description                                                              |
| ------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------ |
| `navigateTo(scope, path = '/')` | `(scope: string, path?: string) => void` | Navigates (push) to `/<scope><path>` with slashes normalized.            |
| `getCurrentScope()`             | `() => string`                           | First non-empty segment of `location.pathname`, or `'host'` at the root. |
| `getCurrentPath()`              | `() => string`                           | `location.pathname`.                                                     |
| `location`                      | `Location`                               | The React Router location object for the current render.                 |

### Path normalization

`navigateTo` strips all leading and trailing slashes from `scope` and all leading slashes from `path`, then joins them:

| Call                                     | Target                 |
| ---------------------------------------- | ---------------------- |
| `navigateTo('checkout', '/cart')`        | `/checkout/cart`       |
| `navigateTo('/checkout/', 'cart')`       | `/checkout/cart`       |
| `navigateTo('checkout', '//cart/items')` | `/checkout/cart/items` |
| `navigateTo('checkout')`                 | `/checkout/`           |
| `navigateTo('checkout', '/')`            | `/checkout/`           |

### Example

```tsx
import { useMFENavigation } from '@mfe-forge/router'

function GoToCart() {
  const { navigateTo, getCurrentScope } = useMFENavigation()
  return (
    <button type="button" onClick={() => navigateTo('checkout', '/cart')}>
      Cart (you are in {getCurrentScope()})
    </button>
  )
}
```

### Gotchas

- Navigation always uses `navigate(target)` with default options: it pushes a history entry, and query strings or hashes are kept only if you include them in `path` (for example `'/cart?step=2'`).
- The target is absolute. React Router `basename` still applies, but the target is not resolved relative to the current route.
- Trailing slashes in `path` are kept (`'/cart/'` → `/checkout/cart/`).
- `getCurrentScope()` returns `'host'` only for `/`. It does not know which scopes exist: `/about` returns `'about'`.

---

## useRouteSync

Emits a `route:changed` event on an event bus whenever the location changes.

```ts
function useRouteSync(eventBus?: { emit: (event: string, payload: any) => void }): void
```

### Parameters

| Name       | Type                             | Default     | Description                                                                                                             |
| ---------- | -------------------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------------- |
| `eventBus` | `{ emit(event, payload): void }` | `undefined` | Any object with an `emit` method, such as `globalEventBus` from `@mfe-forge/core`. When omitted, the hook does nothing. |

### Behavior

- Runs in a `useEffect` keyed on `[location, eventBus]`, so it emits **after mount** (the initial location) and after every location change, including changes to only `search` or `hash`.
- Payload: `{ path: location.pathname, search: location.search, hash: location.hash }`.
- The event name passed to `emit` is `'route:changed'`. With an `EventBus`, the bus prefix applies (with `globalEventBus` the stored name is `mfe:global:route:changed`), and subscribers can use `'route:changed'`.

### Example

```tsx
// Host
import { globalEventBus } from '@mfe-forge/core'
import { useRouteSync } from '@mfe-forge/router'

function RouteBroadcaster() {
  useRouteSync(globalEventBus)
  return null
}

// Any remote
useEffect(
  () =>
    globalEventBus.on<{ path: string; search: string; hash: string }>(
      'route:changed',
      ({ path }) => {
        setActive(path.startsWith('/checkout'))
      }
    ),
  []
)
```

::: warning Stable bus reference
Pass a stable object. An inline object (`useRouteSync({ emit: ... })`) is a new dependency on every render, which re-emits the event on every render.
:::

Call it once, in the host. Calling it in several MFEs that share the same router emits duplicate events.

---

## generateRoutes

Turns a registry of scopes into React Router `<Route>` elements.

```ts
function generateRoutes(registry: RouteRegistry): React.JSX.Element[]
```

### Parameters

| Name       | Type                                                | Description                  |
| ---------- | --------------------------------------------------- | ---------------------------- |
| `registry` | `RouteRegistry` (`{ [scope: string]: MFERoute[] }`) | Map of scope name to routes. |

### Return value

An array of `<Route>` elements with:

- `path`: `/<scope>/<route.path>`, where leading/trailing slashes are trimmed from the scope and leading slashes from the route path;
- `element`: `<route.component />` (rendered with no props);
- `key`: `` `${scope}-${route.path}` ``.

Order follows `Object.entries(registry)` and then each array's order.

### Example

```tsx
import { BrowserRouter, Routes } from 'react-router-dom'
import { generateRoutes } from '@mfe-forge/router'

const routes = generateRoutes({
  checkout: [{ path: '/cart', component: CartPage }],
  admin: [{ path: 'dashboard', component: Dashboard }],
})

<BrowserRouter>
  <Routes>{routes}</Routes>
</BrowserRouter>
// → /checkout/cart, /admin/dashboard
```

::: warning Fields that are ignored
`generateRoutes` only reads `path` and `component`. The `exact`, `children` and `lazy` fields of `MFERoute` are **not** used: nested routes are not generated and `lazy` is never called. `component` is required even if you set `lazy`. For nested or lazy routes, write the `<Route>` elements yourself or wrap the component with [`LazyRemote`](./core#lazyremote).
:::

- A route with `path: ''` or `'/'` produces `/<scope>/`.
- A route `path` of `'*'` produces `/<scope>/*`, a valid splat route for the scope.

---

## createRouteGuard

Creates a component that renders its children only when a predicate allows access.

```ts
function createRouteGuard(
  predicate: () => boolean | Promise<boolean>,
  fallback: React.ComponentType<any>
): (props: { children: React.ReactNode }) => React.ReactNode
```

### Parameters

| Name        | Type                                | Description                                               |
| ----------- | ----------------------------------- | --------------------------------------------------------- |
| `predicate` | `() => boolean \| Promise<boolean>` | Sync or async access check.                               |
| `fallback`  | `ComponentType<any>`                | Component rendered (with no props) when access is denied. |

### Behavior

| State             | Rendered         |
| ----------------- | ---------------- |
| Predicate pending | `null` (nothing) |
| Resolved `true`   | `children`       |
| Resolved `false`  | `<fallback />`   |
| Promise rejected  | `<fallback />`   |

- The predicate runs **once per mount**, in an effect. It is not re-evaluated on navigation or when the inputs it reads change; remount the guard (for example with a `key`) to re-check.
- Even a synchronous predicate renders `null` for the first commit, because the result is applied asynchronously.
- If the guard unmounts before the predicate settles, the result is ignored.
- A **synchronous** `throw` from the predicate is not caught: `predicate()` is called before `Promise.resolve`, so the error escapes the effect and goes to the nearest error boundary. Make the predicate `async` (or catch inside it) if it can throw.

### Example

```tsx
import { createRouteGuard } from '@mfe-forge/router'

const AuthGuard = createRouteGuard(async () => {
  const res = await fetch('/api/session')
  return res.ok
}, LoginPage)

<Route
  path="/account"
  element={
    <AuthGuard>
      <Account />
    </AuthGuard>
  }
/>
```

::: tip
Create guards at module scope. Calling `createRouteGuard` inside a component creates a new component type every render, which remounts the guard and re-runs the predicate. The guard always renders nothing while checking; there is no loading prop.
:::

::: warning Not a security boundary
Guards hide UI on the client. Enforce authorization on the server as well.
:::

---

## Types reference

```ts
/** A route for a micro frontend. */
interface MFERoute {
  /** URL path relative to the scope prefix */
  path: string
  /** Component rendered at this route */
  component: ComponentType<any>
  /** Declared but not used by generateRoutes */
  exact?: boolean
  /** Declared but not used by generateRoutes */
  children?: MFERoute[]
  /** Declared but not used by generateRoutes */
  lazy?: () => Promise<{ default: ComponentType<any> }>
}

/** Scope name → routes. */
interface RouteRegistry {
  [scope: string]: MFERoute[]
}

/** Payload emitted by useRouteSync on 'route:changed' (not exported). */
type RouteChangedPayload = { path: string; search: string; hash: string }
```

## See also

- [@mfe-forge/core event bus](./core#eventbus)
- [Concepts](../concepts) · [Architecture](../architecture) · [Troubleshooting](../troubleshooting)
