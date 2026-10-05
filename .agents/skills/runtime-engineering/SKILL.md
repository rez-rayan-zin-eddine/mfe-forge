# Runtime engineering

## When to use

Loader, registry, event bus, store, router, or browser/SSR behavior.

## Inputs and context required

Public runtime API, lifecycle, browser assumptions, failure/retry semantics, and tests.

## Procedure

1. Preserve stable identities and public signatures. 2. Separate policy from transport/loading. 3. Define timeout, retry, reset, and error behavior. 4. Add deterministic unit tests. 5. Check browser and SSR safety.

## Verification

Runtime tests, package type-check/build, and failure-path coverage.

## Expected artifacts

Runtime module/API changes, tests, compatibility notes, and limitations.
