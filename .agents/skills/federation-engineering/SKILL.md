# Federation engineering

## When to use

Remotes, hosts, exposes, contracts, routes, or sync behavior.

## Inputs and context required

Manifest/config, federation plugin, host/remote examples, and generated-file policy.

## Procedure

1. Model the contract. 2. Prefer structured parsing. 3. Generate deterministic output. 4. Show dry-run diff before mutation. 5. Verify a second run is clean.

## Verification

Sync dry-run/check, fixture tests, type-check, and second-run idempotency check.

## Expected artifacts

Contract/model changes, adapter or sync changes, generated diff, and diagnostics.
