# @mfe-forge/router

> Cross-scope navigation, route-change events, route generation, and guards for MFE Forge, built on React Router 7.

Part of the [MFE Forge](https://github.com/rez-rayan-zin-eddine/mfe-forge) project. Pre-1.0 (`0.x`): APIs may change between minor versions.

## Installation

```bash
npm install @mfe-forge/router
# peer dependencies: react@^19, react-dom@^19, react-router-dom@^7
```

All hooks must be used inside a React Router context (e.g. `<BrowserRouter>`).

## Navigating between MFEs

```tsx
import { useMFENavigation } from '@mfe-forge/router'

const { navigateTo, getCurrentScope, getCurrentPath } = useMFENavigation()
navigateTo('checkout', '/cart') // → /checkout/cart (slashes are normalized)
getCurrentScope()               // first path segment, or 'host' at '/'
```

## Broadcasting route changes

```tsx
import { globalEventBus } from '@mfe-forge/core'
import { useRouteSync } from '@mfe-forge/router'

useRouteSync(globalEventBus) // emits 'route:changed' with { path, search, hash } on every location change
```

## Generating routes from a registry

```tsx
import { Routes } from 'react-router-dom'
import { generateRoutes } from '@mfe-forge/router'

<Routes>
  {generateRoutes({
    checkout: [{ path: '/cart', component: CartPage }],
    admin: [{ path: '/dashboard', component: Dashboard }],
  })}
</Routes>
// → /checkout/cart, /admin/dashboard
```

## Guards

```tsx
import { createRouteGuard } from '@mfe-forge/router'

const AuthGuard = createRouteGuard(async () => (await fetchSession()).ok, LoginPage)

<AuthGuard><Account /></AuthGuard>
```

The predicate may be sync or async. Nothing is rendered while it resolves; a `false` result or a rejected promise renders the fallback.

## License

MIT
