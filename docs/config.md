# Configuration

MFE Forge reads `mfeforge.config.ts` when present, otherwise `mfeforge.config.js` (or any other format `cosmiconfig` discovers). The TypeScript loader is intentionally lightweight — it does not run a compiler. It supports an `export default { ... }` object (optionally wrapped in `defineConfig(...)` or `defineConfig<T>(...)`), comments, `import` statements, variable type annotations, and `as` / `as const` / `satisfies` assertions. Imported values are not resolved, so the exported object must be self-contained. If the file cannot be evaluated, the CLI prints a warning naming the file and falls back to defaults instead of silently ignoring it.

```ts
export default {
  name: 'my-platform',
  organization: 'acme',
  defaults: { framework: 'react', language: 'typescript', styling: 'tailwind', stateManagement: 'zustand', packageManager: 'bun' },
  federation: { plugin: '@originjs/vite-plugin-federation', shared: ['react', 'react-dom', 'react-router-dom', 'zustand'] },
  dev: { autoStartHost: true, parallelLimit: 10, portRange: [3000, 3999], cors: true },
  build: { target: 'esnext', minify: false, cssCodeSplit: false, sourcemap: true },
  testing: { unit: 'vitest', e2e: 'playwright', coverage: true },
  designSystem: { enabled: true, tokens: true, storybook: true },
  ci: { provider: 'github', docker: true, deployTarget: 'none' },
}
```

All sections are normalized with defaults and validated through the CLI schema. `registry` and `scopes` are optional.

## Editing from the CLI

```bash
mfe-forge config --show --json
mfe-forge config --get dev.parallelLimit
mfe-forge config --set dev.parallelLimit --value 4
mfe-forge config --set federation.shared --value '["react","react-dom","zustand"]'
mfe-forge config --validate --json
```

`--set` writes the normalized configuration back to the discovered config file (or creates `mfeforge.config.ts` when none exists) as a plain object literal. Values are parsed as JSON first, so quoted strings, booleans, numbers, arrays, and objects can be set safely.

## Manifest relationship

Configuration expresses policy. `mfe-forge status` and `mfe-forge sync` generate `mfe-forge.manifest.json`, which records apps, hosts, packages, ports, federation names, and generated metadata for tools and agents. Do not hand-edit generated manifest data; rerun the command instead.
