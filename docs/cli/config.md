# `mfe-forge config`

Read, write, validate, or interactively edit the project configuration.

## Synopsis

```text
mfe-forge config --show [--json]
mfe-forge config --get <key> [--json]
mfe-forge config --set <key> --value <value> [--json]
mfe-forge config --validate [--json]
mfe-forge config --edit
mfe-forge config            # interactive
```

## Description

`config` works on the **normalized** configuration: the file loaded from the current directory, merged with schema defaults. For file locations, loading rules, and every field, see the [configuration reference](../config.md).

Only one mode runs per invocation. If several mode flags are passed, the first match in this order wins: `--validate`, `--show`, `--get`, `--set`, `--edit`. With no mode flag, an interactive prompt runs.

## Options

| Flag              | Type        | Default | Description                                                                                  |
| ----------------- | ----------- | ------- | -------------------------------------------------------------------------------------------- |
| `--show`          | boolean     | `false` | Print the full normalized configuration as JSON.                                             |
| `--get <key>`     | dotted path |         | Print one value, for example `dev.portRange`.                                                |
| `--set <key>`     | dotted path |         | Set one value and write the config file. Requires `--value`.                                 |
| `--value <value>` | string      |         | Value for `--set`. Parsed as JSON first; if parsing fails, the raw string is used.           |
| `--validate`      | boolean     | `false` | Validate the normalized configuration against the schema.                                    |
| `--edit`          | boolean     | `false` | Open `mfeforge.config.ts` in the system default application.                                 |
| `--json`          | boolean     | `false` | Machine-readable output for `--get`, `--set`, and `--validate`. `--show` always prints JSON. |
| `-h`, `--help`    | boolean     |         | Show help.                                                                                   |

## Modes

### `--show`

```bash
mfe-forge config --show
```

Prints the whole normalized object, including defaults that are not present in the file.

### `--get <key>`

```bash
mfe-forge config --get defaults.packageManager      # bun
mfe-forge config --get dev.portRange --json
```

```json
{ "key": "dev.portRange", "value": [3000, 3999] }
```

Arrays and objects are printed with JavaScript string conversion in human mode (`3000,3999`), so use `--json` for structured values. An unknown key prints `undefined` and exits `0`.

### `--set <key> --value <value>`

```bash
mfe-forge config --set dev.parallelLimit --value 4
mfe-forge config --set organization --value acme
mfe-forge config --set federation.shared --value '["react","react-dom","zustand"]'
mfe-forge config --set dev.cors --value false
```

Value parsing: `4` becomes a number, `false` a boolean, `["a"]` an array, and `acme` (not valid JSON) the string `"acme"`. To force a string that looks like JSON, quote it: `--value '"123"'`.

Missing intermediate objects are created. The **entire normalized configuration** is then written back. Defaults become explicit, comments and formatting are lost, and the file contains a plain object literal:

```js
/** @type {import('mfe-forge').MFEConfig} */
export default {
  "name": "my-platform",
  ...
};
```

The target file is the first that exists of `mfeforge.config.ts`, `mfeforge.config.js`, `.mfeforgerc.json` (written as pure JSON). If none exists, for example because the configuration lives in `.mfeforgerc` or in `package.json`, a new `mfeforge.config.ts` is created.

::: warning `--set` does not validate
The new value is written without schema validation. An invalid value, such as `--set defaults.packageManager --value yarn`, is saved, and every later command (including `config --set`) fails with exit code `3` until you fix the file by hand.
:::

### `--validate`

```bash
mfe-forge config --validate --json
```

```json
{ "valid": true, "errors": [] }
```

Prints `Configuration is valid`, or one `path: message` line per issue and exits `1`.

::: info
The configuration is already validated when it is loaded, before any `config` mode runs. An invalid file makes the command exit `3` with `Invalid MFE Forge configuration:` and the list of issues, so `--validate` effectively reports success or fails at load time.
:::

### `--edit`

Opens `<root>/mfeforge.config.ts` with the OS default handler (via the `open` package). The path is fixed: in projects created by `init`, whose file is `mfeforge.config.js`, it points to a file that does not exist. Open `mfeforge.config.js` directly instead.

### Interactive

With no mode flag, two questions are asked:

1. Default package manager (`bun`, `pnpm`, `npm`).
2. Auto-start host with apps (yes/no).

The answers are written to `defaults.packageManager` and `dev.autoStartHost` using the same writer as `--set`. Because of how answers are merged, `defaults` also receives a stray `autoStartHost` key, which the schema strips on the next load.

## Failure modes

| Situation                             | Result                                                                             |
| ------------------------------------- | ---------------------------------------------------------------------------------- |
| `--set` without `--value`             | `--value is required with --set`, exit `1`.                                        |
| `--validate` finds issues             | exit `1`.                                                                          |
| Configuration invalid at load time    | exit `3`.                                                                          |
| TypeScript config cannot be evaluated | Warning, then defaults are used (see [loading rules](../config.md#loading-rules)). |

## Related

- [Configuration reference](../config.md)
- [CLI overview](./index.md)
