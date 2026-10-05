// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import React, { createContext, useContext, useEffect, useState } from 'react'
import { cleanup } from '@testing-library/react'
import { renderMFE } from './index.js'

interface WindowWithMFEState extends Window {
  __MFE_INITIAL_STATE__?: unknown
}

function getMFEWindow(): WindowWithMFEState {
  return window as unknown as WindowWithMFEState
}

describe('renderMFE — DOM Environment (jsdom)', () => {
  beforeEach(() => {
    // Reset window.location and globals
    window.history.pushState({}, '', '/')
    delete getMFEWindow().__MFE_INITIAL_STATE__
  })

  afterEach(() => {
    cleanup()
    delete getMFEWindow().__MFE_INITIAL_STATE__
  })

  describe('Route injection', () => {
    it('sets window.location.pathname to the specified route', () => {
      renderMFE(React.createElement('div', null, 'Content'), {
        route: '/checkout',
      })
      expect(window.location.pathname).toBe('/checkout')
    })

    it('defaults route to / when not provided', () => {
      window.history.pushState({}, '', '/initial')
      expect(window.location.pathname).toBe('/initial')

      renderMFE(React.createElement('div', null, 'Content'))
      expect(window.location.pathname).toBe('/')
    })

    it('handles routes with query parameters and hash fragments', () => {
      renderMFE(React.createElement('div', null, 'Content'), {
        route: '/products?category=books&sort=desc#reviews',
      })
      expect(window.location.pathname).toBe('/products')
      expect(window.location.search).toBe('?category=books&sort=desc')
      expect(window.location.hash).toBe('#reviews')
    })

    it('handles complex URL encoded queries and nested hash paths', () => {
      renderMFE(React.createElement('div', null, 'Page'), {
        route: '/search?q=micro%20frontends&filter=%5B1%2C2%5D&active=true#nested/anchor',
      })
      expect(window.location.pathname).toBe('/search')
      expect(window.location.search).toBe('?q=micro%20frontends&filter=%5B1%2C2%5D&active=true')
      expect(window.location.hash).toBe('#nested/anchor')
    })

    it('handles empty route string gracefully without crashing pushState', () => {
      window.history.pushState({}, '', '/initial-page')
      expect(() => {
        renderMFE(React.createElement('div', null, 'Page'), {
          route: '',
        })
      }).not.toThrow()
    })
  })

  describe('initialState injection and State Isolation', () => {
    it('sets window.__MFE_INITIAL_STATE__ to the provided initialState object', () => {
      const initialState = { user: 'alice', role: 'admin', permissions: ['read', 'write'] }
      renderMFE(React.createElement('div', null, 'Content'), {
        initialState,
      })
      expect(getMFEWindow().__MFE_INITIAL_STATE__).toEqual(initialState)
    })

    it('cleans up previous state when initialState is undefined to prevent leakage', () => {
      getMFEWindow().__MFE_INITIAL_STATE__ = { preExisting: true }
      renderMFE(React.createElement('div', null, 'Content'))
      expect(getMFEWindow().__MFE_INITIAL_STATE__).toBeUndefined()
    })

    it('cleans up state between sequential renders without explicit unmount', () => {
      renderMFE(React.createElement('div', null, 'First'), {
        initialState: { run: 1, user: 'test-user-1' },
      })
      expect(getMFEWindow().__MFE_INITIAL_STATE__).toEqual({ run: 1, user: 'test-user-1' })

      renderMFE(React.createElement('div', null, 'Second'))
      expect(getMFEWindow().__MFE_INITIAL_STATE__).toBeUndefined()
    })

    it('cleans up state when initialState is explicitly undefined', () => {
      renderMFE(React.createElement('div', null, 'First'), {
        initialState: { run: 1 },
      })
      expect(getMFEWindow().__MFE_INITIAL_STATE__).toEqual({ run: 1 })

      renderMFE(React.createElement('div', null, 'Second'), {
        initialState: undefined,
      })
      expect(getMFEWindow().__MFE_INITIAL_STATE__).toBeUndefined()
    })

    it('overwrites previous state when new initialState is provided', () => {
      getMFEWindow().__MFE_INITIAL_STATE__ = { initial: 'first' }
      renderMFE(React.createElement('div', null, 'Content'), {
        initialState: { initial: 'second' },
      })
      expect(getMFEWindow().__MFE_INITIAL_STATE__).toEqual({ initial: 'second' })
    })

    it('supports null or empty object initialState', () => {
      renderMFE(React.createElement('div', null, 'Content'), {
        initialState: {},
      })
      expect(getMFEWindow().__MFE_INITIAL_STATE__).toEqual({})
    })

    it('handles rapid sequential calls with alternating state presence', () => {
      for (let i = 0; i < 20; i++) {
        if (i % 2 === 0) {
          renderMFE(React.createElement('div', null, `Render ${i}`), {
            initialState: { count: i },
          })
          expect(getMFEWindow().__MFE_INITIAL_STATE__).toEqual({ count: i })
        } else {
          renderMFE(React.createElement('div', null, `Render ${i}`))
          expect(getMFEWindow().__MFE_INITIAL_STATE__).toBeUndefined()
        }
      }
    })
  })

  describe('Unmount lifecycle cleanup', () => {
    it('cleans up window.__MFE_INITIAL_STATE__ upon unmount', () => {
      const { unmount } = renderMFE(React.createElement('div', null, 'Content'), {
        initialState: { active: true },
      })
      expect(getMFEWindow().__MFE_INITIAL_STATE__).toEqual({ active: true })
      unmount()
      expect(getMFEWindow().__MFE_INITIAL_STATE__).toBeUndefined()
    })

    it('is idempotent: calling unmount() multiple times does not throw or corrupt state', () => {
      const { unmount } = renderMFE(React.createElement('div', null, 'Test'), {
        initialState: { token: 'xyz' },
      })
      expect(() => {
        unmount()
        unmount()
        unmount()
      }).not.toThrow()
      expect(getMFEWindow().__MFE_INITIAL_STATE__).toBeUndefined()
    })

    it('cleans up state even when initialState was an empty object', () => {
      const { unmount } = renderMFE(React.createElement('div', null, 'Test'), {
        initialState: {},
      })
      expect(getMFEWindow().__MFE_INITIAL_STATE__).toEqual({})
      unmount()
      expect(getMFEWindow().__MFE_INITIAL_STATE__).toBeUndefined()
    })
  })

  describe('Re-render Behavior', () => {
    it('preserves initialState during rerender() call', () => {
      const { rerender, getByText } = renderMFE(
        React.createElement('span', null, 'v1'),
        { initialState: { feature: 'enabled' } }
      )
      expect(getByText('v1')).toBeDefined()
      expect(getMFEWindow().__MFE_INITIAL_STATE__).toEqual({ feature: 'enabled' })

      rerender(React.createElement('span', null, 'v2'))
      expect(getByText('v2')).toBeDefined()
      expect(getMFEWindow().__MFE_INITIAL_STATE__).toEqual({ feature: 'enabled' })
    })

    it('unmount after rerender cleanly deletes window.__MFE_INITIAL_STATE__', () => {
      const { rerender, unmount } = renderMFE(
        React.createElement('span', null, 'v1'),
        { initialState: { session: 123 } }
      )
      rerender(React.createElement('span', null, 'v2'))
      rerender(React.createElement('span', null, 'v3'))

      unmount()
      expect(getMFEWindow().__MFE_INITIAL_STATE__).toBeUndefined()
    })

    it('component can read window.__MFE_INITIAL_STATE__ across re-renders', () => {
      function StateConsumer({ suffix }: { suffix: string }) {
        const state = (window as unknown as WindowWithMFEState).__MFE_INITIAL_STATE__ as
          | Record<string, unknown>
          | undefined
        return React.createElement('div', null, `${String(state?.label)}-${suffix}`)
      }

      const { rerender, getByText } = renderMFE(
        React.createElement(StateConsumer, { suffix: '1' }),
        { initialState: { label: 'hello' } }
      )
      expect(getByText('hello-1')).toBeDefined()

      rerender(React.createElement(StateConsumer, { suffix: '2' }))
      expect(getByText('hello-2')).toBeDefined()
    })
  })

  describe('Wrapper composition and React.StrictMode', () => {
    it('renders and composes a custom wrapper around the target component', () => {
      const wrapperSpy = vi.fn()
      const CustomWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
        wrapperSpy()
        return React.createElement('div', { 'data-testid': 'custom-wrapper-container' }, children)
      }

      const { getByTestId, getByText } = renderMFE(
        React.createElement('span', { 'data-testid': 'inner-content' }, 'Inner Content'),
        { wrapper: CustomWrapper }
      )

      expect(wrapperSpy).toHaveBeenCalled()
      const wrapperEl = getByTestId('custom-wrapper-container')
      const innerEl = getByTestId('inner-content')
      expect(wrapperEl).toBeDefined()
      expect(innerEl).toBeDefined()
      expect(wrapperEl.contains(innerEl)).toBe(true)
      expect(getByText('Inner Content')).toBeDefined()
    })

    it('provides context correctly through custom wrapper', () => {
      const ThemeContext = createContext<string>('light')
      const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
        return React.createElement(ThemeContext.Provider, { value: 'dark' }, children)
      }

      const ConsumerComponent = () => {
        const theme = useContext(ThemeContext)
        return React.createElement('div', { 'data-testid': 'theme-value' }, theme)
      }

      const { getByTestId } = renderMFE(React.createElement(ConsumerComponent), {
        wrapper: ThemeProvider,
      })

      expect(getByTestId('theme-value').textContent).toBe('dark')
    })

    it('verifies custom wrapper is nested within React.StrictMode', () => {
      let wrapperRenders = 0
      let childRenders = 0

      const StrictWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
        wrapperRenders++
        return React.createElement('div', null, children)
      }

      const Child = () => {
        childRenders++
        return React.createElement('div', null, 'Child')
      }

      renderMFE(React.createElement(Child), { wrapper: StrictWrapper })

      // React.StrictMode causes double-invocations in development mode
      expect(wrapperRenders).toBeGreaterThanOrEqual(2)
      expect(childRenders).toBeGreaterThanOrEqual(2)
    })

    it('composes multi-level context provider inside React.StrictMode', () => {
      const CountContext = createContext<number>(0)
      const StepContext = createContext<number>(1)

      const MultiProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
        return React.createElement(
          CountContext.Provider,
          { value: 99 },
          React.createElement(StepContext.Provider, { value: 5 }, children)
        )
      }

      function Consumer() {
        const count = useContext(CountContext)
        const step = useContext(StepContext)
        return React.createElement('div', { 'data-testid': 'combined' }, `${count}+${step}`)
      }

      const { getByTestId } = renderMFE(React.createElement(Consumer), {
        wrapper: MultiProvider,
      })

      expect(getByTestId('combined').textContent).toBe('99+5')
    })

    it('triggers StrictMode double-invocation on stateful effects', () => {
      let effectMountCount = 0
      let effectCleanupCount = 0

      function EffectProbe() {
        useEffect(() => {
          effectMountCount++
          return () => {
            effectCleanupCount++
          }
        }, [])
        return React.createElement('div', null, 'Probe')
      }

      const { unmount } = renderMFE(React.createElement(EffectProbe))

      expect(effectMountCount).toBeGreaterThanOrEqual(1)
      unmount()
      expect(effectCleanupCount).toBeGreaterThanOrEqual(1)
    })

    it('handles custom wrapper with hooks and local state', () => {
      const WrapperWithState: React.FC<{ children: React.ReactNode }> = ({ children }) => {
        const [loaded] = useState(true)
        return React.createElement('div', { 'data-ready': String(loaded) }, children)
      }

      const { container } = renderMFE(React.createElement('span', null, 'Child'), {
        wrapper: WrapperWithState,
      })

      expect(container.querySelector('div[data-ready="true"]')).not.toBeNull()
    })

    it('passes additional renderOptions through to rtlRender', () => {
      const customContainer = document.createElement('section')
      customContainer.setAttribute('data-testid', 'custom-mount-root')
      document.body.appendChild(customContainer)

      const { container } = renderMFE(React.createElement('p', null, 'In Custom Root'), {
        container: customContainer,
      })

      expect(container).toBe(customContainer)
      expect(customContainer.querySelector('p')?.textContent).toBe('In Custom Root')
      document.body.removeChild(customContainer)
    })
  })

  describe('Concurrency and Error Boundaries', () => {
    it('concurrent/interleaved renders: unmounting first render affects second render state due to global property', () => {
      const r1 = renderMFE(React.createElement('div', null, 'First'), {
        initialState: { app: 'first' },
      })
      expect(getMFEWindow().__MFE_INITIAL_STATE__).toEqual({ app: 'first' })

      const r2 = renderMFE(React.createElement('div', null, 'Second'), {
        initialState: { app: 'second' },
      })
      expect(getMFEWindow().__MFE_INITIAL_STATE__).toEqual({ app: 'second' })
      expect(r2.container).toBeDefined()

      // Unmounting r1 deletes global property
      r1.unmount()
      expect(getMFEWindow().__MFE_INITIAL_STATE__).toBeUndefined()
    })

    it('error during render: subsequent renderMFE cleans up state even after thrown error', () => {
      function ExplodingComponent(): React.ReactElement {
        throw new Error('Explosion during render')
      }

      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      expect(() => {
        renderMFE(React.createElement(ExplodingComponent), {
          initialState: { fatal: true },
        })
      }).toThrow('Explosion during render')

      // Because render threw before return, state remained on window:
      expect(getMFEWindow().__MFE_INITIAL_STATE__).toEqual({ fatal: true })

      // Subsequent renderMFE cleans it up:
      renderMFE(React.createElement('div', null, 'Recovered'))
      expect(getMFEWindow().__MFE_INITIAL_STATE__).toBeUndefined()

      consoleErrorSpy.mockRestore()
    })
  })
})
