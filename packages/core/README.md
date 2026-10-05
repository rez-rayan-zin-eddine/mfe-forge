# @mfe-forge/core

> Runtime foundation for MFE Forge micro-frontends: error boundaries, event bus, remote loading, and a remote registry.

Part of the [MFE Forge](https://github.com/rez-rayan-zin-eddine/mfe-forge) project. Pre-1.0 (`0.x`): APIs may change between minor versions.

## Installation

```bash
npm install @mfe-forge/core
# peer dependencies: react@^19, react-dom@^19
```

## Error boundary

```tsx
import { MFErrorBoundary } from '@mfe-forge/core'

<MFErrorBoundary
  remoteName="checkout/cart"
  fallback={({ error }) => <p>Cart unavailable: {error.message}</p>}
  onError={(info) => report(info)}
>
  <CartApp />
</MFErrorBoundary>
```

`fallback` may be a node or a function receiving `{ error, componentStack, remoteName }`. The default fallback renders a retry button and carries `data-testid="mfe-error"` (used by `@mfe-forge/testing`'s E2E helpers).

## Event bus

```ts
import { createEventBus, globalEventBus } from '@mfe-forge/core'

const unsubscribe = globalEventBus.on<{ id: string }>('user:login', (user) => console.log(user.id))
globalEventBus.emit('user:login', { id: '123' })
unsubscribe()

const cartBus = createEventBus({ prefix: 'cart:', debug: true })
cartBus.once('ready', () => {})
```

`EventBus` methods: `on`, `once` (both return an unsubscribe function), `off`, `emit`, `clear`. `globalEventBus` is shared across MFEs loaded into the same page and uses the `mfe:global:` prefix.

## Loading remotes

```tsx
import { LazyRemote, RemoteLoader } from '@mfe-forge/core'

// Static import (preferred: bundler-visible)
const CartApp = LazyRemote(() => import('cartApp/App'), { remoteName: 'checkout/cart' })

// By name at runtime
<RemoteLoader remoteName="cartApp" moduleName="App" props={{ userId }} fallback={<Spinner />} />
```

Both wrap the remote in `Suspense` and `MFErrorBoundary`. `RemoteLoader` caches lazy components per `remoteName/moduleName` in a bounded LRU cache (`MAX_CACHE_SIZE = 100`). Use `clearRemoteComponentCache()`, `evictRemoteComponent(remote, module?)`, `hasRemoteComponent(remote, module?)` and `getRemoteComponentCacheSize()` to manage it — for example to force a reload after a remote is redeployed.

## Remote registry

```ts
import { remoteRegistry } from '@mfe-forge/core'

remoteRegistry.register({ name: 'cartApp', url: 'https://cdn.example.com/cart/remoteEntry.js', environment: 'staging' })
remoteRegistry.setHealth('cartApp', { status: 'ready', attempts: 1 })
remoteRegistry.getHealth('cartApp') // { status: 'ready', attempts: 1 }
```

The registry stores definitions and health state; it does not fetch remotes itself.

## License

MIT
