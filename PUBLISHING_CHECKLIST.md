# Publishing checklist

Do not publish until every required gate is checked.

- [ ] An explicit semver release version is approved and all six packages share it (fixed Changesets group).
- [ ] Changeset added and fixed package group reviewed.
- [ ] `npm whoami` succeeds with publish rights.
- [ ] `bun install --frozen-lockfile` succeeds.
- [ ] `bun run build` succeeds.
- [ ] `bun run test` succeeds across all packages.
- [ ] `bun run docs:build` succeeds.
- [ ] `npm pack --dry-run` inspected for every publishable package.
- [ ] Generated fixture flow passes: init → generate → install → type-check → build → test → sync → check.
- [ ] `git diff --check` is clean and PR review is complete.
- [ ] Publish executed with `bun release` under the intended npm account.
- [ ] Published versions verified with `npm view`.

The GitHub release workflow uses Changesets on `main`; it is not evidence that a package was published until its job succeeds.
