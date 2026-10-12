# Installation

## Requirements

| Requirement                   | Version            | Source of truth                                                                                |
| ----------------------------- | ------------------ | ---------------------------------------------------------------------------------------------- |
| Node.js                       | 20 or newer        | `engines.node` (`>=20.0.0`) in every published package; `mfe-forge doctor` fails below Node 20 |
| Package manager               | Bun, pnpm or npm   | `defaults.packageManager` enum in the config schema                                            |
| Git                           | any recent version | `init` runs `git init` unless you pass `--skip-git`                                            |
| React (generated apps)        | 19                 | template dependencies `react@^19.1.0`; runtime packages peer on `react@^19.0.0`                |
| React Router (generated apps) | 7                  | template dependency `react-router-dom@^7.5.0`                                                  |
| Vite (generated apps)         | 5.4                | templates pin `vite@~5.4.21` (Vite 6/7 support is planned)                                     |

The MFE Forge repository itself is developed with Bun; its root `package.json` pins `packageManager: bun@1.4.2`. You only need Bun for your own project if you choose it as the package manager.

## Install the CLI

The npm package is named **`mfe-forge`** and installs two equivalent binaries: `mfe-forge` and the short alias `mfe`.

### Run without installing

```bash
npx mfe-forge@latest init my-project
# or
bunx mfe-forge@latest init my-project
# or
pnpm dlx mfe-forge@latest init my-project
```

### Global install

```bash
npm install -g mfe-forge
# or
bun add -g mfe-forge
# or
pnpm add -g mfe-forge

mfe-forge --version
```

### Inside a project

`init` adds `mfe-forge` (`^<cli version>`) as a dev dependency of the generated project and wires the root scripts `dev`, `build` and `test` to `mfe-forge dev|build|test`. After installing the project's dependencies you can call the local binary:

```bash
npx mfe generate app shop/catalog     # npm
bunx mfe generate app shop/catalog    # bun
pnpm exec mfe generate app shop/catalog
```

This is also the form `init` prints in its "Next steps".

## Package managers

The package manager is chosen at `init` time (`--package-manager <pm>`, or the interactive prompt; default `bun`) and stored as `defaults.packageManager` in `mfeforge.config.js`. Every command that runs scripts reads it from there. The CLI builds commands as follows (from `packages/cli/src/utils/package-manager.ts`):

| Purpose                                                                            | bun                      | pnpm                      | npm                             |
| ---------------------------------------------------------------------------------- | ------------------------ | ------------------------- | ------------------------------- |
| Run a script in one workspace package (used for `dev:<scope>:<name>` root scripts) | `bun --filter <pkg> dev` | `pnpm --filter <pkg> dev` | `npm run dev --workspace=<pkg>` |
| Run a root script (`dev`, `build`, `test`)                                         | `bun run <script>`       | `pnpm run <script>`       | `npm run <script>`              |
| Execute a local binary                                                             | `bunx <bin>`             | `pnpm exec <bin>`         | `npx <bin>`                     |

`doctor` checks for the matching lock file: `bun.lock` or `bun.lockb`, `pnpm-lock.yaml`, or `package-lock.json`.

To switch later, run `mfe-forge config --set defaults.packageManager --value pnpm`. Root scripts that were already generated keep their old command; edit them by hand.

## Workspace layout fix

The generated root `package.json` declares:

```json
"workspaces": ["apps/*", "packages/*"]
```

Apps and hosts are generated two levels deep (`apps/<scope>/<name>`), so the `apps/*` glob does not match them. Until the template is fixed, add `apps/*/*` so that installing from the root installs app dependencies and the `dev:<scope>:<name>` scripts can find each app:

```json
"workspaces": ["apps/*/*", "packages/*"]
```

**pnpm** does not read the `workspaces` field. Create a `pnpm-workspace.yaml` at the project root:

```yaml
packages:
  - 'apps/*/*'
  - 'packages/*'
```

## Runtime packages

Generated hosts and apps already depend on `@mfe-forge/core`, `@mfe-forge/router` and `@mfe-forge/store`, pinned to the exact CLI version that generated them. To add the runtime packages to an existing app:

```bash
npm install @mfe-forge/core @mfe-forge/router @mfe-forge/store
npm install @mfe-forge/design
npm install -D @mfe-forge/testing
```

| Package              | Peer dependencies                                              |
| -------------------- | -------------------------------------------------------------- |
| `@mfe-forge/core`    | `react ^19`, `react-dom ^19`                                   |
| `@mfe-forge/router`  | `react ^19`, `react-dom ^19`, `react-router-dom ^7`            |
| `@mfe-forge/store`   | `zustand ^5`                                                   |
| `@mfe-forge/design`  | none                                                           |
| `@mfe-forge/testing` | `react ^19`, `@testing-library/react ^16`, `vitest >=1.5.0 <6` |

All packages are ESM-only and versioned together (the CLI and the five runtime packages always share a version number).

## Verify

```bash
mfe-forge --version
mfe-forge --help
```

Inside a project, `mfe-forge doctor` checks the Node version, the lock file, port conflicts, that every scope has a host, and that the root `package.json` has a `workspaces` field. See [`doctor`](./cli/doctor.md).

## Next

Continue with the [Quick start](./quick-start.md).
