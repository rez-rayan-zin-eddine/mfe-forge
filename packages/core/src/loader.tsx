import React, { lazy, Suspense, useState, type ReactNode } from 'react'
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
  return (
    <MFErrorBoundary
      remoteName={remoteName}
      // A rejected lazy() import stays rejected; evict it so the retry fetches again
      onReset={() => evictRemoteComponent(remoteName, moduleName)}
    >
      <Suspense fallback={fallback || <DefaultFallback remoteName={remoteName} />}>
        <CachedRemote remoteName={remoteName} moduleName={moduleName} props={props} />
      </Suspense>
    </MFErrorBoundary>
  )
}

/** Looks the lazy component up at render time, so a reset after eviction picks up a fresh import. */
function CachedRemote({
  remoteName,
  moduleName,
  props,
}: {
  remoteName: string
  moduleName: string
  props: Record<string, unknown>
}) {
  const LazyComponent = getRemoteComponent(remoteName, moduleName)
  return <LazyComponent {...props} />
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
  const initial = lazy(factory)

  return function LazyRemoteWrapper(props: Record<string, unknown>) {
    // A rejected lazy() import stays rejected, so a retry needs a new lazy component
    const [Component, setComponent] = useState(() => initial)

    return (
      <MFErrorBoundary remoteName={options?.remoteName} onReset={() => setComponent(() => lazy(factory))}>
        <Suspense
          fallback={options?.fallback || <DefaultFallback remoteName={options?.remoteName} />}
        >
          <Component {...props} />
        </Suspense>
      </MFErrorBoundary>
    )
  }
}

/** Default loading indicator shown while a remote component is being fetched. */
function DefaultFallback({ remoteName }: { remoteName?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="mfe-loading"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '200px',
        color: '#4b5563',
      }}
    >
      <div style={{ textAlign: 'center' }}>
        <div
          aria-hidden="true"
          className="mfe-loading-spinner"
          style={{
            width: '40px',
            height: '40px',
            border: '3px solid #e5e7eb',
            borderTopColor: '#3b82f6',
            borderRadius: '50%',
            margin: '0 auto 1rem',
          }}
        />
        <p>Loading {remoteName || 'component'}...</p>
      </div>
      <style>{`
        .mfe-loading-spinner { animation: mfe-spin 1s linear infinite; }
        @keyframes mfe-spin { to { transform: rotate(360deg); } }
        @media (prefers-reduced-motion: reduce) {
          .mfe-loading-spinner { animation: none; }
        }
      `}</style>
    </div>
  )
}
