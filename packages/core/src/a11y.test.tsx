// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import axe from 'axe-core'
import { LazyRemote } from './loader.js'
import { MFErrorBoundary } from './error-boundary.js'

async function expectNoAxeViolations(container: HTMLElement) {
  // color-contrast needs real layout, which jsdom does not provide
  const results = await axe.run(container, { rules: { 'color-contrast': { enabled: false } } })
  expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([])
}

const Greeting = () => <h1>loaded</h1>

describe('accessible fallbacks', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('announces loading through a polite status region with a hidden spinner', async () => {
    const Remote = LazyRemote(() => new Promise(() => {}), { remoteName: 'shop/cart' })
    const { container } = render(<Remote />)

    const status = screen.getByRole('status')
    expect(status.getAttribute('aria-live')).toBe('polite')
    expect(status.textContent).toContain('Loading shop/cart...')
    expect(status.querySelector('[aria-hidden="true"]')).not.toBeNull()
    await expectNoAxeViolations(container)
  })

  it('reports failures through an alert with an accessible retry button', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const Remote = LazyRemote(() => Promise.reject(new Error('remoteEntry.js 404')), { remoteName: 'shop/cart' })
    const { container } = render(<Remote />)

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain('remoteEntry.js 404')
    const button = screen.getByRole('button', { name: 'Try again' })
    expect(button.getAttribute('type')).toBe('button')
    await expectNoAxeViolations(container)
  })

  it('retries a failed LazyRemote with a fresh import', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const factory = vi
      .fn<() => Promise<{ default: React.ComponentType<Record<string, unknown>> }>>()
      .mockRejectedValueOnce(new Error('network down'))
      .mockResolvedValue({ default: Greeting })
    const Remote = LazyRemote(factory, { remoteName: 'shop/cart' })
    render(<Remote />)

    await screen.findByRole('alert')
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    })

    expect(await screen.findByRole('heading', { name: 'loaded' })).toBeTruthy()
    expect(factory).toHaveBeenCalledTimes(2)
  })
})

describe('MFErrorBoundary reset', () => {
  afterEach(() => cleanup())

  it('passes reset to function fallbacks and calls onReset before re-rendering', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    let shouldThrow = true
    const Flaky = () => {
      if (shouldThrow) throw new Error('boom')
      return <p>recovered</p>
    }
    const onReset = vi.fn(() => {
      shouldThrow = false
    })

    render(
      <MFErrorBoundary
        onReset={onReset}
        fallback={(info, reset) => (
          <button type="button" onClick={reset}>
            retry {info.error.message}
          </button>
        )}
      >
        <Flaky />
      </MFErrorBoundary>
    )

    fireEvent.click(screen.getByRole('button', { name: 'retry boom' }))
    expect(onReset).toHaveBeenCalledTimes(1)
    expect(screen.getByText('recovered')).toBeTruthy()
  })
})

describe('RemoteLoader retry', () => {
  afterEach(() => cleanup())

  it('evicts the failed import and loads the remote again on retry', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    let attempts = 0
    vi.doMock('flakyRemote/App', () => {
      attempts++
      if (attempts === 1) throw new Error('remoteEntry.js 503')
      return { default: Greeting }
    })
    const { RemoteLoader, hasRemoteComponent } = await import('./loader.js')

    render(<RemoteLoader remoteName="flakyRemote" />)
    expect(hasRemoteComponent('flakyRemote')).toBe(true)

    await screen.findByRole('alert')
    vi.resetModules()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    })

    expect(await screen.findByRole('heading', { name: 'loaded' })).toBeTruthy()
    expect(attempts).toBe(2)
  })
})
