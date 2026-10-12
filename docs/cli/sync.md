# `mfe-forge sync`

Reconcile every host's federation remotes and remote type declarations with the apps on disk, then regenerate the manifest.

## Synopsis

```text
mfe-forge sync [options]
```

## Description

`sync` is the deterministic counterpart to the incremental host registration done by [`generate`](./generate.md#remote-registration). For each host `apps/<scope>/host`, it computes the expected state from the apps discovered in the same scope (excluding the host itself) and rewrites generated sections only when they differ. Running it twice in a row makes no further changes.

| Step     | File                                              | What is written                                                                                                                                                                                   |
| -------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hosts    | `apps/<scope>/host/vite.config.ts`                | The first `remotes: { ... }` block is replaced with one `<federationName>: 'http://localhost:<port>/assets/remoteEntry.js'` entry per app in the scope. Remotes that no longer exist are removed. |
| Types    | `apps/<scope>/host/src/remotes/declarations.d.ts` | The whole file is regenerated: a header comment and one `declare module '<federationName>/App'` (a default-exported `React.ComponentType`) per app. The directory is created if missing.          |
| Manifest | `mfe-forge.manifest.json`                         | Regenerated on every non-dry run. See [manifest format](../config.md#manifest).                                                                                                                   |

::: warning Generated sections are overwritten
Hand-written entries inside `remotes: { }` and any edits to `declarations.d.ts` are replaced. Put custom remotes or declarations in separate files.
:::

## Options

| Flag           | Type    | Default | Description                                                                                                                          |
| -------------- | ------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `--hosts`      | boolean | `false` | Only process host `vite.config.ts` remotes.                                                                                          |
| `--types`      | boolean | `false` | Only process `declarations.d.ts`.                                                                                                    |
| `--routes`     | boolean | `false` | Reports `src/App.tsx` as unchanged with the reason `route metadata is represented in the manifest`. **No route source is modified.** |
| `--dry-run`    | boolean | `false` | Compute changes without writing any file, including the manifest.                                                                    |
| `--diff`       | boolean | `false` | Human output lists only changed files. It does not print a content diff.                                                             |
| `--check`      | boolean | `false` | Exit with `1` if any file changed (or would change, with `--dry-run`).                                                               |
| `--json`       | boolean | `false` | Print a JSON result instead of human output.                                                                                         |
| `-h`, `--help` | boolean |         | Show help.                                                                                                                           |

Selection rules: with none of `--hosts`, `--types`, or `--routes`, both hosts and types are processed. Combining `--hosts` and `--types` also processes both. Passing only `--routes` skips hosts and types.

::: warning `--check` writes unless combined with `--dry-run`
`--check` does not imply `--dry-run`. `sync --check` on its own updates the files **and** exits `1`. In CI, use `sync --check --dry-run` to fail without mutating the checkout.
:::

## Output

Human output lists one line per processed file, followed by a summary:

```text
updated apps/shop/host/vite.config.ts (federation remotes)
ok apps/shop/host/src/remotes/declarations.d.ts (remote declarations)

Sync updated 1 file(s)
```

With `--dry-run`, the summary reads `Sync would update N file(s)`. When nothing changed, it reads `Sync is up to date`.

JSON output:

```json
{
  "changed": [
    { "file": "apps/shop/host/vite.config.ts", "changed": true, "reason": "federation remotes" }
  ],
  "files": [
    { "file": "apps/shop/host/vite.config.ts", "changed": true, "reason": "federation remotes" },
    {
      "file": "apps/shop/host/src/remotes/declarations.d.ts",
      "changed": false,
      "reason": "remote declarations"
    }
  ],
  "dryRun": false
}
```

File paths are relative to the workspace root.

## Examples

::: code-group

```bash [Local]
mfe-forge sync
```

```bash [Preview]
mfe-forge sync --dry-run --diff
```

```bash [CI]
mfe-forge sync --check --dry-run --json
```

:::

## Failure modes

| Situation                                           | Result                                                                                                                                    |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| A host's `vite.config.ts` has no `remotes: {` block | A warning on stderr, and a `changed: false` entry with reason `warning: remotes block not found in vite.config.ts`. Exit code unaffected. |
| `--check` and changes needed                        | Exit `1`.                                                                                                                                 |
| No hosts in the project                             | Nothing to process; the manifest is still written (unless `--dry-run`). Exit `0`.                                                         |
| Configuration invalid                               | Exit `3`.                                                                                                                                 |

::: info Limitations

- Remote URLs are always `http://localhost:<port>/...`. Environment-specific URLs are not generated, and the manifest's `environments` field is always empty.
- Remotes are matched to hosts by scope only. A host cannot consume apps from another scope through `sync`.
- The `remotes` block is located with a non-nested pattern that ends at the first `}`, so keep remote values as plain strings.
  :::

## Related

- [`generate`](./generate.md)
- [`check`, `status`, `migrate`](./diagnostics.md)
- [Configuration and manifest](../config.md)
