---
'mfe-forge': patch
---

`build`, `test` and `dev` now exit non-zero when a delegated task fails (exit code `2`) or an app cannot be resolved (exit code `1`). Previously `build` printed "Build complete" and exited `0` even when apps failed. `build` gains `--bail`, prints a built/failed summary, and rejects unknown apps instead of skipping them. `test [app]` resolves apps through the configured apps directory, and `--unit`/`--e2e` now run the `test:unit`/`test:e2e` scripts instead of forwarding flags the runner rejects. Async command errors are now handled by the top-level error handler, and `--version` prints the version once.
