# @mfe-forge/core

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
