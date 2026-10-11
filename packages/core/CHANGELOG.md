# @mfe-forge/core

## 0.1.1

### Patch Changes

- [#9](https://github.com/rez-rayan-zin-eddine/mfe-forge/pull/9) [`72966b7`](https://github.com/rez-rayan-zin-eddine/mfe-forge/commit/72966b77383bcdb64132cf3b63e828194a7c2df8) Thanks [@rez-rayan-zin-eddine](https://github.com/rez-rayan-zin-eddine)! - Accessible fallbacks and a working retry.
  - The default error fallback is now a `role="alert"` region and its "Try again" button has `type="button"`. The heading and button colors are darker for better contrast.
  - The default loading fallback is a `role="status"` live region (`data-testid="mfe-loading"`). Its spinner is `aria-hidden` and stops animating under `prefers-reduced-motion`.
  - "Try again" now really retries. Previously it re-rendered the same rejected `React.lazy` import, so it could never recover. `RemoteLoader` now evicts the failed cache entry, and `LazyRemote` creates a new lazy component.
  - `RemoteLoader` uses the default error fallback (with retry) instead of a bare "Failed to load" message.
  - `MFErrorBoundary` gains an `onReset` prop, and function fallbacks receive a `reset` callback as their second argument.

- [#6](https://github.com/rez-rayan-zin-eddine/mfe-forge/pull/6) [`e6cc0ae`](https://github.com/rez-rayan-zin-eddine/mfe-forge/commit/e6cc0aecb05f0e2d07a0d71864fbd6fe7f1bef50) Thanks [@rez-rayan-zin-eddine](https://github.com/rez-rayan-zin-eddine)! - Package metadata fixes: the `types` condition now comes first in every `exports` entry (TypeScript resolves conditions in order), runtime packages declare `"sideEffects": false` for better tree-shaking, every package declares `engines.node >=20`, `repository.url` and `bin` paths are normalized so npm no longer rewrites them on publish.

## 0.1.0

First release of the `0.x` development line under new ownership (repository: rez-rayan-zin-eddine/mfe-forge). Versions `2.0.0`–`8.1.0` were prototype releases and are deprecated; all six packages are versioned together.

### Minor Changes

- Bound the `RemoteLoader` component cache (LRU, 100 entries) and export `clearRemoteComponentCache`, `evictRemoteComponent`, `hasRemoteComponent`, `getRemoteComponentCacheSize` and `MAX_CACHE_SIZE`.
- Add `RemoteRegistry` / `remoteRegistry` for remote definitions and health state.
- Default error fallback exposes `data-testid="mfe-error"` and `data-remote-name`.
- Build with code splitting so entry points share chunks.

## 5.0.1

### Patch Changes

- fix: template rendering errors, build configs, and update CLI documentation

## 5.0.0

### Major Changes

- docs and license setting

## 4.0.0

### Major Changes

- init

## 3.0.0

### Major Changes

- init

## 2.0.0

### Major Changes

- initialization
