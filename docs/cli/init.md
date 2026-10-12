# `mfe-forge init`

Create a new MFE Forge workspace in a new directory.

## Synopsis

```text
mfe-forge init [name] [options]
```

## Description

`init` creates `<cwd>/<name>/`, writes the workspace skeleton from the built-in `init` template, optionally initializes a git repository, and optionally installs dependencies. It is the only command that does not read an existing project configuration.

When `name` is **omitted**, `init` runs an interactive prompt. When `name` is **given**, no prompts are shown and every optional feature is disabled (see [Interactive vs. non-interactive](#interactive-vs-non-interactive)).

## Arguments

| Argument | Required | Description                                                                                                                        |
| -------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `name`   | No       | Project name. Used as the directory name, the root `package.json` `name`, and the configuration `name`. Prompted for when omitted. |

## Options

| Flag                            | Type                     | Default   | Description                                                                                                                                                                                                                                             |
| ------------------------------- | ------------------------ | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `-t`, `--template <template>`   | string                   | `default` | Accepted but **currently ignored**; the built-in `init` template is always used.                                                                                                                                                                        |
| `-pm`, `--package-manager <pm>` | `bun` \| `pnpm` \| `npm` | `bun`     | Package manager written to `defaults.packageManager` and used for the install step. Overridden by the prompt answer in interactive mode. The value is not validated by `init`; an unsupported value makes later commands fail configuration validation. |
| `--skip-install`                | boolean                  | `false`   | Do not run `<pm> install` after scaffolding.                                                                                                                                                                                                            |
| `--skip-git`                    | boolean                  | `false`   | Do not run `git init` or write `.gitattributes`.                                                                                                                                                                                                        |
| `-h`, `--help`                  | boolean                  |           | Show help.                                                                                                                                                                                                                                              |

## Interactive vs. non-interactive

When `name` is omitted, these prompts are shown:

| Prompt           | Choices                                                                     | Default     | Effect                                                                                                                    |
| ---------------- | --------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------- |
| Project name     | free text (required)                                                        |             | Directory and project name.                                                                                               |
| NPM organization | free text                                                                   | empty       | Written as `organization` in the config. Enter it **without** `@` (for example `acme`); generators prefix `@` themselves. |
| Package manager  | `bun`, `pnpm`, `npm`                                                        | `bun`       | `defaults.packageManager`.                                                                                                |
| Features         | Design System, Docker Support, GitHub Actions CI/CD, TypeScript Strict Mode | all checked | See below.                                                                                                                |

How the selected features affect the output:

| Feature                | Effect                                                                                                                                      |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript Strict Mode | Sets `strict`, `noUnusedLocals`, and `noUnusedParameters` to `true` in `tsconfig.base.json` (otherwise `false`).                            |
| GitHub Actions CI/CD   | Keeps `.github/workflows/ci.yml` and sets `ci.provider: 'github'` (otherwise the `.github` directory is removed and `ci.provider: 'none'`). |
| Docker Support         | Sets `ci.docker: true` in the config. No Dockerfile is generated.                                                                           |
| Design System          | Currently has no effect on the generated files. Use [`generate design-system`](./generate.md#design-system) instead.                        |

::: warning Non-interactive defaults
`mfe-forge init my-platform` (name given) enables **no** features: no CI workflow, `ci.docker: false`, non-strict TypeScript, and no `organization`.
:::

## Files produced

```text
<name>/
├── apps/                 # empty
├── packages/             # empty
├── tools/                # empty
├── .github/workflows/ci.yml   # only with the CI feature
├── .gitattributes        # unless --skip-git ("* text=auto eol=lf")
├── .gitignore
├── README.md
├── mfeforge.config.js
├── package.json
└── tsconfig.base.json
```

The generated `package.json` declares `"workspaces": ["apps/*", "packages/*"]`, a `mfe-forge` dev dependency pinned to `^<cli version>`, and these scripts:

| Script       | Command              |
| ------------ | -------------------- |
| `dev`        | `mfe-forge dev`      |
| `build`      | `mfe-forge build`    |
| `test`       | `mfe-forge test`     |
| `lint`       | `eslint .`           |
| `format`     | `prettier --write .` |
| `type-check` | `tsc --noEmit`       |

The generated `mfeforge.config.js` sets `name`, `organization` (if given), `defaults`, `federation.shared`, `dev`, `testing`, and `ci`. Every omitted field takes its schema default; see the [configuration reference](../config.md).

::: warning Known template limitations

- `testing.unit` and `testing.e2e` are always written as `'none'`, regardless of choices.
- The workspace glob `apps/*` does not match apps generated at `apps/<scope>/<name>`. Change it to `"apps/*/*"` (the shape [`doctor`](./doctor.md) suggests) so `--filter`-based dev scripts can find generated apps.
- No `pnpm-workspace.yaml` is written. pnpm ignores the `workspaces` field, so pnpm users must create `pnpm-workspace.yaml` with the same globs.
- The generated CI workflow always uses Bun (`oven-sh/setup-bun`, `bun install`, `bun run lint|type-check|test`), even if another package manager was chosen.
  :::

## Examples

```bash
# Interactive setup
mfe-forge init

# Non-interactive, pnpm, no install or git
mfe-forge init my-platform --package-manager pnpm --skip-install --skip-git
```

After success, `init` prints next steps using the selected package manager, for example:

```text
cd my-platform
pnpm exec mfe generate host my-platform/host
pnpm exec mfe generate app my-platform/dashboard
pnpm run dev
```

## Failure modes

| Situation                      | Result                                                                                                |
| ------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `<cwd>/<name>` already exists  | `Directory <name> already exists`, exit `1`. Nothing is written.                                      |
| `git init` fails (git missing) | `Initialization failed` plus the error, exit `1`. The partially created directory is **not** removed. |
| `<pm> install` fails           | Same as above. Files are left in place; fix the problem and run the install manually.                 |

## Related

- [`generate`](./generate.md) — add hosts and apps to the new workspace
- [Configuration reference](../config.md)
- [Quick start](../quick-start.md)
