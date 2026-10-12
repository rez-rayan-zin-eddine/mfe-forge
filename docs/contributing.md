# Contributing

This page summarises how to work on the MFE Forge repository. The canonical sources are [`CONTRIBUTING.md`](https://github.com/rez-rayan-zin-eddine/mfe-forge/blob/main/CONTRIBUTING.md) and the repository contract in [`AGENTS.md`](https://github.com/rez-rayan-zin-eddine/mfe-forge/blob/main/AGENTS.md). By participating you agree to the [code of conduct](https://github.com/rez-rayan-zin-eddine/mfe-forge/blob/main/CODE_OF_CONDUCT.md). Report security issues privately as described in [SECURITY.md](https://github.com/rez-rayan-zin-eddine/mfe-forge/blob/main/SECURITY.md); questions go to [SUPPORT.md](https://github.com/rez-rayan-zin-eddine/mfe-forge/blob/main/SUPPORT.md).

## Requirements

- Node.js 20 or newer (CI uses Node 24).
- Bun at the version pinned in the root `package.json` (`"packageManager": "bun@1.4.2"`). CI reads that field through `oven-sh/setup-bun` with `bun-version-file: package.json`.

## Setup

```bash
git clone https://github.com/rez-rayan-zin-eddine/mfe-forge.git
cd mfe-forge
bun install --frozen-lockfile
bun run build
bun run test
```

## Repository scripts

Defined in the root `package.json`; most delegate to Turborepo.

| Script                                     | Command                   | Purpose                         |
| ------------------------------------------ | ------------------------- | ------------------------------- |
| `build`                                    | `turbo run build`         | Build every package with `tsup` |
| `dev`                                      | `turbo run dev`           | Watch builds                    |
| `test`                                     | `turbo run test`          | Vitest in every package         |
| `type-check`                               | `turbo run type-check`    | `tsc --noEmit` per package      |
| `check:package`                            | `turbo run check:package` | `publint --strict` per package  |
| `lint`                                     | `eslint .`                | Lint the repository             |
| `format`                                   | `prettier --write .`      | Format the repository           |
| `docs:dev` / `docs:build` / `docs:preview` | `vitepress ...`           | Documentation site in `docs/`   |
| `changeset`                                | `changeset`               | Add a changeset                 |
| `version-packages`                         | `changeset version`       | Apply pending changesets        |
| `release`                                  | `changeset publish`       | Publish unpublished versions    |

Run a focused check first, for example one package's tests:

```bash
cd packages/cli && bunx vitest run src/commands/sync.test.ts
```

then the full matrix before opening a pull request:

```bash
bun run lint && bun run type-check && bun run build && bun run test && bun run check:package && bun run docs:build
```

## Workflow

1. Read `AGENTS.md` and the relevant procedure in `.agents/skills/`.
2. Create a focused branch.
3. Inspect existing APIs and tests before editing.
4. Add tests for changed behaviour.
5. Keep documentation and CLI help truthful. If a doc page claims a command does something, the source must do it.
6. Add a changeset (`bun changeset`) when a published package or a template changes.
7. Run the checks above and review `git diff --check`.

Architecture decisions go into `docs/ai/decisions/` as ADRs.

## Commits and pull requests

Use Conventional Commits: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `chore:`, optionally with a scope such as `feat(core):`. A pull request should state the behaviour change, the verification commands you ran and any remaining limitations; the pull request template lists the checklist.

## Changesets

All six packages are in one **fixed** group in `.changeset/config.json` (`mfe-forge`, `@mfe-forge/core`, `router`, `store`, `design`, `testing`), so any release bumps all of them to the same version. Packages publish with `access: public`. Changelogs use `@changesets/changelog-github`, which links each entry to its pull request and author; running `changeset version` locally therefore needs a `GITHUB_TOKEN`, for example `GITHUB_TOKEN=$(gh auth token) bun run version-packages`.

```bash
bun changeset          # choose packages and bump type, write a summary
```

The project is on `0.x`: a minor bump may break APIs, a patch is fixes only.

## Continuous integration

`.github/workflows/ci.yml` runs on pushes and pull requests to `main`:

| Job               | Steps                                                                                                                                                               |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `verify`          | `bun install --frozen-lockfile`, `lint`, `type-check`, `build`, `test`, `check:package`                                                                             |
| `docs`            | `bun run docs:build` (VitePress with dead-link checking enabled)                                                                                                    |
| `changeset-check` | Pull requests only. If the diff touches `packages/*/src/**` or `packages/*/package.json`, runs `changeset status --since=origin/main` and fails without a changeset |

`audit.yml` runs `bun audit --audit-level=high` every Monday (and on manual dispatch), with two documented ignores for dev-only advisories.

## Release process

`.github/workflows/release.yml` runs on every push to `main`:

1. Checks out the full history, sets up Node 24 with the npm registry and the pinned Bun.
2. `bun install --frozen-lockfile`, then `lint`, `type-check`, `build`, `test` and `check:package`.
3. Runs `changesets/action`:
   - while changesets are pending, it opens or updates a pull request titled `chore(release): version packages`;
   - when that pull request is merged, it runs `bun run release` (`changeset publish`) and creates GitHub releases.

Publishing uses npm provenance (`NPM_CONFIG_PROVENANCE=true` with `id-token: write`), so provenance is only produced by CI. Authentication currently uses the `NPM_CONFIG_TOKEN` repository secret; the plan is to move every package to npm trusted publishing and remove the token. Do not run `npm publish` by hand.

After a release, verify from outside the repository (inside it, `npx` resolves the workspace):

```bash
npm view mfe-forge@<version>
npx mfe-forge@<version> --version
```

## Documentation

The site is built with VitePress from `docs/`. `deploy-docs.yml` builds `docs/.vitepress/dist` and deploys it with `actions/deploy-pages` when `docs/**`, a package README or the workflow changes on `main`, or on manual dispatch. The repository's Pages source must be set to **GitHub Actions** for the deployment to take effect.

```bash
bun run docs:dev       # local preview with hot reload
bun run docs:build     # what CI runs; fails on dead links
```

Use relative links between pages.
