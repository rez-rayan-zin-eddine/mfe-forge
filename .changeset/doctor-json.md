---
'mfe-forge': patch
---

`doctor` gains `--json`, emitting `{ ok, summary, checks: [{ id, status, message, hint? }] }`, and prints a fix hint under each failed check. A failed check now exits with code `2` (task failed) instead of `1`. The checks are exported as `runDoctor()` for programmatic use.
