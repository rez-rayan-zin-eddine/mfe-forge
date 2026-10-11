# MFE Forge — Roadmap to 1.0

Status as of 2026-10-11, after the `0.1.0` release. This plan is based on the repository at `main@262a0da` and on the published npm state.

## 1. Where the framework stands

### Strengths

- The scope is clear: a CLI (`mfe-forge`) plus five small runtime packages (`core`, `router`, `store`, `design`, `testing`). The runtime packages total roughly 1.5k lines of source.
- The release is clean. All six packages are on `0.1.0` with fixed versioning through Changesets, 2.x–8.x are deprecated, and `rez-rayan` owns every package.
- The packages are ESM-only with `exports` maps and `.d.ts` files. Peer dependencies are declared for React 19, React Router 7 and Zustand 5.
- There are 133 passing tests. CI runs lint, build and test.
- The repository has an agent contract (`AGENTS.md`, `.agents/`), ADRs in `docs/ai/decisions`, and a VitePress docs site.

### Gaps (from reading the code)

| Area | Finding | Impact |
|---|---|---|
| Federation runtime | Templates use `@originjs/vite-plugin-federation` (largely unmaintained) and pin `vite ~5.4`. | Locks users out of Vite 6/7, Module Federation 2.0 features (manifest, runtime plugins, type hints) and Rspack interop. **Biggest strategic risk.** |
| Remote wiring | `generate` and `sync` rewrite the `remotes: {}` block in `vite.config.ts` as text (see `docs/ai/known-issues.md`). | Breaks as soon as a user refactors their config. |
| Config loading | `mfeforge.config.ts` is loaded without a TS compiler, and its imports are stripped. | Surprising failures and no reuse of shared config. |
| CLI exit codes | `build` reports per-app failures but still prints "Build complete" and exits `0` (`packages/cli/src/commands/build.ts`). | CI pipelines go green on failed builds. |
| Event bus | `on<T = any>(event: string, ...)` takes untyped string events. | There is no cross-MFE contract, so typos and payload drift only show up at runtime. |
| Runtime a11y | The error fallback and loading states have no `role`, `aria-live` or focus management. | Remote failures are invisible to screen readers. |
| Shared deps | Every template hard-codes `shared` versions. | Version skew between host and remotes is never detected. |
| Package hygiene | No `sideEffects`, no `engines` on libraries, `@mfe-forge/testing` peers on `vitest ^1.5`, and there are no publint or are-the-types-wrong checks. | Tree-shaking, compatibility and type-resolution problems reach users. |
| Releases | `release.yml` uses `bun-version: latest`, doesn't run tests, has no npm provenance, and relies on a long-lived `NPM_TOKEN`. | Builds aren't reproducible, nothing proves the supply chain, and a leaked token gives full publish access. |
| Repo governance | `main` has no branch protection. There's no `SECURITY.md`, `CODE_OF_CONDUCT.md`, issue/PR templates or CODEOWNERS. | Contributors can't easily join, and security reports have no channel. |
| Repo clutter | The root `package.json` lists the `templates/*` workspace (it doesn't exist) and leftover `dev:test-scope:*` scripts. Several root docs overlap: `FRAMEWORK.md`, `COMPARISON.md`, `EXAMPLE_PROJECT.md`, `PUBLISHING_CHECKLIST.md`, `GEMINI.md`. | Newcomers get confused about which document to trust. |
| Docs | There's no API reference, no runnable example, no versioned docs, no search tuning, and no ADR index on the site. | Adoption is hard. Users read source to learn the API. |
| Testing | No end-to-end test of `init → generate → install → build → serve → load remote`, and coverage isn't measured or gated. | Template regressions (the most common bug class so far) go undetected. |

## 2. Guiding principles

1. **Adapters over lock-in.** The federation runtime and bundler sit behind an adapter interface. Vite + MF 2.0 is the first adapter.
2. **Structured edits, never text injection.** Config changes go through an AST (`magicast`/`recast`) or a generated file the user imports.
3. **Contracts at the boundary.** Events, shared state and exposed modules carry types that both host and remote can import.
4. **Every claim is tested end to end.** If the README says a command works, a CI job proves it.
5. **Boring releases.** Semver, changesets, provenance, and no manual publishing.

## 3. Phased plan

Each phase is shippable on its own. Version numbers assume the fixed versioning stays in place.

### Phase A — Stabilize and harden (0.1.x patches, ~1–2 weeks)

Goal: make the existing surface trustworthy.

- **CLI correctness**
  - `build`, `test` and `dev`: collect failures and exit non-zero when any target fails. Add `--bail` and `--continue` flags. Add tests for exit codes.
  - Use an `ExitCode` enum everywhere (`0` ok, `1` user error, `2` build/test failure, `3` config error).
  - Add `--json` output for `doctor`, `diagnostics` and `config`, so tools and AI agents can consume them.
- **Package hygiene**
  - Add `"sideEffects": false` (or `["*.css"]`) and `"engines": { "node": ">=20" }` to every library.
  - Widen the `@mfe-forge/testing` peer to `vitest >=1.5 <5` and test against the newest major.
  - Add [`publint`](https://publint.dev) and [`@arethetypeswrong/cli`](https://arethetypeswrong.github.io) to CI as a `check:package` task in Turbo.
  - Run `npm pkg fix` to remove the `repository.url` publish warnings, then commit the normalized fields.
- **Repo cleanup**
  - Remove the `templates/*` workspace entry and the `dev:test-scope:*` / `dev:default:*` scripts.
  - Merge `FRAMEWORK.md`, `COMPARISON.md` and `EXAMPLE_PROJECT.md` into the docs site and delete them from the root. Replace `PUBLISHING_CHECKLIST.md` with `docs/maintainers/releasing.md`.
  - Align `packageManager` with the Bun version CI actually uses, and pin it in every workflow (no `latest`).
- **Runtime a11y quick wins** (`@mfe-forge/core`)
  - Default error fallback: `role="alert"`, a visible heading, and a retry `<button>` that resets the boundary.
  - Loading fallback: `role="status"` and `aria-live="polite"` with a visually hidden "Loading {remote}" label.
  - Add a `jest-axe`/`vitest-axe` assertion to the core and testing test suites.

### Phase B — Modern federation core (0.2.0, ~3–5 weeks)

Goal: remove the biggest strategic risk.

- **Adopt Module Federation 2.0** through [`@module-federation/vite`](https://github.com/module-federation/vite) and support Vite 6/7.
  - Write ADR `0003-federation-adapter.md` that defines a `FederationAdapter` interface: `createHostConfig`, `createRemoteConfig`, `readRemotes`, `writeRemotes`, `typesStrategy`.
  - Ship `@mfe-forge/vite` (new package). It provides a Vite plugin that reads `mfeforge.config.ts` and configures federation itself, so users never hand-edit `remotes`.
  - Keep `@originjs` as a deprecated adapter for one minor release, with a codemod (`mfe-forge migrate federation`).
- **Remove textual config editing.** Remotes now live in `mfeforge.config.ts` (or a generated `mfe.remotes.json`) and the Vite plugin consumes them. `sync` becomes a pure data operation.
- **Real config loading.** Use [`jiti`](https://github.com/unjs/jiti) or `c12` so `mfeforge.config.ts` supports imports, `defineConfig()` typing and env overrides.
- **Runtime remote manifest.** Hosts load `mf-manifest.json` URLs per environment, which enables independent deploys. Extend `RemoteRegistry` with health checks, retry with backoff, and a fallback URL.
- **Shared dependency guard.** Add a `doctor` check plus a runtime dev warning when a remote's `shared` ranges don't overlap the host's. A single `shared` preset in `@mfe-forge/vite` replaces the per-template copies.

### Phase C — Typed contracts and developer experience (0.3.0, ~3–4 weeks)

- **Typed event bus.** `createEventBus<Events>()` with a `Events` map type, so `emit` and `on` are checked end to end. Keep the untyped API as an overload. Add optional runtime validation through Standard Schema (zod, valibot).
- **Contracts package.** `mfe-forge generate contract <name>` scaffolds a shared `@scope/contracts` workspace package holding event maps, store slices and exposed-module prop types.
- **Federated types.** Use MF 2.0 `dts` generation, so `import('remote/App')` is typed in the host without manual `declarations.d.ts`.
- **Router.** Nested remote routes with lazy route modules from React Router 7, plus `useRemoteNavigate` for cross-MFE navigation with base-path awareness. Focus moves to the main heading after a route change (a11y).
- **Store.** Devtools integration for scoped stores, cross-tab sync through `BroadcastChannel`, and SSR-safe guards.
- **CLI DX.** Interactive `mfe-forge add` (remote, page, contract), `mfe-forge graph` (prints or exports the host-to-remote topology as Mermaid or JSON), and `mfe-forge upgrade` (bumps every `@mfe-forge/*` package and runs codemods).

### Phase D — Production readiness (0.4.0 → 1.0.0-rc, ~4–6 weeks)

- **End-to-end CI matrix.** A job that runs `init → generate host + 2 remotes → install → build → preview → Playwright loads remote and asserts axe-clean`. Matrix: npm, pnpm and bun on Node 20/22/24 for Linux, plus one Windows job (path handling).
- **Observability hooks.** Add `onRemoteLoad`, `onRemoteError` and `onRemoteSlow` callbacks on `RemoteLoader` and `RemoteRegistry`, so users can plug in Sentry or OpenTelemetry. Record the remote name and version in the error context.
- **Performance.** Add `size-limit` budgets per package in CI, plus preloading and prefetch of remotes on hover or idle (`preloadRemote()`).
- **Security.** Optional remote allowlist and Subresource Integrity on remote entries. Document a CSP recipe.
- **SSR investigation.** Write an ADR only, not an implementation. Decide whether React Router framework mode plus MF 2.0 SSR is in scope for 1.x.
- **1.0 criteria.** API frozen and reviewed with API Extractor reports, the end-to-end matrix green for 30 days, docs complete for every public export, and the migration guide from 0.x published.

## 4. Documentation and accessibility of the project

"Accessibility" here covers two things: how easy the project is to discover and adopt, and real a11y in the runtime and docs.

### 4.1 Docs information architecture (VitePress)

```
Guide          → Why MFE Forge · Quick start (5 min) · Concepts (host, remote, shared, contracts) · Tutorials
How-to         → Add a remote · Share state · Cross-MFE routing · Deploy remotes independently · Migrate from @originjs
Reference      → CLI (generated) · Config schema (generated) · API per package (generated) · Error codes
Architecture   → ADR index · Federation adapter · Runtime lifecycle diagrams
Maintainers    → Releasing · Triage · Support policy
```

- **Generated reference.** Generate the API reference with TypeDoc and `typedoc-plugin-markdown` from TSDoc comments, the CLI reference from Commander metadata (`mfe-forge docs:cli`), and the config schema from the zod schema (`zod-to-json-schema`, which also gives editors autocomplete). CI fails when the generated docs are stale.
- **Runnable examples.** Add an `examples/` workspace (`basic-host-remote`, `shared-store`, `typed-events`) that the end-to-end job builds. Embed them through StackBlitz (WebContainers) links on every tutorial page.
- **Versioned docs.** Publish `/mfe-forge/` (latest), `/mfe-forge/next/` (from `main`) and frozen `/mfe-forge/v0.x/` when 1.0 ships. Add a version switcher in the nav.
- **Error codes.** Every CLI and runtime error gets a code (`MFE_E001`) and a docs URL printed in the message.
- **Docs a11y.** Run Lighthouse CI or `pa11y-ci` on the built site. Require alt text on diagrams, and include `prefers-reduced-motion` and contrast checks for the custom theme.
- **Discoverability.** Add a `llms.txt` and `llms-full.txt` generated from the docs, for AI assistants. Add OpenGraph images, npm keywords, and GitHub topics such as `module-federation-2`.
- **Fix GitHub Pages deploy.** Switch the source to GitHub Actions, pin Bun, and add a docs build to PR CI so broken links (`vitepress build` with `ignoreDeadLinks: false`) fail early.

### 4.2 Per-package READMEs

Use the same template for each package: what it is (one line), install command, a 10-line example, an API table linking to the reference, compatibility (peers), and links. Add badges for npm version, bundle size, CI and provenance.

## 5. Versioning strategy

- **Keep fixed versioning until 1.0.** The packages are co-designed, and one version number is easier for users. Reconsider "linked" mode after 1.0 if `design` or `testing` start moving at a different pace.
- **0.x semantics.** A minor bump (`0.2.0`) may break things and must ship with a migration note and, where possible, a codemod. A patch is fixes only. The rules go into `docs/maintainers/versioning.md`.
- **Pre-release channels.**
  - `next` dist-tag: Changesets pre mode (`changeset pre enter next`) for release candidates.
  - Snapshot releases: `changeset version --snapshot pr-<n>`, published to the `pr` tag by a manually triggered workflow, so contributors can try PRs with `npx mfe-forge@pr-123`.
- **Deprecation policy.** A deprecated API gets a runtime `console.warn` (dev only) and a TSDoc `@deprecated` for at least one minor release before removal.
- **Support policy.** Only the latest minor gets fixes before 1.0. After 1.0: current major plus security fixes for the previous major for 6 months. Track Node LTS, React current and previous major, and Vite current and previous major.
- **CLI ↔ runtime compatibility.** `init` and `generate` write `mfeForgeVersion` from the CLI's own version (already done). `doctor` warns when a project's `@mfe-forge/*` versions differ from the CLI's.
- **Changelogs.** Switch to `@changesets/changelog-github` so entries link PRs and authors. Require a changeset on any PR that touches `packages/*/src` (enforced with `changeset status --since=origin/main` in CI).

## 6. Repository maintenance

### 6.1 Governance files

- `SECURITY.md`: private vulnerability reporting through GitHub advisories, with a response SLA.
- `CODE_OF_CONDUCT.md` (Contributor Covenant), plus `SUPPORT.md` that points to Discussions.
- `.github/ISSUE_TEMPLATE/` with issue forms for bug reports (asking for the `mfe-forge doctor --json` output), feature requests and docs issues. Add `config.yml` to send questions to Discussions.
- `PULL_REQUEST_TEMPLATE.md` with a checklist: changeset, tests, docs.
- `CODEOWNERS`, and enable GitHub Discussions.

### 6.2 Branch and CI policy

- Protect `main`: require PRs, passing checks (`lint`, `typecheck`, `test`, `build`, `check:package`, `docs:build`, `e2e`), linear history and signed tags for releases.
- Add a `typecheck` Turbo task (`tsc --noEmit`) and run it in CI. Today type errors only surface through the tsup DTS build.
- Collect coverage through `@vitest/coverage-v8` with a floor (start at the current number, ratchet up). Upload the report as an artifact.
- Turbo remote cache on CI (Vercel or a self-hosted `turborepo-remote-cache`).
- Renovate (preferred over Dependabot for monorepos), with grouped updates per ecosystem (`react`, `vite`, `vitest`, `@module-federation/*`), automerge for dev-dependency patches, and a weekly schedule.
- Keep the weekly `audit.yml`. Add OpenSSF Scorecard and CodeQL.

### 6.3 Release pipeline

1. Contributors add changesets. The Changesets bot opens a "Version Packages" PR.
2. Merging it runs `release.yml`: pinned Bun, `install --frozen-lockfile`, `lint`, `typecheck`, `test`, `build`, `check:package`, then `changeset publish`.
3. **Publish with npm Trusted Publishing (OIDC)** and provenance. Add `permissions: id-token: write` and `NPM_CONFIG_PROVENANCE=true`, then remove the `NPM_CONFIG_TOKEN` secret entirely. Configure each of the 6 packages on npmjs.com → Settings → Trusted publishers → GitHub Actions (`rez-rayan-zin-eddine/mfe-forge`, `release.yml`).
4. Create a GitHub release with notes from the changesets. Deploy the docs.
5. After publishing, smoke test: `npx mfe-forge@<version> init tmp && build`, run from a clean temporary directory.
6. Enable 2FA "required for publish and settings" on every package. Remove `da_vvoolf` as an owner and add a second maintainer account or an npm org (`@mfe-forge` org with a team) so the project doesn't depend on one person.

### 6.4 Maintainer rhythm

| Cadence | Task |
|---|---|
| Weekly | Triage new issues (labels: `bug`, `docs`, `good first issue`, `needs-repro`), merge the Renovate batch, check the audit run |
| Per minor | Update the compatibility matrix, run the end-to-end matrix locally on Windows, refresh the docs screenshots |
| Monthly | Publish a public roadmap update in Discussions and review stale PRs and issues |
| Quarterly | Review the dependency majors (Vite, React, MF), revisit ADRs, check the support policy |

## 7. Success metrics

- Time from `npx mfe-forge init` to a host rendering a remote: **under 5 minutes**, measured by the end-to-end job.
- Zero manual edits of `vite.config.ts` needed for a standard host or remote.
- 100% of public exports documented. API Extractor reports have no undocumented items.
- CI green rate on `main` above 95%. Median time to first response on issues under 72 hours.
- Weekly npm downloads and GitHub stars tracked monthly, as adoption signals.

## 8. Immediate next actions (this week)

1. Fix the `build`/`test` exit codes, then release `0.1.1` through the Changesets workflow (it also tests the CI publish path).
2. Set up npm Trusted Publishing, remove `NPM_CONFIG_TOKEN`, and revoke the leaked tokens.
3. Turn on branch protection for `main` and add `typecheck`, `publint` and `attw` to CI.
4. Add the governance files and issue forms. Enable Discussions.
5. Switch GitHub Pages to Actions and pin Bun in all workflows.
6. Write ADR 0003 (federation adapter) and start a spike on `@module-federation/vite` with one host and one remote.
