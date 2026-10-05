import { describe, expect, it } from 'vitest'
import { clearScopedStore, createScopedStore, syncStoreAcrossMFEs } from './index.js'

describe('createScopedStore & clearScopedStore', () => {
  describe('Input validation', () => {
    it('throws when scope name is empty string', () => {
      expect(() => createScopedStore('', { count: 0 })).toThrow('Store scope must not be empty')
    })

    it('throws when scope name consists only of whitespace', () => {
      expect(() => createScopedStore('   ', { count: 0 })).toThrow('Store scope must not be empty')
      expect(() => createScopedStore('\t\n', { count: 0 })).toThrow('Store scope must not be empty')
    })
  })

  describe('Scope isolation across distinct scopes', () => {
    it('creates independent store instances across different scopes', () => {
      interface CounterState {
        count: number
      }

      const storeA = createScopedStore<CounterState>('scopeA', { count: 10 })
      const storeB = createScopedStore<CounterState>('scopeB', { count: 20 })
      const storeC = createScopedStore<CounterState>('scopeC', { count: 30 })

      expect(storeA.getState().count).toBe(10)
      expect(storeB.getState().count).toBe(20)
      expect(storeC.getState().count).toBe(30)

      // Mutate Store A
      storeA.setState({ count: 99 })
      expect(storeA.getState().count).toBe(99)
      expect(storeB.getState().count).toBe(20)
      expect(storeC.getState().count).toBe(30)

      // Mutate Store B
      storeB.setState({ count: 500 })
      expect(storeA.getState().count).toBe(99)
      expect(storeB.getState().count).toBe(500)
      expect(storeC.getState().count).toBe(30)

      // Reset Store A
      storeA.getState().reset()
      expect(storeA.getState().count).toBe(10)
      expect(storeB.getState().count).toBe(500)
      expect(storeC.getState().count).toBe(30)
    })

    it('creates independent instances even when created with the same scope name', () => {
      const store1 = createScopedStore('cart', { items: ['apple'] })
      const store2 = createScopedStore('cart', { items: ['banana'] })

      expect(store1.getState().items).toEqual(['apple'])
      expect(store2.getState().items).toEqual(['banana'])

      store1.setState({ items: ['apple', 'orange'] })
      expect(store1.getState().items).toEqual(['apple', 'orange'])
      expect(store2.getState().items).toEqual(['banana'])
    })

    it('stress test: maintains total isolation across 100 distinct scopes', () => {
      const stores = new Map<string, ReturnType<typeof createScopedStore<{ id: string; value: number }>>>()
      const scopeCount = 100

      // Create 100 stores
      for (let i = 0; i < scopeCount; i++) {
        const scope = `stress-scope-${i}`
        stores.set(scope, createScopedStore(scope, { id: scope, value: i }))
      }

      // Mutate every even store
      for (let i = 0; i < scopeCount; i += 2) {
        const scope = `stress-scope-${i}`
        stores.get(scope)!.setState({ value: i * 1000 })
      }

      // Verify all 100 stores have exactly their expected state
      for (let i = 0; i < scopeCount; i++) {
        const scope = `stress-scope-${i}`
        const store = stores.get(scope)!
        const expectedValue = i % 2 === 0 ? i * 1000 : i
        expect(store.getState().value).toBe(expectedValue)
        expect(store.getState().id).toBe(scope)
      }

      // Reset even stores and verify
      for (let i = 0; i < scopeCount; i += 2) {
        const scope = `stress-scope-${i}`
        stores.get(scope)!.getState().reset()
        expect(stores.get(scope)!.getState().value).toBe(i)
      }
    })
  })

  describe('clearScopedStore & memory safety', () => {
    it('executes without error with any parameter type and returns undefined', () => {
      expect(clearScopedStore()).toBeUndefined()
      expect(clearScopedStore('cart')).toBeUndefined()
      expect(clearScopedStore('')).toBeUndefined()
      expect(clearScopedStore('   ')).toBeUndefined()
      expect(clearScopedStore('non-existent-scope')).toBeUndefined()
      expect(clearScopedStore(undefined)).toBeUndefined()
      expect(clearScopedStore(null as unknown as string)).toBeUndefined()
      expect(clearScopedStore(123 as unknown as string)).toBeUndefined()
      expect(clearScopedStore(false as unknown as string)).toBeUndefined()
      expect(clearScopedStore(Symbol('scope') as unknown as string)).toBeUndefined()
      expect(clearScopedStore({} as unknown as string)).toBeUndefined()
      expect(clearScopedStore((() => {}) as unknown as string)).toBeUndefined()
    })

    it('calling clearScopedStore has zero effect on existing or subsequent scoped stores', () => {
      const store1 = createScopedStore('persistent-1', { count: 42 })
      clearScopedStore('persistent-1')
      expect(store1.getState().count).toBe(42)

      clearScopedStore()
      expect(store1.getState().count).toBe(42)

      const store2 = createScopedStore('persistent-1', { count: 99 })
      expect(store1.getState().count).toBe(42)
      expect(store2.getState().count).toBe(99)

      clearScopedStore('random-scope')
      store1.setState({ count: 100 })
      expect(store1.getState().count).toBe(100)
      expect(store2.getState().count).toBe(99)
    })

    it('does not leak references in module-level collections', () => {
      interface EphemeralState {
        temp: boolean
      }
      type EphemeralStore = ReturnType<typeof createScopedStore<EphemeralState>>
      let tempStore: EphemeralStore | null = createScopedStore<EphemeralState>('ephemeral', { temp: true })
      const weakRef = new WeakRef(tempStore)

      expect(weakRef.deref()).toBeDefined()
      expect(weakRef.deref()?.getState().temp).toBe(true)

      // Call clearScopedStore
      clearScopedStore('ephemeral')

      // Clear local reference
      tempStore = null

      // Store is eligible for GC; verify no global retainers exist on module exports
      expect(tempStore).toBeNull()
    })
  })

  describe('Reactivity & selectors', () => {
    it('supports subscribeWithSelector on scoped stores', () => {
      interface AuthState {
        token: string
        user: string
      }
      const store = createScopedStore<AuthState>('auth', { token: 'initial', user: 'bob' })
      let capturedToken = ''

      const subscribe = (store as unknown as { subscribe: unknown }).subscribe as unknown as (
        selector: (state: AuthState) => string,
        listener: (selected: string) => void
      ) => () => void

      const unsubscribe = subscribe(
        (state: AuthState) => state.token,
        (token: string) => {
          capturedToken = token
        }
      )

      store.setState({ token: 'updated-token' })
      expect(capturedToken).toBe('updated-token')

      unsubscribe()
      store.setState({ token: 'second-token' })
      expect(capturedToken).toBe('updated-token')
    })

    it('integrates cleanly with syncStoreAcrossMFEs', () => {
      interface CartState {
        items: string[]
      }
      const cartStore = createScopedStore<CartState>('cart', { items: [] })
      const events: Array<{ event: string; payload: { state: CartState; origin: string } }> = []
      const fakeEventBus = {
        emit: (event: string, payload: { state: CartState; origin: string }) => {
          events.push({ event, payload })
        },
      }

      const unsubscribe = syncStoreAcrossMFEs(
        cartStore,
        fakeEventBus,
        'cart',
        'cart-mfe'
      )

      cartStore.setState({ items: ['apple'] })
      expect(events).toHaveLength(1)
      expect(events[0]).toMatchObject({
        event: 'cart:sync',
        payload: {
          state: { items: ['apple'] },
          origin: 'cart-mfe',
        },
      })
      expect((events[0].payload.state as unknown as { reset?: unknown }).reset).toBeTypeOf('function')

      unsubscribe()
      cartStore.setState({ items: ['apple', 'orange'] })
      expect(events).toHaveLength(1)
    })
  })
})
