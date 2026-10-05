// @vitest-environment jsdom
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, renderHook, screen } from '@testing-library/react'
import { MemoryRouter, useNavigate } from 'react-router-dom'
import { createRouteGuard, useMFENavigation, useRouteSync } from './index.js'

afterEach(() => cleanup())

function routerAt(path: string) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>
  }
}

describe('useMFENavigation', () => {
  it('navigates across scopes with normalized paths', () => {
    const { result } = renderHook(() => useMFENavigation(), { wrapper: routerAt('/') })

    act(() => result.current.navigateTo('/checkout/', '//cart'))
    expect(result.current.getCurrentPath()).toBe('/checkout/cart')
    expect(result.current.getCurrentScope()).toBe('checkout')

    act(() => result.current.navigateTo('admin'))
    expect(result.current.getCurrentPath()).toBe('/admin/')
    expect(result.current.location.pathname).toBe('/admin/')
  })

  it('reports the host scope at the root path', () => {
    const { result } = renderHook(() => useMFENavigation(), { wrapper: routerAt('/') })

    expect(result.current.getCurrentScope()).toBe('host')
  })
})

describe('useRouteSync', () => {
  it('emits route:changed on mount and on every navigation', () => {
    const emit = vi.fn()
    const eventBus = { emit }
    const { result } = renderHook(
      () => {
        useRouteSync(eventBus)
        return useNavigate()
      },
      { wrapper: routerAt('/checkout?step=1#top') }
    )

    expect(emit).toHaveBeenLastCalledWith('route:changed', {
      path: '/checkout',
      search: '?step=1',
      hash: '#top',
    })

    act(() => result.current('/admin'))
    expect(emit).toHaveBeenLastCalledWith('route:changed', { path: '/admin', search: '', hash: '' })
    expect(emit).toHaveBeenCalledTimes(2)
  })

  it('is a no-op without an event bus', () => {
    expect(() => renderHook(() => useRouteSync(), { wrapper: routerAt('/') })).not.toThrow()
  })
})

describe('createRouteGuard', () => {
  const Login = () => <p>please log in</p>

  it('renders nothing while checking, then children when allowed', async () => {
    let resolve!: (value: boolean) => void
    const Guard = createRouteGuard(() => new Promise<boolean>((r) => (resolve = r)), Login)

    const { container } = render(<Guard>secret</Guard>)
    expect(container.innerHTML).toBe('')

    await act(async () => resolve(true))
    expect(screen.getByText('secret')).toBeTruthy()
  })

  it('renders the fallback for a synchronous denial', async () => {
    const Guard = createRouteGuard(() => false, Login)

    render(<Guard>secret</Guard>)

    expect(await screen.findByText('please log in')).toBeTruthy()
    expect(screen.queryByText('secret')).toBeNull()
  })

  it('treats a rejected predicate as denied', async () => {
    const Guard = createRouteGuard(() => Promise.reject(new Error('auth down')), Login)

    render(<Guard>secret</Guard>)

    expect(await screen.findByText('please log in')).toBeTruthy()
  })

  it('ignores a predicate result that settles after unmount', async () => {
    let resolve!: (value: boolean) => void
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const Guard = createRouteGuard(() => new Promise<boolean>((r) => (resolve = r)), Login)

    const { unmount } = render(<Guard>secret</Guard>)
    unmount()
    await act(async () => resolve(true))

    expect(consoleError).not.toHaveBeenCalled()
    consoleError.mockRestore()
  })
})
