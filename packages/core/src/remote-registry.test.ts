import { describe, expect, it } from 'vitest'
import { RemoteRegistry, remoteRegistry } from './remote-registry.js'

describe('RemoteRegistry', () => {
  it('registers definitions with an initial unknown health state', () => {
    const registry = new RemoteRegistry()
    registry.register({ name: 'cartApp', url: 'http://localhost:3001/assets/remoteEntry.js' })

    expect(registry.get('cartApp')).toEqual({
      name: 'cartApp',
      url: 'http://localhost:3001/assets/remoteEntry.js',
    })
    expect(registry.getHealth('cartApp')).toEqual({ status: 'unknown', attempts: 0 })
  })

  it('re-registering replaces the definition and resets health', () => {
    const registry = new RemoteRegistry()
    registry.register({ name: 'cartApp', url: 'http://a/remoteEntry.js' })
    registry.setHealth('cartApp', { status: 'ready', attempts: 1 })
    registry.register({ name: 'cartApp', url: 'http://b/remoteEntry.js', environment: 'staging' })

    expect(registry.get('cartApp')?.url).toBe('http://b/remoteEntry.js')
    expect(registry.get('cartApp')?.environment).toBe('staging')
    expect(registry.getHealth('cartApp').status).toBe('unknown')
  })

  it('tracks health transitions including failures', () => {
    const registry = new RemoteRegistry()
    const error = new Error('timeout')
    registry.register({ name: 'cartApp', url: 'http://a/remoteEntry.js' })
    registry.setHealth('cartApp', { status: 'loading', attempts: 1 })
    registry.setHealth('cartApp', { status: 'failed', attempts: 2, error })

    expect(registry.getHealth('cartApp')).toEqual({ status: 'failed', attempts: 2, error })
  })

  it('returns defaults for unknown remotes', () => {
    const registry = new RemoteRegistry()

    expect(registry.get('missing')).toBeUndefined()
    expect(registry.getHealth('missing')).toEqual({ status: 'unknown', attempts: 0 })
  })

  it('clears a single remote or the whole registry', () => {
    const registry = new RemoteRegistry()
    registry.register({ name: 'a', url: 'http://a' })
    registry.register({ name: 'b', url: 'http://b' })

    registry.clear('a')
    expect(registry.get('a')).toBeUndefined()
    expect(registry.get('b')).toBeDefined()

    registry.clear()
    expect(registry.get('b')).toBeUndefined()
  })

  it('exports a shared singleton instance', () => {
    expect(remoteRegistry).toBeInstanceOf(RemoteRegistry)
  })
})
