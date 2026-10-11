# MFE Forge — Execution Plan

How I will carry out [ROADMAP.md](ROADMAP.md). Each task lists the files it touches, the steps, how I verify it, and the commit it ends with. The tasks are ordered so that every merge to `main` leaves the repository releasable.

## 0. Operating rules

- **Branching.** I use one branch per workstream (`feat/a1-cli-exit-codes`, …), open a PR into `main`, and merge after CI is green. I squash-merge, then delete the branch.
- **Change loop** (from `AGENTS.md`): discover → design → implement → focused test → package `type-check` → package build → `bun run lint && bun run build && bun run test`.
- **Changesets.** Every PR that touches `packages/*/src` or templates adds a `.changeset/*.md` (patch in Phase A, minor in Phases B–D).
- **ADRs.** Architectural changes get `docs/ai/decisions/000N-*.md` before any code.
- **Authorization gates** (marked 🔒). These change external state, and I stop to ask before each one: repository settings, npm settings, publishing outside CI, enabling Discussions, deleting remote branches, and revoking tokens.
- **Definition of done** for every task: tests added, docs updated, changeset added, CI green, `docs/ai/known-issues.md` updated when an issue is fixed.

---

## Phase A — Stabilize and harden → release `0.1.1`

Target: about 8 PRs. Workstreams A1 through A6 can be merged in any order, and A7 comes last.

### A1. CLI exit codes and failure reporting

**Problem found:** `build.ts` swallows per-app failures and exits 0. `test.ts` hard-codes `${rootDir}/apps/${app}` instead of `context.appsDir`, and doesn't normalize bare app names.

**Files:**
- New: `packages/cli/src/utils/exit.ts`
- Change: `packages/cli/src/commands/{build,test,dev}.ts`, `packages/cli/src/bin/index.ts`

**Steps:**
1. Create `utils/exit.ts`:
   ```ts
   export const ExitCode = { Ok: 0, UserError: 1, TaskFailed: 2, ConfigError: 3 } as const
   export class CliError extends Error { constructor(msg: string, public code: number = ExitCode.UserError) { super(msg) } }
   ```
2. In `build.ts`, collect `failures: string[]`.
   - At the end, print a summary table (`✔ built N, ✖ failed M`) and call `process.exitCode = ExitCode.TaskFailed` when M > 0.
   - Add `--bail` to stop at the first failure.
   - Reject when an explicit `[app]` isn't found (it's skipped today).
3. In `test.ts`, resolve the app through `discoverApps` and `normalizeAppName`, using `context.appsDir`. Extract `normalizeAppName` into `utils/discovery.ts` so `build` and `test` share it.
4. In `bin/index.ts`, use `program.exitOverride()` plus a top-level catch that maps `CliError` to its code and anything else to 1. Replace the scattered `process.exit()` calls with thrown `CliError`.

**Tests:** `commands/build.test.ts` mocks `execa` so one app rejects, and asserts that `process.exitCode === 2` and the summary line names the failed app. Add a test for `--bail` and for an unknown app returning 1, plus a `test.ts` path-resolution test.

**Commit:** `fix(cli): exit non-zero when build or test targets fail`

### A2. `--json` output for diagnostics

**Files:** `commands/{doctor,diagnostics,config}.ts`, `utils/output.ts`

**Steps:**
1. Add `printResult(data, { json })` to `output.ts`. With `--json`, it prints only `JSON.stringify(data, null, 2)` to stdout, with no spinners or colors.
2. Refactor `doctor` so its checks return `{ id, status: 'pass'|'warn'|'fail', message, hint? }[]` before rendering. In JSON mode it exits 2 when any check fails.

**Tests:** snapshot of the JSON shape for `doctor --json` in a temporary fixture project.

**Commit:** `feat(cli): add --json output to doctor, diagnostics and config`

### A3. Package hygiene and package checks in CI

**Files:** all six `packages/*/package.json`, root `package.json`, `turbo.json`, `.github/workflows/ci.yml`

**Steps:**
1. Add metadata to every library:
   - `"sideEffects": false` (`design` too, unless it ships CSS).
   - `"engines": { "node": ">=20" }`.
   - `"publishConfig": { "access": "public", "provenance": true }`.
2. Widen `@mfe-forge/testing` peers to `"vitest": ">=1.5 <5"`.
3. Run `npm pkg fix` in each package so `repository.url` uses the `git+https://` form, then commit the result.
4. Add root dev dependencies `publint` and `@arethetypeswrong/cli`. Add a per-package script:
   ```
   "check:package": "publint --strict && attw --pack . --profile esm-only"
   ```
5. Add tasks to `turbo.json`:
   - `"check:package": { "dependsOn": ["build"] }`
   - `"type-check": { "dependsOn": ["^build"] }`

   Add `"type-check": "tsc --noEmit"` to every package that lacks it.
6. Add steps to `ci.yml`: `bun run type-check` (root script `turbo run type-check`) and `bun x turbo run check:package`.

**Verify:** run `bun x turbo run check:package type-check` locally and fix every finding (likely `types` condition ordering in `exports`, which needs `types` first).

**Commit:** `chore(packages): add sideEffects, engines, provenance and package lint`

### A4. Repository cleanup

**Steps:**
1. In root `package.json`, remove the `templates/*` workspace entry and the `dev:test-scope:*` / `dev:default:test-pkg` scripts.
2. Move root docs into the site:
   - `FRAMEWORK.md` → `docs/concepts.md`
   - `COMPARISON.md` → `docs/comparison.md`
   - `EXAMPLE_PROJECT.md` → `docs/tutorials/example-project.md`
   - `PUBLISHING_CHECKLIST.md` → `docs/maintainers/releasing.md` (rewritten for the CI flow)

   Add sidebar entries in `docs/.vitepress/config.ts` and fix any README links that point to the moved files.
3. Set `packageManager` to `bun@1.3.x`, matching the version tested locally (use the exact version CI installs). Replace `npm install --global bun@1.1.0` and every `oven-sh/setup-bun@v1 bun-version: latest` with `oven-sh/setup-bun@v2` plus `bun-version-file: package.json`. Update `actions/*` to v5 consistently.
4. Run `bun install` and commit the lockfile only if it changed.

**Verify:** `bun run docs:build` passes with `ignoreDeadLinks: false`.

**Commit:** `chore(repo): consolidate root docs into site and pin toolchain`

### A5. Runtime a11y quick wins (`@mfe-forge/core`)

**Files:** `core/src/error-boundary.tsx`, `core/src/loader.tsx`, the matching tests, `packages/testing`

**Steps:**
1. In the default error fallback:
   - Make the wrapper `role="alert"` and give it an `<h2>` titled "{remote} failed to load".
   - Add a `<button type="button">Retry</button>` that calls a new `reset()` (sets `hasError: false` and evicts the cached remote through `evictRemoteComponent(remoteName)`).
   - Expose `reset` to function fallbacks: `fallback(error, reset)`. This is backward compatible because the second argument is extra.
   - Keep `data-testid="mfe-error"`.
2. Change `DefaultFallback` to `role="status"` and `aria-live="polite"`, mark the spinner `aria-hidden="true"`, and respect `prefers-reduced-motion` (no animation when it is set).
3. Add `vitest-axe` as a dev dependency of `core` and `testing`. Add `expect(await axe(container)).toHaveNoViolations()` for the default error, loading and success states.

**Tests:** Retry re-renders the remote after a transient failure (the first import rejects and the second resolves). Add role queries with `getByRole('alert')` and `getByRole('status')`.

**Changeset:** minor-level behavior, shipped as a patch with a note, since the change is additive.

**Commit:** `feat(core): accessible error and loading fallbacks with retry`

### A6. Governance files 🔒 (for the GitHub settings part)

**Files:**
- `SECURITY.md`
- `CODE_OF_CONDUCT.md`
- `SUPPORT.md`
- `.github/ISSUE_TEMPLATE/{bug_report.yml,feature_request.yml,docs.yml,config.yml}`
- `.github/PULL_REQUEST_TEMPLATE.md`
- `.github/CODEOWNERS` (`* @rez-rayan-zin-eddine`)
- `.github/renovate.json`

**Steps:**
1. The bug form requires the version, package manager, Node version and the output of `npx mfe-forge doctor --json` (depends on A2).
2. Renovate config: `config:recommended`, group rules for `react*`, `vite*` and `vitest*`, `@module-federation/*`, `@changesets/*`, a weekly schedule, and automerge for dev-dependency patches.
3. 🔒 Ask the user before doing any of these: enable private vulnerability reporting, enable Discussions, install the Renovate app.

**Commit:** `docs(repo): add governance files, issue forms and Renovate config`

### A7. CI release hardening and the `0.1.1` release 🔒

**Files:** `.github/workflows/{release,deploy-docs,ci}.yml`, `.changeset/config.json`

**Steps:**
1. Rewrite `release.yml`:
   - Add `permissions: { contents: write, pull-requests: write, id-token: write }`.
   - Pin Bun and run `install --frozen-lockfile`.
   - Run `lint`, `type-check`, `test`, `build` and `check:package` before `changesets/action@v1`.
   - Set the env var `NPM_CONFIG_PROVENANCE: true`.
2. Switch the changelog to `@changesets/changelog-github` with `{ "repo": "rez-rayan-zin-eddine/mfe-forge" }`.
3. Add a `changeset-check` job to `ci.yml` for PRs: `bunx changeset status --since=origin/main`. It's skipped when the PR touches no `packages/**`.
4. Add a `docs:build` job to `ci.yml`. In `deploy-docs.yml`, pin Bun and also trigger on `packages/**/src` (needed once the reference docs are generated in B5).
5. 🔒 These need the user:
   - npm Trusted Publishing for all 6 packages (npmjs.com → package → Settings → Trusted Publisher → GitHub Actions, workflow `release.yml`). Until it is configured, keep `NPM_TOKEN: ${{ secrets.NPM_CONFIG_TOKEN }}`, updated to a fresh `rez-rayan` automation token.
   - Switch GitHub Pages to "GitHub Actions" and delete the `gh-pages` branch (already authorized earlier; I confirm the current state before acting).
   - Branch protection on `main` with required checks: `verify`, `docs`, `changeset-check`.
6. Merge the "Version Packages" PR that Changesets opens, which publishes `0.1.1` from CI.
7. Verify from a clean temporary directory:
   ```
   npm view mfe-forge@0.1.1 dist.attestations
   npx mfe-forge@0.1.1 --version
   npx mfe-forge@0.1.1 init smoke --yes && cd smoke && <pm> install && <pm> run build
   ```
8. Once provenance works: 🔒 remove the `NPM_CONFIG_TOKEN` secret, remind the user to revoke the leaked tokens, and remove `da_vvoolf` as an owner.

**Commit:** `ci: harden release pipeline with provenance and pinned toolchain`

**Phase A exit criteria:** `0.1.1` published with provenance from CI, `main` protected, all checks green, and the two known issues for exit codes and Pages fixed.

---

## Phase B — Modern federation core → `0.2.0`

### B0. Spike and ADR (no merge to the packages)

1. Create a scratch folder `spikes/mf2/` (git-ignored). Build one host and one remote with `@module-federation/vite` on Vite 6 (or Vite 7 if MF supports it), React 19, a shared singleton React, and the `mf-manifest.json` remote.
2. Record what works: dev HMR across remotes, `dts` type generation, manifest loading, and the `shared` version check.
3. Write `docs/ai/decisions/0003-federation-adapter.md`. It covers the decision, the `FederationAdapter` interface, the migration path, and keeping `@originjs` deprecated for 0.2.x only.

   Note: `config.ts` already allows `federation.plugin: '@module-federation/vite'`. The ADR makes MF 2.0 the default.

**Commit:** `docs(adr): 0003 federation adapter`

### B1. New package `@mfe-forge/vite`

**Layout:** `packages/vite/{package.json,tsup.config.ts,vitest.config.ts,src/{index.ts,plugin.ts,adapters/{mf2.ts,originjs.ts},shared-preset.ts,types.ts}}`

**API:**
```ts
export function mfeForge(options?: { app?: string; configFile?: string }): Plugin[]
export const sharedPreset: Record<string, SharedConfig>
```

**Behavior:**
- Loads the project config through B3.
- Finds the current app by `cwd`.
- Resolves `exposes` (for remotes) and `remotes` (for hosts, from config or the manifest URLs per `mode`).
- Returns the adapter's plugins.

**Release setup:** add it to the Changesets `fixed` group and to `turbo` and CI. The first publish happens through the Phase B release. 🔒 Trusted Publishing must be configured for the new package name, and the first publish of a new name may need the token path.

**Tests:**
- Unit tests for remote resolution per mode.
- An adapter contract test suite that every adapter must pass.
- A fixture-based test that runs `vite build` programmatically on a tiny host plus remote and asserts that `remoteEntry.js` and `mf-manifest.json` exist.

### B2. Templates and generators on the plugin

1. Rewrite `templates/{host,app}/vite.config.ts` as `plugins: [react(), tailwindcss(), mfeForge()]` and remove the inline `federation({...})`.
2. Update the template `package.json` files: `vite ^6`, `@vitejs/plugin-react ^5`, `@mfe-forge/vite`, and drop `@originjs`.
3. `generate` stops editing the host `vite.config.ts`. It writes the remote into `mfeforge.config.ts` through B3's structured writer.
4. `sync` becomes:
   - read the config;
   - regenerate `src/remotes/declarations.d.ts`, or nothing at all when MF `dts` is enabled;
   - validate ports and names.

   Remove the regex in `sync.ts:11`.

**Tests:** update `generate.test.ts` and `sync.test.ts`. Add an idempotency test: running `sync` twice produces no diff.

### B3. Real config loading and structured writes

1. Replace the cosmiconfig plus stripped-import loader with `c12` (which uses jiti under the hood).
2. Export `defineConfig` from `mfe-forge`, and generate a JSON schema from zod into `packages/cli/schema/mfeforge.schema.json`. Publish it and reference it in docs.
3. Write config with `magicast` (`loadFile`, then edit `config.apps`, then `writeFile`), which preserves the user's formatting. Fall back to a clear error when the export isn't a statically analyzable object.
4. Close the corresponding known issues.

### B4. Runtime registry upgrades (`@mfe-forge/core`)

1. `RemoteRegistry.register({ name, manifestUrl | entryUrl, fallbackUrl?, retries?, timeoutMs? })`.
2. `loadRemote(name, module)` retries with exponential backoff, applies a timeout, falls back to the fallback URL, and emits health status.
3. Add an MF 2.0 runtime plugin export (`@mfe-forge/core/mf-runtime-plugin`) that routes errors to the registry.

**Tests:** fake timers for the backoff, plus the fallback path.

### B5. Shared dependency guard, codemod and docs

1. `doctor` check: compare the `shared` ranges of the host and each remote with `semver.intersects`, and fail on mismatches. At runtime in dev, warn when a remote's shared version is rejected.
2. Add `mfe-forge migrate federation`. It is a codemod with `magicast` that removes `federation()` from `vite.config.ts`, moves the remotes and exposes into `mfeforge.config.ts`, and adds `mfeForge()`. It supports a dry-run diff.
3. Write a docs page: "Migrating from @originjs to Module Federation 2.0".
4. Release: run `changeset pre enter next`, publish `0.2.0-next.N` via CI for feedback, then `pre exit` and release `0.2.0`.

**Phase B exit:** a newly initialized project builds on Vite 6+ with MF 2.0 and no hand-written federation config, and the end-to-end smoke test from A7 passes.

---

## Phase C — Typed contracts and developer experience → `0.3.0`

| ID | Task | Key files | Verification |
|---|---|---|---|
| C1 | `createEventBus<Events>()` generic overloads. Optional `schema` per event using the Standard Schema interface (no runtime dependency). The untyped `EventBus` stays. | `core/src/event-bus.ts`, `types.ts` | Type tests with `expectTypeOf` (vitest), plus runtime validation tests |
| C2 | `mfe-forge generate contract <name>` scaffolds `packages/<scope>-contracts` (events map, store slice types, exposed-props types), wired into the host and remotes as a workspace dependency | `cli/src/templates/contract/`, `generate.ts` | Generator test plus a fixture that type-checks |
| C3 | Enable MF `dts` in the adapter. Remove the manual declarations when it is on. | `vite/src/adapters/mf2.ts` | The fixture host type-checks `import('remote/App')` |
| C4 | Router: React Router 7 lazy route modules for remotes, `useRemoteNavigate`, focus management after navigation (focus `h1` or `[data-mfe-focus]`) | `router/src/*` | RTL tests, plus an axe check for focus |
| C5 | Store: devtools middleware option, `BroadcastChannel` cross-tab sync, SSR guards | `store/src/*` | Unit tests with a mocked `BroadcastChannel` |
| C6 | CLI: `add` (interactive wrapper around generate), `graph --format mermaid\|json`, `upgrade` (bumps `@mfe-forge/*` to the CLI version and runs the codemods it registers) | `cli/src/commands/{add,graph,upgrade}.ts` | Fixture tests and snapshot output |

Each C task is its own PR and changeset.

---

## Phase D — Production readiness → `1.0.0-rc`

| ID | Task | Detail |
|---|---|---|
| D1 | End-to-end harness | `e2e/` workspace with Playwright. The script runs `init → generate host + 2 remotes → install → build → preview`. Tests check that the remote renders, that axe reports no violations, and that killing a remote shows the alert with a working Retry. GitHub matrix: `{npm, pnpm, bun} × node {20, 22, 24}` on Ubuntu, plus `bun × 22` on Windows. Run on PRs that touch `packages/cli/**` or templates, and nightly. |
| D2 | Observability | `onRemoteLoad`, `onRemoteError` and `onRemoteSlow(thresholdMs)` on the registry and loader. Errors include `{ remoteName, version, url }`. Docs recipe for Sentry and OpenTelemetry. |
| D3 | Performance | `size-limit` per runtime package, with budgets set at current size + 10% and enforced in CI. `preloadRemote(name)` plus a `<RemoteLink prefetch="hover|idle">` helper. |
| D4 | Security | `RemoteRegistry` allowlist of origins, optional SRI hash in the manifest config, CSP docs page. |
| D5 | SSR ADR | `0004-ssr-scope.md`: decision only. |
| D6 | API freeze | Add `@microsoft/api-extractor` per package and commit the `*.api.md` reports. CI fails on unreviewed API changes. Every export carries TSDoc, enforced by the `eslint-plugin-tsdoc` rule. |
| D7 | 1.0 release | `changeset pre enter rc`, run the RC for 30 days with the end-to-end matrix green, publish the 0.x → 1.0 migration guide, freeze the docs as `/v0.x/`, then release `1.0.0`. |

---

## Docs workstream (runs alongside B–D)

| ID | Task | Detail |
|---|---|---|
| W1 | Information architecture | Restructure `docs/.vitepress/config.ts` into Guide, How-to, Reference, Architecture and Maintainers sections (ROADMAP §4.1). Add the ADR index page generated from `docs/ai/decisions`. |
| W2 | Generated reference | `typedoc` + `typedoc-plugin-markdown` → `docs/reference/api/<pkg>`. Add `scripts/gen-cli-docs.ts`, which walks the Commander program and writes `docs/reference/cli.md`, and `scripts/gen-config-schema.ts` for the config reference. The root `docs:gen` script runs before `docs:build`. CI runs `git diff --exit-code` after `docs:gen`. |
| W3 | Examples | `examples/basic`, `examples/shared-store` and `examples/typed-events` as workspaces built in CI. Each tutorial page links to them on StackBlitz (`https://stackblitz.com/github/rez-rayan-zin-eddine/mfe-forge/tree/main/examples/<name>`). |
| W4 | Error codes | `cli/src/utils/errors.ts` holds a registry `MFE_E0xx → { message, docs }`. Every `CliError` and runtime error carries a code and URL. `docs/reference/errors.md` is generated from the registry. |
| W5 | Docs quality | `pa11y-ci` or Lighthouse CI on the built site in the `docs` job, `ignoreDeadLinks: false`, OG image, `llms.txt` and `llms-full.txt` from a VitePress build hook. |
| W6 | Versioned docs | Build `main` to `/next/` and the latest release tag to `/`. At 1.0, freeze `/v0.x/`. Add a nav version switcher. The deploy workflow builds both from tags. |
| W7 | Package READMEs | One template for all six or seven packages: badges (npm, size, CI, provenance), install, a 10-line example, API table, peers, links. |

---

## Order of execution

```
Week 1   A1 → A2 → A3 → A4 → A5        (code PRs, parallel-safe)
         A6 → A7 🔒 → release 0.1.1
Week 2   B0 spike + ADR, W1
Week 3-5 B3 → B1 → B2 → B4 → B5 → 0.2.0-next → 0.2.0, W2, W7
Week 6-8 C1–C6 (any order; C3 after B1), W3, W4 → 0.3.0
Week 9+  D1 first (it protects everything else), D2–D6, W5, W6 → 1.0.0-rc → 1.0.0
```

## What I need from the user (consolidated 🔒 list)

1. npm: configure Trusted Publishing for all packages (including `@mfe-forge/vite` before its first publish), require 2FA for publishing, remove `da_vvoolf`, revoke the leaked tokens.
2. GitHub: branch protection on `main`, Pages source set to "GitHub Actions", enable Discussions and private vulnerability reporting, install the Renovate app.
3. Approval for each published release (merging the "Version Packages" PR).

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| `@module-federation/vite` lags Vite releases | The adapter layer, a pinned tested range in `doctor`, and the B0 spike before committing |
| Breaking users on 0.2.0 | `next` pre-releases, the codemod, the migration guide, and a deprecated `@originjs` adapter for one minor |
| The end-to-end matrix is slow or flaky | Run it only on CLI or template changes plus nightly, cache installs, retries=1 in Playwright |
| Single maintainer | npm org plus a second owner (A7), docs for every maintainer process |
