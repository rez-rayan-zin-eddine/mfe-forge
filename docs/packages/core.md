# @mfe-forge/core

Runtime foundation for MFE Forge micro-frontends: an error boundary built for remotes, components that load remotes with a real retry, a prefix-namespaced event bus, and a small remote registry.

**Version:** 0.1.1 · **Module format:** ESM only · **Node:** `>=20` · **License:** MIT

## When to use it

- You render a remote (federated) component in a host and want a failure in that remote to stay contained instead of unmounting the whole page.
- You need loose, publish/subscribe communication between MFEs that do not import each other.
- You want a place to record which remotes exist and how healthy they are.

It does **not** configure Module Federation, fetch `remoteEntry.js` files, or implement network retry/timeout policies. Those are handled by your bundler setup and the [CLI](../cli/).

## Installation

::: code-group

```bash [npm]
npm install @mfe-forge/core
```

```bash [pnpm]
pnpm add @mfe-forge/core
```

:::

| Peer dependency | Range     |
| --------------- | --------- |
| `react`         | `^19.0.0` |
| `react-dom`     | `^19.0.0` |

The package is marked `sideEffects: false`.

## Import paths

| Specifier                        | Exports                                                       |
| -------------------------------- | ------------------------------------------------------------- |
| `@mfe-forge/core`                | Everything listed on this page                                |
| `@mfe-forge/core/error-boundary` | `MFErrorBoundary`                                             |
| `@mfe-forge/core/event-bus`      | `EventBus`, `createEventBus`, `globalEventBus`                |
| `@mfe-forge/core/loader`         | `RemoteLoader`, `LazyRemote`, `MAX_CACHE_SIZE`, cache helpers |

`RemoteRegistry` and `remoteRegistry` are only available from the root specifier.

::: warning Subpaths and singletons
`globalEventBus` and the remote component cache are module-level singletons. Pick **one** specifier per symbol across your MFEs and share `@mfe-forge/core` as a Module Federation singleton, otherwise different bundles may hold different instances.
:::

### Exports at a glance

| Export                                                                     | Kind                      |
| -------------------------------------------------------------------------- | ------------------------- |
| [`MFErrorBoundary`](#mferrorboundary)                                      | React class component     |
| [`RemoteLoader`](#remoteloader)                                            | React component           |
| [`LazyRemote`](#lazyremote)                                                | Component factory         |
| [`MAX_CACHE_SIZE`](#max-cache-size)                                        | Constant (`100`)          |
| [`getRemoteComponentCacheSize`](#remote-component-cache-helpers)           | Function                  |
| [`hasRemoteComponent`](#remote-component-cache-helpers)                    | Function                  |
| [`evictRemoteComponent`](#remote-component-cache-helpers)                  | Function                  |
| [`clearRemoteComponentCache`](#remote-component-cache-helpers)             | Function                  |
| [`EventBus`](#eventbus)                                                    | Class                     |
| [`createEventBus`](#createeventbus)                                        | Function                  |
| [`globalEventBus`](#globaleventbus)                                        | `EventBus` instance       |
| [`RemoteRegistry`](#remoteregistry)                                        | Class                     |
| [`remoteRegistry`](#remoteregistry)                                        | `RemoteRegistry` instance |
| `MFEErrorInfo`, `RemoteComponentProps`, `RemoteDefinition`, `RemoteHealth` | Types                     |

---

## MFErrorBoundary

A React error boundary that catches render errors thrown by its subtree (typically a remote) and renders a fallback instead of crashing the host.

```ts
class MFErrorBoundary extends React.Component<{
  children: ReactNode
  fallback?: ReactNode | ((error: MFEErrorInfo, reset: () => void) => ReactNode)
  remoteName?: string
  onError?: (info: MFEErrorInfo) => void
  onReset?: () => void
}> {
  reset(): void
}
```

### Props

| Prop         | Type                                                                 | Default                      | Description                                                                                                                             |
| ------------ | -------------------------------------------------------------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `children`   | `ReactNode`                                                          | required                     | Tree to render while no error is present.                                                                                               |
| `fallback`   | `ReactNode \| (error: MFEErrorInfo, reset: () => void) => ReactNode` | built-in accessible fallback | Static element, or render function receiving the error info and a `reset` callback.                                                     |
| `remoteName` | `string`                                                             | `undefined`                  | Identifies the wrapped remote. Copied into `MFEErrorInfo.remoteName`, shown in the default fallback and set as `data-remote-name`.      |
| `onError`    | `(info: MFEErrorInfo) => void`                                       | `undefined`                  | Called once per caught error from `componentDidCatch`. Use it to report to monitoring.                                                  |
| `onReset`    | `() => void`                                                         | `undefined`                  | Called by `reset()` **before** the error state is cleared, so you can discard cached failed state (for example a rejected lazy import). |

### Behavior

1. A render error sets the boundary into the error state (`getDerivedStateFromError`).
2. `componentDidCatch` builds an `MFEErrorInfo` (`error`, `componentStack`, `remoteName`) and calls `onError`.
3. When `process.env.NODE_ENV === 'production'`, the error info is also logged with `console.error('[MFE Error]', info)`. Nothing is logged by the boundary in other modes (React itself still logs in development).
4. Rendering in the error state:
   - `fallback` is a function: `fallback(errorInfo, reset)` is rendered.
   - `fallback` is any other truthy node: it is rendered as is (no access to `reset`).
   - Otherwise the default fallback is rendered.
5. `reset()` calls `onReset?.()` and then clears the error, re-rendering `children`.

### Default fallback and accessibility

The default fallback renders:

- an outer `div.mfe-error-boundary` with `data-testid="mfe-error"` and `data-remote-name`;
- an inner card with `role="alert"`, so screen readers announce the failure immediately;
- a heading "Something went wrong" (the warning emoji is `aria-hidden`);
- "Remote: &lt;name&gt;" when `remoteName` is set, followed by `error.message`;
- a native `<button type="button">Try again</button>` that calls `reset()`.

Styles are inline (red card on a light background), so no CSS import is required.

### Examples

```tsx
import { MFErrorBoundary } from '@mfe-forge/core'

;<MFErrorBoundary
  remoteName="checkout/cart"
  onError={(info) =>
    reportError(info.error, { remote: info.remoteName, stack: info.componentStack })
  }
>
  <CartApp />
</MFErrorBoundary>
```

Custom fallback with retry:

```tsx
<MFErrorBoundary
  remoteName="checkout/cart"
  fallback={({ error, remoteName }, reset) => (
    <div role="alert">
      <p>
        {remoteName} is unavailable: {error.message}
      </p>
      <button type="button" onClick={reset}>
        Retry
      </button>
    </div>
  )}
>
  <CartApp />
</MFErrorBoundary>
```

### Gotchas

::: warning What error boundaries do not catch
Like every React error boundary, it only catches errors thrown during rendering, in lifecycle methods and in constructors of its subtree. Errors in event handlers, timers and unawaited promises are not caught.
:::

- If your custom fallback is a node and not a function, it has no way to reset the boundary. Use the function form to offer a retry.
- `reset()` re-renders the same children. If the failure is deterministic (for example a cached rejected `React.lazy`), the same error is thrown again unless `onReset` clears that state. `RemoteLoader` and `LazyRemote` do this for you.
- `componentStack` in the fallback's `MFEErrorInfo` can be `''` on the first error render, because React supplies it in `componentDidCatch`, after `getDerivedStateFromError`. It is filled on the following render.
- With a custom `fallback`, accessible markup (such as `role="alert"` and a real `<button>`) is your responsibility.

---

## RemoteLoader

Loads and renders a remote module by name at runtime, wrapped in `Suspense` and `MFErrorBoundary`.

```ts
function RemoteLoader(props: RemoteComponentProps): JSX.Element
```

### Props (`RemoteComponentProps`)

| Prop         | Type                  | Default                    | Description                                                                            |
| ------------ | --------------------- | -------------------------- | -------------------------------------------------------------------------------------- |
| `remoteName` | `string`              | required                   | Federated remote name, for example `'checkoutApp'`. Also passed to the error boundary. |
| `moduleName` | `string`              | `'App'`                    | Exposed module to load.                                                                |
| `fallback`   | `ReactNode`           | built-in loading indicator | Suspense fallback shown while the module loads. A falsy value uses the default.        |
| `props`      | `Record<string, any>` | `{}`                       | Props spread onto the loaded component.                                                |

### Behavior

- The component is resolved with ``React.lazy(() => import(`${remoteName}/${moduleName}`))``. The specifier is a bare module id such as `checkoutApp/App`, which must be resolvable at runtime by your Module Federation runtime. The import is marked `@vite-ignore`, so Vite does not analyze it.
- **Caching.** Lazy components are cached per `remoteName/moduleName` key in a module-level LRU map with a capacity of [`MAX_CACHE_SIZE`](#max-cache-size) (100). A cache hit refreshes the entry's recency; inserting the 101st entry evicts the least recently used one. Caching keeps React component identity stable across renders, so the remote is not remounted on every parent render.
- **Lookup at render time.** The cache is read inside an inner component on each render, so an evicted entry is replaced by a fresh `lazy()` on the next render.
- **Retry.** The error boundary's `onReset` evicts the cache entry for this `remoteName`/`moduleName`, so pressing "Try again" triggers a new `import()` instead of re-throwing the rejected promise that `React.lazy` keeps forever.
- **Errors** are caught by `MFErrorBoundary` with the default fallback. `RemoteLoader` does not expose `onError` or a custom error fallback; wrap it in your own `MFErrorBoundary` (or use `LazyRemote`) if you need them.

### Example

```tsx
import { RemoteLoader } from '@mfe-forge/core'

;<RemoteLoader
  remoteName="checkoutApp"
  moduleName="Cart"
  props={{ userId }}
  fallback={<Spinner />}
/>
```

### Gotchas

- No timeout is applied. If the import never settles, the loading fallback stays on screen.
- Retrying re-imports the module specifier. Whether this triggers a fresh network fetch depends on your federation runtime and browser module cache.
- `props` defaults to a new `{}` each render; pass a memoized object if the remote relies on referential equality.

---

## LazyRemote

Creates a component that lazily loads a remote from a factory you provide, with built-in `Suspense`, `MFErrorBoundary` and retry. Prefer it over `RemoteLoader` when the remote is known at build time, because a static `import('remote/Module')` is visible to the bundler.

```ts
function LazyRemote(
  factory: () => Promise<{ default: React.ComponentType<Record<string, unknown>> }>,
  options?: { fallback?: ReactNode; remoteName?: string }
): (props: Record<string, unknown>) => JSX.Element
```

### Parameters

| Name                 | Type                                        | Default                    | Description                                                                            |
| -------------------- | ------------------------------------------- | -------------------------- | -------------------------------------------------------------------------------------- |
| `factory`            | `() => Promise<{ default: ComponentType }>` | required                   | Dynamic import of the remote module. Must resolve to a module with a `default` export. |
| `options.fallback`   | `ReactNode`                                 | built-in loading indicator | Suspense fallback.                                                                     |
| `options.remoteName` | `string`                                    | `undefined`                | Passed to the error boundary and shown in the default loading and error UIs.           |

### Return value

A React component (`LazyRemoteWrapper`) that forwards all of its props to the loaded component.

### Behavior

- `React.lazy(factory)` is created once when `LazyRemote` is called and shared by every instance of the returned component until a retry happens.
- **Retry.** Each rendered instance holds its lazy component in state. On reset, it replaces it with a new `lazy(factory)`, so the factory runs again. The new lazy component is local to the instance that was reset.
- Errors are rendered with the default `MFErrorBoundary` fallback.

### Example

```tsx
import { LazyRemote } from '@mfe-forge/core'

const CartApp = LazyRemote(() => import('checkoutApp/Cart'), {
  remoteName: 'checkout/cart',
  fallback: <CartSkeleton />,
})

<Route path="/cart" element={<CartApp currency="EUR" />} />
```

::: tip
Call `LazyRemote` at module scope, not inside a component body. Calling it during render creates a new component type on every render, which remounts the remote and re-runs the import.
:::

---

## Default loading fallback

Used by `RemoteLoader` and `LazyRemote` when no `fallback` is given:

- `role="status"` with `aria-live="polite"` and `data-testid="mfe-loading"`;
- text "Loading &lt;remoteName&gt;..." (or "Loading component..." when no name is known);
- a spinner marked `aria-hidden="true"` whose animation is disabled under `prefers-reduced-motion: reduce`;
- a minimum height of `200px`, centered.

The `data-testid` values `mfe-loading` and `mfe-error` are used by the [`@mfe-forge/testing`](./testing) end-to-end helpers.

---

## MAX_CACHE_SIZE

```ts
const MAX_CACHE_SIZE = 100
```

Capacity of the `RemoteLoader` LRU cache. Read-only; it cannot be configured.

## Remote component cache helpers

These functions manage the cache used by `RemoteLoader`. They do not affect `LazyRemote`.

```ts
function getRemoteComponentCacheSize(): number
function hasRemoteComponent(remoteName: string, moduleName?: string): boolean
function evictRemoteComponent(remoteName: string, moduleName?: string): boolean
function clearRemoteComponentCache(): void
```

| Function                      | Parameters                         | Returns   | Description                                                            |
| ----------------------------- | ---------------------------------- | --------- | ---------------------------------------------------------------------- |
| `getRemoteComponentCacheSize` | none                               | `number`  | Number of cached entries.                                              |
| `hasRemoteComponent`          | `remoteName`, `moduleName = 'App'` | `boolean` | Whether `remoteName/moduleName` is cached. Does not refresh LRU order. |
| `evictRemoteComponent`        | `remoteName`, `moduleName = 'App'` | `boolean` | Removes one entry; `true` if something was removed.                    |
| `clearRemoteComponentCache`   | none                               | `void`    | Removes all entries.                                                   |

```ts
import { evictRemoteComponent } from '@mfe-forge/core'

// After a remote is redeployed, force the next render to import it again
evictRemoteComponent('checkoutApp', 'Cart')
```

::: warning
Evicting does not re-render anything by itself. Already mounted `RemoteLoader`s keep showing the component they rendered until they render again.
:::

---

## EventBus

A small synchronous publish/subscribe bus for communication between MFEs. Event names are namespaced with a prefix.

```ts
class EventBus {
  constructor(config?: EventBusConfig)
  on<T = any>(event: string, handler: (payload: T) => void): () => void
  once<T = any>(event: string, handler: (payload: T) => void): () => void
  off<T = any>(event: string, handler: (payload: T) => void): void
  emit<T = any>(event: string, payload?: T): void
  clear(event?: string): void
}
```

### Constructor options (`EventBusConfig`)

| Option   | Type      | Default  | Description                                                            |
| -------- | --------- | -------- | ---------------------------------------------------------------------- |
| `debug`  | `boolean` | `false`  | Logs subscriptions and emissions with `console.log('[EventBus] ...')`. |
| `prefix` | `string`  | `'mfe:'` | Prepended to every event name that does not already start with it.     |

### Methods

| Method                  | Returns      | Description                                                                                                               |
| ----------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `on(event, handler)`    | `() => void` | Subscribes `handler`. Returns an unsubscribe function.                                                                    |
| `once(event, handler)`  | `() => void` | Subscribes for a single emission; the handler is removed after it runs. The returned function cancels it before it fires. |
| `off(event, handler)`   | `void`       | Removes that exact handler reference.                                                                                     |
| `emit(event, payload?)` | `void`       | Calls every handler for the event with `payload`.                                                                         |
| `clear(event?)`         | `void`       | Removes all handlers for one event, or every handler when called without an argument.                                     |

### Semantics

- **Prefixing.** `getEventName(event)` returns `event` unchanged if it already starts with the prefix, otherwise `prefix + event`. With the default prefix, `on('cart:updated')` and `on('mfe:cart:updated')` refer to the same event.
- **Synchronous delivery.** `emit` calls handlers synchronously, in subscription order, before returning. There is no queue, replay or "sticky" last value: handlers subscribed after an emit do not receive it.
- **Isolation of failures.** An exception thrown by a handler is caught and logged with `console.error`; remaining handlers still run and `emit` does not throw.
- **Deduplication.** Handlers are stored in a `Set`, so subscribing the same function reference twice to the same event registers it once, and a single unsubscribe removes it.
- **No wildcards.** Event names are matched exactly (after prefixing).
- **Typing.** `T` is not checked against the event name; it is a per-call annotation.

### Example

```ts
import { EventBus } from '@mfe-forge/core'

const bus = new EventBus({ prefix: 'shop:', debug: import.meta.env.DEV })

const unsubscribe = bus.on<{ id: string; qty: number }[]>('cart:updated', (items) => {
  render(items)
})

bus.emit('cart:updated', [{ id: 'sku-1', qty: 2 }])
unsubscribe()
```

### Gotchas

- `off` needs the same handler reference that was passed to `on`. It cannot remove a handler registered with `once`, because `once` wraps it; use the function `once` returns.
- Always call the unsubscribe function in React effect cleanups to avoid leaks and duplicate handling under `StrictMode`:

  ```tsx
  useEffect(() => globalEventBus.on('user:login', handleLogin), [])
  ```

- `prefix: ''` disables namespacing entirely.

## createEventBus

```ts
function createEventBus(config?: EventBusConfig): EventBus
```

Equivalent to `new EventBus(config)`. Use it to create a bus scoped to one MFE or feature.

```ts
const cartBus = createEventBus({ prefix: 'cart:' })
cartBus.once('ready', () => console.log('cart ready'))
```

## globalEventBus

```ts
const globalEventBus: EventBus // prefix 'mfe:global:', debug false
```

A shared singleton for cross-MFE events. It is only shared between MFEs that receive the same module instance, which requires sharing `@mfe-forge/core` as a singleton in Module Federation.

```ts
import { globalEventBus } from '@mfe-forge/core'

globalEventBus.on<{ id: string }>('user:login', (user) => console.log(user.id))
globalEventBus.emit('user:login', { id: '123' })
```

It pairs with [`useRouteSync`](./router#useroutesync) and [`syncStoreAcrossMFEs`](./store#syncstoreacrossmfes).

---

## RemoteRegistry

An in-memory store of remote definitions and their health. It does **not** fetch, load or probe remotes, and `RemoteLoader` / `LazyRemote` do not read from it. You update health yourself, for example from an `onError` callback.

```ts
class RemoteRegistry {
  register(definition: RemoteDefinition): void
  get(name: string): RemoteDefinition | undefined
  setHealth(name: string, health: RemoteHealth): void
  getHealth(name: string): RemoteHealth
  clear(name?: string): void
}

const remoteRegistry: RemoteRegistry
```

| Method                    | Description                                                                                                                                   |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `register(definition)`    | Stores the definition under `definition.name`, replacing any existing one, and **resets** its health to `{ status: 'unknown', attempts: 0 }`. |
| `get(name)`               | Returns the definition or `undefined`.                                                                                                        |
| `setHealth(name, health)` | Replaces the health record. Works even for names that were never registered.                                                                  |
| `getHealth(name)`         | Returns the health record, or `{ status: 'unknown', attempts: 0 }` if none exists.                                                            |
| `clear(name?)`            | Removes the definition and health for `name`, or everything when called without an argument.                                                  |

```ts
import { MFErrorBoundary, remoteRegistry } from '@mfe-forge/core'

remoteRegistry.register({
  name: 'cartApp',
  url: 'https://cdn.example.com/cart/remoteEntry.js',
  environment: 'staging',
})

<MFErrorBoundary
  remoteName="cartApp"
  onError={({ error }) => {
    const { attempts } = remoteRegistry.getHealth('cartApp')
    remoteRegistry.setHealth('cartApp', { status: 'failed', attempts: attempts + 1, error })
  }}
>
  <CartApp />
</MFErrorBoundary>
```

::: tip
`remoteRegistry` is a module-level singleton. Create your own `new RemoteRegistry()` in tests or when you need isolated registries.
:::

---

## Types reference

```ts
/** Information about an error caught by MFErrorBoundary. */
interface MFEErrorInfo {
  componentStack: string
  error: Error
  remoteName?: string
}

/** Props for RemoteLoader. */
interface RemoteComponentProps {
  remoteName: string
  moduleName?: string // default 'App'
  fallback?: ReactNode
  props?: Record<string, any>
}

interface RemoteDefinition {
  name: string
  url: string
  environment?: string
}

interface RemoteHealth {
  status: 'unknown' | 'loading' | 'ready' | 'failed'
  attempts: number
  error?: Error
}

/** Not exported from the package; shown for reference. */
interface EventBusConfig {
  debug?: boolean // default false
  prefix?: string // default 'mfe:'
}

/** Not exported from the package; shown for reference. */
type EventHandler<T = any> = (payload: T) => void
```

::: info
`EventBusConfig`, `EventHandler` and the `MFErrorBoundary` props interface are not exported. Derive them when needed:

```ts
type EventBusConfig = NonNullable<ConstructorParameters<typeof EventBus>[0]>
type BoundaryProps = React.ComponentProps<typeof MFErrorBoundary>
```

:::

## See also

- [Concepts](../concepts) and [Architecture](../architecture)
- [@mfe-forge/router](./router) · [@mfe-forge/store](./store) · [@mfe-forge/testing](./testing)
- [Troubleshooting](../troubleshooting)
