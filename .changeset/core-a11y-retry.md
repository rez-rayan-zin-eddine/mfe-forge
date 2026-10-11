---
'@mfe-forge/core': patch
---

Accessible fallbacks and a working retry.

- The default error fallback is now a `role="alert"` region and its "Try again" button has `type="button"`. The heading and button colors are darker for better contrast.
- The default loading fallback is a `role="status"` live region (`data-testid="mfe-loading"`). Its spinner is `aria-hidden` and stops animating under `prefers-reduced-motion`.
- "Try again" now really retries. Previously it re-rendered the same rejected `React.lazy` import, so it could never recover. `RemoteLoader` now evicts the failed cache entry, and `LazyRemote` creates a new lazy component.
- `RemoteLoader` uses the default error fallback (with retry) instead of a bare "Failed to load" message.
- `MFErrorBoundary` gains an `onReset` prop, and function fallbacks receive a `reset` callback as their second argument.
