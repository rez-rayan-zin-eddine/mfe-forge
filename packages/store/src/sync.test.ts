import { describe, expect, it, vi } from 'vitest'
import { createScopedStore, syncStoreAcrossMFEs, useGlobalStore } from './index.js'

describe('syncStoreAcrossMFEs', () => {
  it('emits prefixed sync events with the new state and origin', () => {
    const store = createScopedStore('cart', { items: 0 })
    const emit = vi.fn()

    syncStoreAcrossMFEs(store, { emit }, 'cart', 'cart-mfe')
    store.setState({ items: 2 })

    expect(emit).toHaveBeenCalledTimes(1)
    const [event, payload] = emit.mock.calls[0]
    expect(event).toBe('cart:sync')
    expect(payload.origin).toBe('cart-mfe')
    expect(payload.state.items).toBe(2)
  })

  it('does not emit when the state reference is unchanged', () => {
    const store = createScopedStore('cart', { items: 0 })
    const emit = vi.fn()

    syncStoreAcrossMFEs(store, { emit }, 'cart')
    store.setState(store.getState())

    expect(emit).not.toHaveBeenCalled()
  })

  it('stops emitting after unsubscribe', () => {
    const store = createScopedStore('cart', { items: 0 })
    const emit = vi.fn()

    const unsubscribe = syncStoreAcrossMFEs(store, { emit }, 'cart')
    store.setState({ items: 1 })
    unsubscribe()
    store.setState({ items: 2 })

    expect(emit).toHaveBeenCalledTimes(1)
  })

  it('generates a stable random origin per subscription when none is given', () => {
    const store = createScopedStore('cart', { items: 0 })
    const emitA = vi.fn()
    const emitB = vi.fn()

    syncStoreAcrossMFEs(store, { emit: emitA }, 'cart')
    syncStoreAcrossMFEs(store, { emit: emitB }, 'cart')
    store.setState({ items: 1 })
    store.setState({ items: 2 })

    const originsA = emitA.mock.calls.map(([, payload]) => payload.origin)
    const originB = emitB.mock.calls[0][1].origin
    expect(originsA[0]).toMatch(/^store-[a-z0-9]+$/)
    expect(originsA[1]).toBe(originsA[0])
    expect(originB).not.toBe(originsA[0])
  })

  it('works with the global store', () => {
    const emit = vi.fn()
    const unsubscribe = syncStoreAcrossMFEs(useGlobalStore, { emit }, 'global', 'host')

    useGlobalStore.getState().setTheme('dark')
    unsubscribe()

    expect(emit).toHaveBeenCalledWith(
      'global:sync',
      expect.objectContaining({ origin: 'host', state: expect.objectContaining({ theme: 'dark' }) })
    )
  })
})
