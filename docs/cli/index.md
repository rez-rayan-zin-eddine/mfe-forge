# CLI reference

The `mfe-forge` package ships a single command-line program that scaffolds, runs, builds, synchronizes, and inspects an MFE Forge workspace. This section documents the behavior of the current implementation (`packages/cli`, version 0.1.x). Where a flag is accepted but not yet implemented, the page says so explicitly.

## Installation and invocation

The package registers two equivalent binaries:

| Binary      | Notes                                                               |
| ----------- | ------------------------------------------------------------------- |
| `mfe-forge` | Canonical name, used throughout these docs.                         |
| `mfe`       | Short alias pointing at the same entry point (`dist/bin/index.js`). |

::: code-group

```bash [bun]
bunx mfe-forge --help
```

```bash [pnpm]
pnpm exec mfe-forge --help
```

```bash [npm]
npx mfe-forge --help
```

:::

See [Installation](../installation.md) for installing the CLI globally or as a workspace dev dependency.

## Synopsis

```text
mfe-forge <command> [options]
mfe-forge --version
mfe-forge --help
mfe-forge help [command]
```

## Working directory

Every command except `init` treats the **current working directory as the project root**. The CLI does not walk up the directory tree looking for a project:

- configuration is loaded from the current directory (see [Configuration](../config.md));
- applications are discovered under `./apps/<scope>/<name>/`;
- packages are discovered under `./packages/<name>/`;
- the manifest is written to `./mfe-forge.manifest.json`.

::: warning
Run commands from the workspace root. Running them from inside `apps/shop/cart` makes the CLI treat that directory as an empty project.
:::

## Global options

| Flag              | Description                                                         |
| ----------------- | ------------------------------------------------------------------- |
| `-v`, `--version` | Print the CLI version and exit with code `0`.                       |
| `-h`, `--help`    | Print help for the program or for a command and exit with code `0`. |

There are no other global options. Flags such as `--json` are defined per command; check each command page.

## Commands

| Command                                                  | Summary                                                             | Page                               |
| -------------------------------------------------------- | ------------------------------------------------------------------- | ---------------------------------- |
| `init [name]`                                            | Create a new workspace skeleton.                                    | [init](./init.md)                  |
| `generate <type> [name]` (alias `g`)                     | Scaffold an app, host, package, library, or design system.          | [generate](./generate.md)          |
| `dev`                                                    | Start development servers through generated root scripts.           | [dev](./dev.md)                    |
| `build [app]`                                            | Run each app's `build` script and report failures.                  | [build](./build.md)                |
| `test [app]`                                             | Run the `test`, `test:unit`, or `test:e2e` script.                  | [build](./build.md#mfe-forge-test) |
| `sync`                                                   | Reconcile host remotes, remote type declarations, and the manifest. | [sync](./sync.md)                  |
| `doctor`                                                 | Run environment and topology health checks.                         | [doctor](./doctor.md)              |
| `config`                                                 | Read, write, validate, or interactively edit configuration.         | [config](./config.md)              |
| `status`, `graph`, `inspect`, `deps`, `check`, `migrate` | Topology and manifest inspection tools.                             | [diagnostics](./diagnostics.md)    |

## Exit codes

Exit codes are defined in `packages/cli/src/utils/exit.ts` (`ExitCode`) and are also exported from the package entry point.

| Code | Name          | Meaning                                                                                                                                                                                                                                   |
| ---- | ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `0`  | `Ok`          | Success. Also returned for `--help` and `--version`.                                                                                                                                                                                      |
| `1`  | `UserError`   | Invalid input (unknown command or option, missing argument, unknown app, invalid generator type), or a check-style command found a problem (`sync --check`, `check`, `deps --check`, `config --validate`, `inspect` with an unknown app). |
| `2`  | `TaskFailed`  | Delegated work failed: a build, a test run, a dev server process, or a `doctor` check.                                                                                                                                                    |
| `3`  | `ConfigError` | The configuration was loaded but failed schema validation.                                                                                                                                                                                |

::: tip
Some commands (`init`, `generate`, `config --set` without `--value`) report errors by exiting with `1` directly, so their messages are printed without the `❌ Error:` prefix used by other commands. The exit code is still `1`.
:::

Uncaught errors that are not `CliError` instances are printed as `❌ Error: <message>` and exit with `1`.

## Output modes

Human output is colored (via `chalk`) and may include spinners and emoji. **Do not parse it.** For automation, use the machine-readable mode where a command offers one:

| Command   | Machine-readable flag                                    | Output                       |
| --------- | -------------------------------------------------------- | ---------------------------- |
| `sync`    | `--json`                                                 | `{ changed, files, dryRun }` |
| `doctor`  | `--json`                                                 | `{ ok, summary, checks }`    |
| `config`  | `--json` (with `--show`, `--get`, `--set`, `--validate`) | JSON value or result object  |
| `status`  | `--json`                                                 | Topology summary             |
| `graph`   | `--format json`                                          | `{ nodes, edges }`           |
| `inspect` | `--json`                                                 | One app descriptor           |
| `deps`    | `--json`                                                 | Shared dependency report     |
| `check`   | `--json`                                                 | `{ valid, errors }`          |
| `migrate` | `--json`                                                 | `{ migrations, pending }`    |

JSON is printed to stdout, pretty-printed with two-space indentation. Warnings (for example a configuration-loading fallback or a missing `remotes` block) are printed to stderr and do not corrupt JSON on stdout.

::: warning
The diagnostic commands (`status`, `graph`, `inspect`, `deps`, `check`, `migrate`) print a Node.js object inspection — not JSON — when the JSON flag is omitted. Always pass the JSON flag in scripts.
:::

`init`, `generate`, `dev`, `build`, and `test` have no JSON mode.

## Package manager selection

Commands that run scripts (`dev`, `build`, `test`, and the root scripts written by `generate`) use `defaults.packageManager` from the configuration (`bun`, `pnpm`, or `npm`; default `bun`). The generated command shapes are:

| Purpose                        | bun / pnpm                         | npm                                      |
| ------------------------------ | ---------------------------------- | ---------------------------------------- |
| Run a workspace package script | `<pm> --filter <package> <script>` | `npm run <script> --workspace=<package>` |
| Run a root script              | `<pm> run <script>`                | `npm run <script>`                       |
| Execute a local binary         | `bunx <bin>` / `pnpm exec <bin>`   | `npx <bin>`                              |

## Programmatic API

The package entry point (`import ... from 'mfe-forge'`) exports `defineConfig`, `loadConfig`, `runDoctor`, `CliError`, `ExitCode`, and the types `MFEConfig`, `AppContext`, `ProjectContext`, `RemoteApp`, `DoctorCheck`, `DoctorReport`, and `CheckStatus`.

## Related

- [Configuration reference](../config.md)
- [Quick start](../quick-start.md)
- [Troubleshooting](../troubleshooting.md)
