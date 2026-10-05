import React, { useEffect, useState, type ComponentType } from 'react'
import { useNavigate, useLocation, Route } from 'react-router-dom'

/** Defines a route for a micro frontend application. */
export interface MFERoute {
  /** URL path pattern (relative to the scope prefix) */
  path: string
  /** React component to render at this route */
  component: ComponentType<any>
  /** Whether the path must match exactly */
  exact?: boolean
  /** Nested child routes */
  children?: MFERoute[]
  /** Lazy-load factory for code-splitting */
  lazy?: () => Promise<{ default: ComponentType<any> }>
}

/** Registry mapping scope names to their routes. */
export interface RouteRegistry {
  [scope: string]: MFERoute[]
}

/**
 * Hook for navigating between micro frontends across scopes.
 * Provides utilities to navigate to other MFEs, get the current scope,
 * and access the current location.
 *
 * @example
 * ```tsx
 * const { navigateTo, getCurrentScope } = useMFENavigation()
 * navigateTo('checkout', '/cart') // navigates to /checkout/cart
 * ```
 */
export function useMFENavigation() {
  const navigate = useNavigate()
  const location = useLocation()

  return {
    /** Navigate to a specific scope and path */
    navigateTo: (scope: string, path: string = '/') => {
      const normalizedScope = scope.replace(/^\/+|\/+$/g, '')
      const normalizedPath = `/${path.replace(/^\/+/, '')}`
      const targetPath = `/${normalizedScope}${normalizedPath === '/' ? '/' : normalizedPath}`
      navigate(targetPath)
    },
    /** Extract the current scope from the URL pathname */
    getCurrentScope: () => {
      const parts = location.pathname.split('/').filter(Boolean)
      return parts[0] || 'host'
    },
    /** Get the full current pathname */
    getCurrentPath: () => location.pathname,
    /** The raw react-router location object */
    location,
  }
}

/**
 * Hook that emits route change events through an event bus.
 * Enables other MFEs to react to navigation changes without tight coupling.
 *
 * @param eventBus - An EventBus instance (or any object with an `emit` method)
 */
export function useRouteSync(eventBus?: { emit: (event: string, payload: any) => void }) {
  const location = useLocation()

  useEffect(() => {
    if (eventBus) {
      eventBus.emit('route:changed', {
        path: location.pathname,
        search: location.search,
        hash: location.hash,
      })
    }
  }, [location, eventBus])
}

/**
 * Generates React Router `<Route>` elements from a route registry.
 * Routes are automatically prefixed with their scope name.
 *
 * @param registry - Object mapping scope names to their route definitions
 * @returns Array of `<Route>` JSX elements
 */
export function generateRoutes(registry: RouteRegistry): React.JSX.Element[] {
  const routes: React.JSX.Element[] = []

  for (const [scope, scopeRoutes] of Object.entries(registry)) {
    for (const route of scopeRoutes) {
      const Component = route.component
      routes.push(
        <Route
          key={`${scope}-${route.path}`}
          path={`/${scope.replace(/^\/+|\/+$/g, '')}/${route.path.replace(/^\/+/, '')}`}
          element={<Component />}
        />
      )
    }
  }

  return routes
}

/**
 * Creates a route guard component for authentication or permission checks.
 * Wraps child routes and only renders them if the predicate returns true.
 *
 * @param predicate - Sync or async function that returns true if access is allowed
 * @param fallback - Component to render when access is denied
 * @returns A wrapper component that conditionally renders children
 *
 * @example
 * ```tsx
 * const AuthGuard = createRouteGuard(() => isAuthenticated(), LoginPage)
 * <AuthGuard><ProtectedContent /></AuthGuard>
 * ```
 */
export function createRouteGuard(
  predicate: () => boolean | Promise<boolean>,
  fallback: ComponentType<any>
) {
  const Fallback = fallback
  return function GuardedRoute({ children }: { children: React.ReactNode }) {
    const [allowed, setAllowed] = useState(false)
    const [checking, setChecking] = useState(true)

    useEffect(() => {
      let active = true
      Promise.resolve(predicate()).then((result) => {
        if (!active) return
        setAllowed(result)
        setChecking(false)
      }).catch(() => { if (active) { setAllowed(false); setChecking(false) } })
      return () => { active = false }
    }, [])

    if (checking) return null
    if (!allowed) return <Fallback />
    return children
  }
}
