# @mfe-forge/testing

## 0.1.1

### Patch Changes

- [#6](https://github.com/rez-rayan-zin-eddine/mfe-forge/pull/6) [`e6cc0ae`](https://github.com/rez-rayan-zin-eddine/mfe-forge/commit/e6cc0aecb05f0e2d07a0d71864fbd6fe7f1bef50) Thanks [@rez-rayan-zin-eddine](https://github.com/rez-rayan-zin-eddine)! - Package metadata fixes: the `types` condition now comes first in every `exports` entry (TypeScript resolves conditions in order), runtime packages declare `"sideEffects": false` for better tree-shaking, every package declares `engines.node >=20`, `repository.url` and `bin` paths are normalized so npm no longer rewrites them on publish.

- [#8](https://github.com/rez-rayan-zin-eddine/mfe-forge/pull/8) [`9247c84`](https://github.com/rez-rayan-zin-eddine/mfe-forge/commit/9247c847813c6248fc5b78c75d8e740d43c983d6) Thanks [@rez-rayan-zin-eddine](https://github.com/rez-rayan-zin-eddine)! - Accept Vitest 5 as a peer (`vitest >=1.5.0 <6`). The package only relies on `vi.doMock`, which is unchanged across Vitest 1–5; the repository's own suite now runs on Vitest 4.

## 0.1.0

First release of the `0.x` development line under new ownership (repository: rez-rayan-zin-eddine/mfe-forge). Versions `2.0.0`–`8.1.0` were prototype releases and are deprecated; all six packages are versioned together.

### Minor Changes

- `renderMFE` now applies `route` (history) and `initialState` (`window.__MFE_INITIAL_STATE__`, cleared on unmount) and composes a custom `wrapper`.
- `mockRemoteModule` uses `vi.doMock` so it works when called inside tests.

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
