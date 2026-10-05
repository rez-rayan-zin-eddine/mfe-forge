import { render as rtlRender, type RenderOptions, type RenderResult } from '@testing-library/react'
import React from 'react'
import { vi } from 'vitest'

/** Extended render options for MFE testing, including route and initial state configuration. */
interface MFERenderOptions extends RenderOptions {
  /** Initial route to simulate (default: '/') */
  route?: string
  /** Initial store state to inject */
  initialState?: Record<string, any>
}

/**
 * Renders a React element with the standard MFE testing providers.
 * Wraps the component in `React.StrictMode` and any required context providers.
 *
 * @param ui - React element to render
 * @param options - Extended render options
 * @returns React Testing Library render result
 *
 * @example
 * ```tsx
 * const { getByText } = renderMFE(<CartWidget />)
 * expect(getByText('Add to Cart')).toBeInTheDocument()
 * ```
 */
export function renderMFE(ui: React.ReactElement, options: MFERenderOptions = {}): RenderResult {
  const { route = '/', initialState, wrapper: CustomWrapper, ...renderOptions } = options

  if (typeof window !== 'undefined' && window.history?.pushState) {
    window.history.pushState({}, '', route)
  }

  if (initialState !== undefined && typeof window !== 'undefined') {
    ;(window as unknown as { __MFE_INITIAL_STATE__?: unknown }).__MFE_INITIAL_STATE__ = initialState
  } else if (typeof window !== 'undefined') {
    delete (window as unknown as { __MFE_INITIAL_STATE__?: unknown }).__MFE_INITIAL_STATE__
  }

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <React.StrictMode>
        {CustomWrapper ? <CustomWrapper>{children}</CustomWrapper> : children}
      </React.StrictMode>
    )
  }

  const result = rtlRender(ui, { wrapper: Wrapper, ...renderOptions })
  if (typeof result?.unmount === 'function') {
    const originalUnmount = result.unmount.bind(result)
    result.unmount = () => {
      if (typeof window !== 'undefined') {
        delete (window as unknown as { __MFE_INITIAL_STATE__?: unknown }).__MFE_INITIAL_STATE__
      }
      return originalUnmount()
    }
  }

  return result
}

/**
 * Mocks a remote federated module in tests using vitest's `vi.mock`.
 * Replaces the dynamic import with a static component.
 *
 * @param moduleName - Module specifier to mock (e.g., 'checkoutApp/App')
 * @param component - React component to use as the mock
 */
export function mockRemoteModule(moduleName: string, component: React.ComponentType<any>) {
  vi.doMock(moduleName, () => ({
    default: component,
  }))
}

/**
 * Polls a callback until it returns true or a timeout is reached.
 * Useful for waiting until a federated module has finished loading.
 *
 * @param callback - Function that returns true when the condition is met
 * @param timeout - Maximum wait time in milliseconds (default: 5000)
 * @throws Error if the timeout is exceeded
 */
export async function waitForRemoteLoad(callback: () => boolean, timeout = 5000): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    if (callback()) return
    await new Promise((r) => setTimeout(r, 100))
  }
  throw new Error('Remote module load timeout')
}

/**
 * E2E test helpers for cross-MFE testing scenarios.
 * Designed for use with Playwright's `page` object.
 */
export const e2eHelpers = {
  /**
   * Navigates to a specific MFE route and waits for it to render.
   * @param page - Playwright page object
   * @param scope - MFE scope name
   * @param path - Route path within the scope
   */
  navigateToMFE: async (page: any, scope: string, path: string = '/') => {
    await page.goto(`/${scope}${path}`)
    await page.waitForSelector(`[data-mfe-scope="${scope}"]`, { timeout: 10000 })
  },

  /**
   * Waits for a remote component to become visible in the DOM.
   * @param page - Playwright page object
   * @param remoteName - Name of the remote to wait for
   */
  waitForRemote: async (page: any, remoteName: string) => {
    await page.waitForSelector(`[data-remote-name="${remoteName}"]`, { timeout: 10000 })
  },

  /**
   * Asserts that an MFE rendered without triggering the error boundary.
   * @param page - Playwright page object
   * @param scope - MFE scope to check
   * @throws Error if an error boundary fallback is found
   */
  assertMFERendered: async (page: any, scope: string) => {
    const errorBoundary = await page.$('[data-testid="mfe-error"]')
    if (errorBoundary) {
      throw new Error(`MFE "${scope}" rendered with errors`)
    }
  },
}
