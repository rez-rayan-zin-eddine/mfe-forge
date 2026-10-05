# Publishing guide

MFE Forge publishes six packages as one fixed version group: `mfe-forge` (CLI) and `@mfe-forge/core`, `router`, `store`, `design`, `testing`. The group is configured in `.changeset/config.json`.

## Version line

The current release line is `0.x`, starting at `0.1.0`. Earlier npm versions (`2.0.0`–`8.1.0`) were published during the project's prototype phase, are deprecated on npm, and should not be used. `0.x` signals that the API may still change between minor versions.

## Before publishing

1. Choose and approve the next semver version for the fixed package group.
2. Add a Changeset describing user-visible changes.
3. Ensure npm authentication and publish rights are available: `npm whoami` and `npm owner ls mfe-forge`.
4. Run the full verification matrix:

```bash
bun install --frozen-lockfile
bun run build
bun run test
bun run lint
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

The `Release` GitHub workflow runs the same flow on every push to `main` using the `NPM_CONFIG_TOKEN` repository secret: it opens a "Version Packages" pull request while changesets are pending, and publishes once that pull request is merged. Keep that secret scoped to an account that owns all six packages.

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
