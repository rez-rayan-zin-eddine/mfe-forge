# @mfe-forge/store

Shared state for MFE Forge micro-frontends on top of Zustand 5: one global store for cross-cutting state, a factory for per-MFE scoped stores, and a helper that broadcasts store changes over an event bus.

**Version:** 0.1.1 · **Module format:** ESM only · **Node:** `>=20` · **License:** MIT

## When to use it

- Several MFEs need the same user, theme, locale or feature-flag values.
- Each MFE wants its own small store with a built-in `reset()`.
- Other MFEs (possibly not sharing the module instance) should be notified when a store changes.

## Installation

::: code-group

```bash [npm]
npm install @mfe-forge/store
```

```bash [pnpm]
pnpm add @mfe-forge/store
```

:::

| Peer dependency | Range    |
| --------------- | -------- |
| `zustand`       | `^5.0.0` |

React is not a declared peer dependency, but the stores are Zustand React hooks (`create` from `zustand`), so using them as hooks requires React in your app.

::: warning Share it as a singleton
`useGlobalStore` is created when the module is evaluated. Every MFE sees the same global state only if `zustand` and `@mfe-forge/store` are shared as Module Federation singletons. Otherwise each bundle has its own copy.
:::

## Import paths

Only the root entry is published:

```ts
import {
  useGlobalStore,
  createScopedStore,
  clearScopedStore,
  syncStoreAcrossMFEs,
  type SyncableStore,
} from '@mfe-forge/store'
```

---

## useGlobalStore

```ts
const useGlobalStore: UseBoundStore<
  Mutate<StoreApi<GlobalState>, [['zustand/subscribeWithSelector', never]]>
>
```

A Zustand store created with the `subscribeWithSelector` middleware. Use it as a hook with a selector, or through the store API (`getState`, `setState`, `subscribe`).

### State

| Key        | Type                                                                                           | Initial value | Description       |
| ---------- | ---------------------------------------------------------------------------------------------- | ------------- | ----------------- |
| `user`     | `{ id: string \| null; name: string \| null; email: string \| null; roles: string[] } \| null` | `null`        | Current user.     |
| `theme`    | `'light' \| 'dark' \| 'system'`                                                                | `'system'`    | Theme preference. |
| `locale`   | `string`                                                                                       | `'en'`        | Locale tag.       |
| `features` | `Record<string, boolean>`                                                                      | `{}`          | Feature flags.    |

### Actions

| Action          | Signature                                        | Behavior                                                                               |
| --------------- | ------------------------------------------------ | -------------------------------------------------------------------------------------- |
| `setUser`       | `(user: GlobalState['user']) => void`            | Replaces `user` (pass `null` to sign out).                                             |
| `setTheme`      | `(theme: 'light' \| 'dark' \| 'system') => void` | Sets `theme`.                                                                          |
| `setLocale`     | `(locale: string) => void`                       | Sets `locale`.                                                                         |
| `toggleFeature` | `(key: string) => void`                          | Flips `features[key]`. An unknown key becomes `true`. Creates a new `features` object. |

### Examples

```tsx
import { useGlobalStore } from '@mfe-forge/store'

function ThemeToggle() {
  const theme = useGlobalStore((s) => s.theme)
  const setTheme = useGlobalStore((s) => s.setTheme)
  return (
    <button type="button" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>
      Toggle theme
    </button>
  )
}
```

Outside React, or with a selector subscription:

```ts
useGlobalStore.getState().setLocale('fr')

const unsubscribe = useGlobalStore.subscribe(
  (s) => s.theme,
  (theme) => {
    document.documentElement.dataset.theme = theme
  }
)
```

### Gotchas

- State is in memory only: nothing is persisted, and the initial values do not read the system theme or browser locale.
- `theme: 'system'` is only a value; resolving it to light or dark is up to you.
- Calling `useGlobalStore()` without a selector subscribes the component to every change. Prefer narrow selectors.
- The `GlobalState` type is not exported. Use `ReturnType<typeof useGlobalStore.getState>` to reference it.

---

## createScopedStore

Creates an independent Zustand store for one MFE, with a `reset()` action.

```ts
function createScopedStore<T extends object>(
  scope: string,
  initialState: T
): UseBoundStore<Mutate<StoreApi<ScopedState<T>>, [['zustand/subscribeWithSelector', never]]>>

type ScopedState<T> = Widen<T> & { reset: () => void }
```

### Parameters

| Name           | Type               | Description                                                 |
| -------------- | ------------------ | ----------------------------------------------------------- |
| `scope`        | `string`           | Name of the scope. Must contain a non-whitespace character. |
| `initialState` | `T extends object` | Initial state. Its keys are spread into the store.          |

### Return value

A Zustand hook with the store API (`getState`, `setState`, `subscribe` with selector support, `getInitialState`). State is `initialState` plus `reset()`.

### Behavior

- Throws `Error('Store scope must not be empty')` when `scope.trim()` is empty.
- Apart from that validation, `scope` is **not used**: it does not namespace, register or deduplicate stores. Two calls with the same scope return two independent stores.
- `reset()` calls `set(initialState)`, which **merges** the initial values back in. Keys you added later with `setState` that are not in `initialState` stay.
- `reset()` restores the original object references. If you mutated nested objects or arrays from `initialState` in place, those mutations are not undone. Always update immutably.
- **Type widening.** Array types are widened so that an empty literal does not lock the type: `items: []` becomes `unknown[]` instead of `never[]`. Annotate for precise types, for example `{ items: [] as CartItem[] }`.

### Example

```tsx
import { createScopedStore } from '@mfe-forge/store'

interface CartItem {
  id: string
  qty: number
}

export const useCartStore = createScopedStore('cart', {
  items: [] as CartItem[],
  total: 0,
})

// In components
const items = useCartStore((s) => s.items)

// Anywhere
useCartStore.setState((s) => ({ items: [...s.items, { id: 'sku-1', qty: 1 }] }))
useCartStore.getState().reset()
```

::: tip
Define the store at module scope and export it. Calling `createScopedStore` inside a component creates a new store on every render.
:::

---

## clearScopedStore

```ts
function clearScopedStore(scope?: string): void
```

::: warning Deprecated no-op
Kept only for backwards compatibility. It does nothing. Drop references to a scoped store to let it be garbage-collected, or call `store.getState().reset()` to restore initial state.
:::

---

## syncStoreAcrossMFEs

Emits an event on every state change of a store.

```ts
function syncStoreAcrossMFEs<T>(
  store: SyncableStore<T>,
  eventBus: { emit: (event: string, payload: { state: T; origin: string }) => void },
  eventPrefix: string,
  origin?: string
): () => void
```

### Parameters

| Name          | Type                       | Default                 | Description                                                                                                        |
| ------------- | -------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `store`       | `SyncableStore<T>`         | required                | Any object with `getState()` and `subscribe(listener)`. Every Zustand store (global, scoped or vanilla) qualifies. |
| `eventBus`    | `{ emit(event, payload) }` | required                | Usually `globalEventBus` or an `EventBus` from `@mfe-forge/core`.                                                  |
| `eventPrefix` | `string`                   | required                | Event name prefix; the event is `` `${eventPrefix}:sync` ``.                                                       |
| `origin`      | `string`                   | `` `store-${random}` `` | Identifies the sender. The default is a random id generated per call.                                              |

### Return value

The store's unsubscribe function. Call it to stop emitting.

### Behavior

- Subscribes with `store.subscribe` and, on every change, calls ``eventBus.emit(`${eventPrefix}:sync`, { state, origin })`` synchronously. `state` is the full new state object (including action functions).
- Nothing is emitted on subscription; only subsequent changes are sent.
- It is **one-way**. There is no built-in receiver: applying incoming state to another store, and ignoring your own `origin` to avoid loops, is up to you.
- If an `EventBus` is used, its prefix still applies (`cart:sync` on `globalEventBus` is stored as `mfe:global:cart:sync`).

### Example: two-way sync with loop protection

```ts
import { globalEventBus } from '@mfe-forge/core'
import { syncStoreAcrossMFEs } from '@mfe-forge/store'
import { useCartStore } from './cart-store'

const ORIGIN = 'checkout-mfe'

const stopSending = syncStoreAcrossMFEs(useCartStore, globalEventBus, 'cart', ORIGIN)

const stopReceiving = globalEventBus.on<{
  state: { items: unknown[]; total: number }
  origin: string
}>('cart:sync', ({ state, origin }) => {
  if (origin === ORIGIN) return
  const { items, total } = state
  useCartStore.setState({ items, total } as never) // apply data only, not actions
})
```

::: warning Echo loops
Applying a received state with `setState` triggers the local subscription, which emits again with **your** origin. If two MFEs both sync and both apply, they ping-pong. Guard against it, for example by comparing values before calling `setState`, or by using a flag while applying remote updates.
:::

- Payloads are passed by reference on an in-page bus. Do not mutate them.
- The bus does not serialize anything, so functions in `state` are delivered as is. If you bridge the event to `postMessage` or `BroadcastChannel`, strip the actions first.

---

## Types reference

```ts
/** Minimal store contract accepted by syncStoreAcrossMFEs. */
interface SyncableStore<T> {
  getState(): T
  subscribe(listener: (state: T) => void): () => void
}

/** Global state (not exported; use ReturnType<typeof useGlobalStore.getState>). */
interface GlobalState {
  user: { id: string | null; name: string | null; email: string | null; roles: string[] } | null
  theme: 'light' | 'dark' | 'system'
  locale: string
  features: Record<string, boolean>
  setUser: (user: GlobalState['user']) => void
  setTheme: (theme: GlobalState['theme']) => void
  setLocale: (locale: string) => void
  toggleFeature: (key: string) => void
}

/** Internal helper types used by createScopedStore (not exported). */
type Widen<T> =
  T extends Array<infer Item>
    ? [Item] extends [never]
      ? unknown[]
      : Item[]
    : T extends object
      ? { [K in keyof T]: Widen<T[K]> }
      : T
type ScopedState<T> = Widen<T> & { reset: () => void }
```

## See also

- [@mfe-forge/core event bus](./core#eventbus) · [@mfe-forge/router](./router)
- [Concepts](../concepts) · [Architecture](../architecture) · [Troubleshooting](../troubleshooting)
