# Runtime rules

- Remote loading must be resilient and cacheable.
- Browser globals are optional; importing runtime packages must remain SSR-safe.
- Separate bundles must not be assumed to share a singleton unless configured.
