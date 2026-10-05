import React, { lazy, Suspense, type ReactNode } from 'react'
import { MFErrorBoundary } from './error-boundary.js'
import type { RemoteComponentProps } from './types.js'

/**
 * Dynamically loads and renders a remote federated module.
 * Wraps the loaded component in an error boundary and suspense boundary.
 *
 * @example
 * ```tsx
 * <RemoteLoader remoteName="checkoutApp" moduleName="App" />
 * ```
 */
export const MAX_CACHE_SIZE = 100

const remoteComponentCache = new Map<string, React.LazyExoticComponent<React.ComponentType<Record<string, unknown>>>>()

/** Returns the current number of cached remote components. */
export function getRemoteComponentCacheSize(): number {
  return remoteComponentCache.size
}

/** Clears all cached remote components from memory. */
export function clearRemoteComponentCache(): void {
  remoteComponentCache.clear()
}

/** Checks whether a specific remote component is currently cached. */
export function hasRemoteComponent(remoteName: string, moduleName = 'App'): boolean {
  return remoteComponentCache.has(`${remoteName}/${moduleName}`)
}

/** Evicts a specific remote component from the cache. Returns true if an element was evicted. */
export function evictRemoteComponent(remoteName: string, moduleName = 'App'): boolean {
  return remoteComponentCache.delete(`${remoteName}/${moduleName}`)
}

function getRemoteComponent(remoteName: string, moduleName: string) {
  const key = `${remoteName}/${moduleName}`
  let component = remoteComponentCache.get(key)
  if (component) {
    // Refresh LRU ordering on cache hit
    remoteComponentCache.delete(key)
    remoteComponentCache.set(key, component)
    return component
  }

  // Evict least recently used entry if exceeding capacity
  if (remoteComponentCache.size >= MAX_CACHE_SIZE) {
    const oldestKey = remoteComponentCache.keys().next().value
    if (oldestKey !== undefined) {
      remoteComponentCache.delete(oldestKey)
    }
  }

  component = lazy(() => import(/* @vite-ignore */ key))
  remoteComponentCache.set(key, component)
  return component
}

export function RemoteLoader({
  remoteName,
  moduleName = 'App',
  fallback,
  props = {},
}: RemoteComponentProps) {
  const LazyComponent = getRemoteComponent(remoteName, moduleName)

  return (
    <MFErrorBoundary
      remoteName={remoteName}
      fallback={
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          <p>Failed to load {remoteName}</p>
        </div>
      }
    >
      <Suspense fallback={fallback || <DefaultFallback remoteName={remoteName} />}>
        <LazyComponent {...props} />
      </Suspense>
    </MFErrorBoundary>
  )
}

/**
 * Creates a lazy-loaded wrapper component for a remote MFE.
 * Returns a regular React component that can be used in routes or JSX
 * just like any other component.
 *
 * @param factory - Dynamic import function returning the remote component
 * @param options - Optional fallback UI and remote name for error reporting
 * @returns A wrapped React component with built-in error boundary and suspense
 *
 * @example
 * ```tsx
 * const CartApp = LazyRemote(
 *   () => import('checkoutApp/App'),
 *   { remoteName: 'checkout/cart' }
 * )
 * // Use in routes:
 * <Route path="/cart" element={<CartApp />} />
 * ```
 */
export function LazyRemote(
  factory: () => Promise<{ default: React.ComponentType<Record<string, unknown>> }>,
  options?: { fallback?: ReactNode; remoteName?: string }
) {
  const Component = lazy(factory)

  return function LazyRemoteWrapper(props: Record<string, unknown>) {
    return (
      <MFErrorBoundary remoteName={options?.remoteName}>
        <Suspense
          fallback={options?.fallback || <DefaultFallback remoteName={options?.remoteName} />}
        >
          <Component {...props} />
        </Suspense>
      </MFErrorBoundary>
    )
  }
}

/** Default loading spinner shown while a remote component is being fetched. */
function DefaultFallback({ remoteName }: { remoteName?: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '200px',
        color: '#6b7280',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div
          style={{
            width: '40px',
            height: '40px',
            border: '3px solid #e5e7eb',
            borderTopColor: '#3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 1rem',
          }}
        />
        <p>Loading {remoteName || 'component'}...</p>
      </div>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
