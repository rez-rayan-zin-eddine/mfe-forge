# @mfe-forge/store

> Shared and scoped Zustand stores for MFE Forge micro-frontends, with event-bus synchronization.

Part of the [MFE Forge](https://github.com/rez-rayan-zin-eddine/mfe-forge) project. Pre-1.0 (`0.x`): APIs may change between minor versions.

## Installation

```bash
npm install @mfe-forge/store
# peer dependency: zustand@^5
```

Share `zustand` (and this package) as a Module Federation singleton so every MFE sees the same global store.

## Global store

```tsx
import { useGlobalStore } from '@mfe-forge/store'

const theme = useGlobalStore((state) => state.theme)
const setTheme = useGlobalStore((state) => state.setTheme)
```

State: `user`, `theme` (`'light' | 'dark' | 'system'`), `locale`, `features`. Actions: `setUser`, `setTheme`, `setLocale`, `toggleFeature`.

## Scoped stores

```tsx
import { createScopedStore } from '@mfe-forge/store'

export const useCartStore = createScopedStore('cart', { items: [] as string[], total: 0 })

const items = useCartStore((state) => state.items)
useCartStore.setState({ total: 42 })
useCartStore.getState().reset() // back to the initial state
```

Each call creates an independent store (with `subscribeWithSelector`). The scope name must be non-empty. `clearScopedStore` is kept only for backwards compatibility and is a no-op — drop references or call `reset()` instead.

## Synchronizing across MFEs

```ts
import { globalEventBus } from '@mfe-forge/core'
import { syncStoreAcrossMFEs } from '@mfe-forge/store'

const unsubscribe = syncStoreAcrossMFEs(useCartStore, globalEventBus, 'cart', 'checkout-mfe')
globalEventBus.on('cart:sync', ({ state, origin }) => { /* ignore your own origin */ })
```

Accepts any Zustand store. Emits `<prefix>:sync` with `{ state, origin }` on every state change; `origin` defaults to a random per-subscription id.

## License

MIT
