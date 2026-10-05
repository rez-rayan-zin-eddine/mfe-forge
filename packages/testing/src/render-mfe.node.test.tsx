// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import React from 'react'

interface WindowWithMFEState {
  __MFE_INITIAL_STATE__?: unknown
}

const mockRtlRender = vi.fn((ui: React.ReactElement, options: unknown) => ({
  container: null,
  baseElement: null,
  debug: vi.fn(),
  unmount: vi.fn(),
  asFragment: vi.fn(),
  rerender: vi.fn(),
  ui,
  options,
}))

vi.mock('@testing-library/react', () => ({
  render: (ui: React.ReactElement, options: unknown) => mockRtlRender(ui, options),
}))

import { renderMFE } from './index.js'

describe('renderMFE — Headless Node Environment (without window)', () => {
  beforeEach(() => {
    mockRtlRender.mockClear()
  })

  it('confirms running in headless Node environment without window', () => {
    expect(typeof window).toBe('undefined')
  })

  it('does not throw unhandled ReferenceError when executing renderMFE with route and initialState', () => {
    expect(() => {
      renderMFE(React.createElement('div', null, 'Node Content'), {
        route: '/checkout',
        initialState: { user: 'alice' },
        wrapper: ({ children }) => React.createElement('div', null, children),
      })
    }).not.toThrow()

    expect(mockRtlRender).toHaveBeenCalledTimes(1)
  })

  it('safely passes wrapper and options to underlying renderer in Node', () => {
    const customWrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement('main', null, children)

    renderMFE(React.createElement('span', null, 'Hello'), {
      route: '/test',
      initialState: { counter: 42 },
      wrapper: customWrapper,
    })

    expect(mockRtlRender).toHaveBeenCalledTimes(1)
    const passedOptions = mockRtlRender.mock.calls[0][1] as { wrapper?: React.ComponentType }
    expect(passedOptions).toBeDefined()
    expect(typeof passedOptions.wrapper).toBe('function')
  })

  it('handles partial window definition without history safely', () => {
    const mockGlobal = globalThis as unknown as { window?: WindowWithMFEState }
    mockGlobal.window = {}

    try {
      expect(() => {
        renderMFE(React.createElement('div', null, 'Partial Window Test'), {
          route: '/partial',
          initialState: { flag: true },
        })
      }).not.toThrow()

      // Should set initialState since window exists
      expect(mockGlobal.window.__MFE_INITIAL_STATE__).toEqual({ flag: true })
    } finally {
      delete mockGlobal.window
    }
  })
})
