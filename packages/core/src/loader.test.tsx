// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import {
  LazyRemote,
  MAX_CACHE_SIZE,
  RemoteLoader,
  clearRemoteComponentCache,
  evictRemoteComponent,
  getRemoteComponentCacheSize,
  hasRemoteComponent,
} from './loader.js'

function Greeting(props: Record<string, unknown>) {
  return <p>hello {String(props.name ?? 'world')}</p>
}

/** RemoteLoader has no hooks, so calling it registers the lazy component without importing it. */
function touch(remoteName: string, moduleName?: string) {
  RemoteLoader({ remoteName, moduleName })
}

describe('RemoteLoader component cache', () => {
  beforeEach(() => clearRemoteComponentCache())

  it('caches one lazy component per remote/module pair', () => {
    touch('cartApp')
    touch('cartApp')
    touch('cartApp', 'Widget')

    expect(getRemoteComponentCacheSize()).toBe(2)
    expect(hasRemoteComponent('cartApp')).toBe(true)
    expect(hasRemoteComponent('cartApp', 'Widget')).toBe(true)
    expect(hasRemoteComponent('profileApp')).toBe(false)
  })

  it('evicts individual entries and clears the cache', () => {
    touch('cartApp')
    touch('profileApp')

    expect(evictRemoteComponent('cartApp')).toBe(true)
    expect(evictRemoteComponent('cartApp')).toBe(false)
    expect(getRemoteComponentCacheSize()).toBe(1)

    clearRemoteComponentCache()
    expect(getRemoteComponentCacheSize()).toBe(0)
  })

  it('evicts the least recently used entry when the cache is full', () => {
    for (let i = 0; i < MAX_CACHE_SIZE; i++) touch(`remote${i}`)
    expect(getRemoteComponentCacheSize()).toBe(MAX_CACHE_SIZE)

    // Refresh remote0 so remote1 becomes the oldest entry.
    touch('remote0')
    touch('overflow')

    expect(getRemoteComponentCacheSize()).toBe(MAX_CACHE_SIZE)
    expect(hasRemoteComponent('remote0')).toBe(true)
    expect(hasRemoteComponent('remote1')).toBe(false)
    expect(hasRemoteComponent('overflow')).toBe(true)
  })
})

describe('LazyRemote', () => {
  afterEach(() => cleanup())

  it('shows the fallback while loading, then renders the remote with props', async () => {
    const Remote = LazyRemote(() => Promise.resolve({ default: Greeting }), {
      fallback: <span>loading…</span>,
    })

    render(<Remote name="mfe" />)

    expect(screen.getByText('loading…')).toBeTruthy()
    expect(await screen.findByText('hello mfe')).toBeTruthy()
  })

  it('uses the default fallback naming the remote', () => {
    const Remote = LazyRemote(() => new Promise(() => {}), { remoteName: 'checkout/cart' })

    render(<Remote />)

    expect(screen.getByText('Loading checkout/cart...')).toBeTruthy()
  })

  it('renders the error boundary when the remote fails to load', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const Remote = LazyRemote(() => Promise.reject(new Error('remoteEntry.js 404')), {
      remoteName: 'checkout/cart',
    })

    render(<Remote />)

    expect(await screen.findByText('remoteEntry.js 404')).toBeTruthy()
    expect(screen.getByText('Remote: checkout/cart')).toBeTruthy()
    consoleError.mockRestore()
  })
})
