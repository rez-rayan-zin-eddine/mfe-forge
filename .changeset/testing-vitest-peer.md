---
'@mfe-forge/testing': patch
---

Accept Vitest 5 as a peer (`vitest >=1.5.0 <6`). The package only relies on `vi.doMock`, which is unchanged across Vitest 1–5; the repository's own suite now runs on Vitest 4.
