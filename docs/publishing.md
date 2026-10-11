# Publishing guide

MFE Forge publishes its packages as one fixed version group: `mfe-forge` (CLI) and `@mfe-forge/core`, `router`, `store`, `design`, `testing`. The group is configured in `.changeset/config.json`.

## Version line

The current release line is `0.x`, starting at `0.1.0`. Earlier npm versions (`2.0.0`–`8.1.0`) were published during the project's prototype phase, are deprecated on npm, and should not be used. `0.x` signals that the API may still change between minor versions.

## Before publishing

1. Choose and approve the next semver version for the fixed package group.
2. Add a Changeset describing user-visible changes.
3. Ensure npm authentication and publish rights are available: `npm whoami` and `npm owner ls mfe-forge`.
4. Run the full verification matrix:

```bash
bun install --frozen-lockfile
bun run lint
bun run type-check
bun run build
bun run test
bun run check:package
bun run docs:build
```

5. Run package dry runs and inspect tarballs:

```bash
for package in packages/*; do (cd "$package" && npm pack --dry-run); done
```

## Changesets workflow

```bash
bun changeset
bun version-packages
bun run build
bun run test
bun release
```

`bun release` maps to `changeset publish`. It publishes only package versions that are not already on npm and requires an authenticated npm account/token.

The `Release` GitHub workflow runs the same flow on every push to `main`. It installs the pinned Bun version, runs lint, type-check, build, test and `check:package`, then uses `changesets/action`: while changesets are pending it opens a "chore(release): version packages" pull request, and once that pull request is merged it publishes and creates GitHub releases. Changelog entries link to the pull request and author (`@changesets/changelog-github`), so running `changeset version` locally requires a `GITHUB_TOKEN` (for example `GITHUB_TOKEN=$(gh auth token) bun version-packages`).

Packages are published with [npm provenance](https://docs.npmjs.com/generating-provenance-statements) (`NPM_CONFIG_PROVENANCE=true`, `id-token: write`). Provenance is only generated in CI; a local `bun release` publishes without it.

### Authentication: moving to trusted publishing

The workflow currently authenticates with the `NPM_CONFIG_TOKEN` repository secret, which must belong to an account that owns every package. The target setup is [npm trusted publishing](https://docs.npmjs.com/trusted-publishers), which removes the long-lived token:

1. For each package on npmjs.com: **Settings → Trusted Publisher → GitHub Actions**, repository `rez-rayan-zin-eddine/mfe-forge`, workflow `release.yml`.
2. Publish one release through the workflow and confirm `npm view <package>@<version> dist.attestations` shows a provenance attestation.
3. Remove the `NPM_TOKEN`/`NODE_AUTH_TOKEN` lines from `release.yml`, delete the `NPM_CONFIG_TOKEN` secret, and revoke the token on npmjs.com.
4. Set each package to **Require two-factor authentication and disallow tokens**.

### Pull request checks

The `CI` workflow runs three jobs: `verify` (lint, type-check, build, test, `check:package`), `docs` (VitePress build with dead-link checking), and `changeset-check`, which fails a pull request that changes `packages/*/src` or a package manifest without adding a changeset.

## Known release gaps

- A complete init → generate → install → type-check → build → test → sync fixture matrix is not yet automated.
- `dev` process supervision and `build --analyze` are not fully implemented (see the [CLI reference](./cli.md)).

## Documentation deployment

Build the VitePress site locally with `bun run docs:build`. The `Deploy Docs to GitHub Pages` workflow builds `docs/.vitepress/dist` and deploys it with `actions/deploy-pages` whenever `docs/**` changes on `main` (or on manual dispatch).

### GitHub Pages source must be "GitHub Actions"

`actions/deploy-pages` only takes effect when the repository's Pages source is **GitHub Actions** (Settings → Pages → Build and deployment → Source). If the source is "Deploy from a branch", the workflow succeeds but the site keeps serving that branch — this is what caused the documentation site to return 404 while it pointed at an empty legacy `gh-pages` branch. The source can also be set from the CLI:

```bash
gh api -X PUT repos/<owner>/mfe-forge/pages -f build_type=workflow
```

## Release checklist

Do not publish until every gate is checked.

- [ ] Every user-visible change has a changeset; the fixed package group is reviewed.
- [ ] `bun install --frozen-lockfile` succeeds.
- [ ] `bun run lint`, `bun run type-check`, `bun run build`, `bun run test` and `bun run check:package` succeed.
- [ ] `bun run docs:build` succeeds.
- [ ] `npm pack --dry-run` inspected for every publishable package.
- [ ] Generated fixture flow passes from a clean directory: `npx mfe-forge@<version> init` → `generate` → install → build.
- [ ] `git diff --check` is clean and PR review is complete.
- [ ] Published versions verified with `npm view <name>@<version>` and `npx mfe-forge@<version> --version` (run outside the repository, otherwise `npx` resolves the workspace).

The release workflow uses Changesets on `main`; a workflow run is not evidence that a package was published until its job succeeds.
