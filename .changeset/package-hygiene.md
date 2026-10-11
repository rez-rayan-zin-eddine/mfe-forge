---
'mfe-forge': patch
'@mfe-forge/core': patch
'@mfe-forge/router': patch
'@mfe-forge/store': patch
'@mfe-forge/design': patch
'@mfe-forge/testing': patch
---

Package metadata fixes: the `types` condition now comes first in every `exports` entry (TypeScript resolves conditions in order), runtime packages declare `"sideEffects": false` for better tree-shaking, every package declares `engines.node >=20`, `repository.url` and `bin` paths are normalized so npm no longer rewrites them on publish.
