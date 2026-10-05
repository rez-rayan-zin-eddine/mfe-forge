import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'

/**
 * Shape of the global shared state accessible to all MFEs.
 * Contains user info, theme, locale, and feature flags.
 */
interface GlobalState {
  user: {
    id: string | null
    name: string | null
    email: string | null
    roles: string[]
  } | null
  theme: 'light' | 'dark' | 'system'
  locale: string
  features: Record<string, boolean>
  setUser: (user: GlobalState['user']) => void
  setTheme: (theme: GlobalState['theme']) => void
  setLocale: (locale: string) => void
  toggleFeature: (key: string) => void
}

/**
 * Global Zustand store shared across all micro frontends.
 * Uses `subscribeWithSelector` middleware for fine-grained subscriptions.
 *
 * @example
 * ```tsx
 * const user = useGlobalStore((state) => state.user)
 * const setTheme = useGlobalStore((state) => state.setTheme)
 * ```
 */
export const useGlobalStore = create<GlobalState>()(
  subscribeWithSelector((set) => ({
    user: null,
    theme: 'system',
    locale: 'en',
    features: {},
    setUser: (user) => set({ user }),
    setTheme: (theme) => set({ theme }),
    setLocale: (locale) => set({ locale }),
    toggleFeature: (key) =>
      set((state) => ({
        features: { ...state.features, [key]: !state.features[key] },
      })),
  }))
)

/**
 * Factory function to create a scoped Zustand store for an individual MFE.
 * Includes a `reset()` action to restore initial state.
 *
 * @param scope - Scope name for the store (used for namespacing)
 * @param initialState - Initial state object
 * @returns Zustand hook for the scoped store
 *
 * @example
 * ```tsx
 * const useCartStore = createScopedStore('cart', { items: [], total: 0 })
 * const items = useCartStore((state) => state.items)
 * ```
 */
type Widen<T> = T extends Array<infer Item> ? ([Item] extends [never] ? unknown[] : Item[]) : T extends object ? { [K in keyof T]: Widen<T[K]> } : T
type ScopedStore<T extends object> = Omit<ReturnType<typeof create<T & { reset: () => void }>>, 'setState' | 'getState'> & {
  setState: (state: Partial<Widen<T>>) => void
  getState: () => Widen<T> & { reset: () => void }
}

const scopedScopes = new Set<string>()

export function createScopedStore<T extends object>(scope: string, initialState: T): ScopedStore<T> {
  if (!scope.trim()) throw new Error('Store scope must not be empty')
  scopedScopes.add(scope)
  const store = create<T & { reset: () => void }>()(subscribeWithSelector((set) => ({ ...initialState, reset: () => set(initialState) })))
  return store as unknown as ScopedStore<T>
}

export function clearScopedStore(scope?: string): void {
  if (scope) scopedScopes.delete(scope)
  else scopedScopes.clear()
}


/**
 * Synchronizes a Zustand store's state changes with an event bus.
 * Emits a sync event whenever the store state changes, enabling
 * other MFEs to react to state updates.
 *
 * @param store - Zustand store with `subscribe` method
 * @param eventBus - EventBus instance to emit sync events on
 * @param eventPrefix - Prefix for the sync event name (e.g., 'cart' → 'cart:sync')
 * @returns Unsubscribe function
 */
export function syncStoreAcrossMFEs<T>(
  store: { subscribe: (selector: (state: T) => T, callback: (state: T) => void) => () => void },
  eventBus: { emit: (event: string, payload: { state: T; origin: string }) => void },
  eventPrefix: string,
  origin = `store-${Math.random().toString(36).slice(2)}`
) {
  return store.subscribe((state: T) => state, (state: T) => { eventBus.emit(`${eventPrefix}:sync`, { state, origin }) })
}
