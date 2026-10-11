import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { MFErrorBoundary } from './error-boundary.js'

describe('MFErrorBoundary', () => {
  it('derives an error state from a thrown error', () => {
    const error = new Error('remote failed')
    expect(MFErrorBoundary.getDerivedStateFromError(error)).toEqual({
      hasError: true,
      error,
      errorInfo: null,
    })
  })

  it('renders a static custom fallback after an error', () => {
    const fallback = React.createElement('span', null, 'Recoverable')
    const boundary = new MFErrorBoundary({
      children: React.createElement('div'),
      fallback,
    })

    boundary.state = MFErrorBoundary.getDerivedStateFromError(new Error('boom'))
    expect(boundary.render()).toBe(fallback)
  })

  it('renders a dynamic fallback with remote context', () => {
    const fallback = vi.fn((info) => React.createElement('span', null, info.remoteName))
    const boundary = new MFErrorBoundary({
      children: React.createElement('div'),
      remoteName: 'checkout/cart',
      fallback,
    })

    const error = new Error('boom')
    boundary.state = MFErrorBoundary.getDerivedStateFromError(error)
    const rendered = boundary.render()

    expect(fallback).toHaveBeenCalledWith(
      expect.objectContaining({ error, remoteName: 'checkout/cart' }),
      expect.any(Function)
    )
    expect(React.isValidElement(rendered)).toBe(true)
  })
})
