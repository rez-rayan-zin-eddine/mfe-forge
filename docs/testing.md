# Testing guide

## Repository checks

From the repository root:

```bash
bun install --frozen-lockfile
bun run build
bun run test
bun run docs:build
```

The root test task runs package Vitest suites through Turborepo. The design package uses jsdom; the testing package uses a DOM-capable Vitest environment through its workspace setup.

## Package tests

Each package exposes `type-check` and `test`; buildable packages expose `build`. Run focused checks while developing:

```bash
bun run --cwd packages/core type-check
bun run --cwd packages/core test
bun run --cwd packages/cli type-check
bun run --cwd packages/cli test
```

## CLI and topology verification

```bash
mfe-forge status --json
mfe-forge graph --format json
mfe-forge check --json
mfe-forge deps --check --json
mfe-forge sync --dry-run --diff --json
mfe-forge sync --check
```

For sync changes, run the command twice. The second check should report no changes.

## Generated-project verification

The intended integration flow is:

```text
init --skip-install → generate host → generate app → install
→ type-check → build → test → sync → check
```

The repository currently has focused discovery, config, manifest, runtime, router, store, design, and testing-unit coverage. A complete generated fixture matrix is still a known limitation and must be completed before claiming full framework release readiness.

## Runtime patterns

Use `MFErrorBoundary` around remote trees, test error and retry behavior, test normalized route paths, use scoped store names, and include event origin handling when synchronizing state. For remote mocks, `@mfe-forge/testing` uses Vitest `vi.doMock` to avoid mock-hoisting issues with dynamic module names.
