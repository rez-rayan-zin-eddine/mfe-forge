# @mfe-forge/design

Shared design tokens for MFE Forge, plus a helper that writes them to the DOM as CSS custom properties. The package has no runtime dependencies and no React dependency.

For guidance on theming and sharing tokens between micro frontends, see the [Design system guide](../design-system.md).

## Install

```bash
bun add @mfe-forge/design
# or: npm install @mfe-forge/design
```

| Requirement       | Value                         |
| ----------------- | ----------------------------- |
| Module format     | ESM only (`"type": "module"`) |
| Node.js           | `>=20.0.0`                    |
| Peer dependencies | None                          |
| Side effects      | None (`"sideEffects": false`) |

### Entry points

| Import path                | Exports                                   |
| -------------------------- | ----------------------------------------- |
| `@mfe-forge/design`        | `tokens`, `applyTokens`, type `TokenPath` |
| `@mfe-forge/design/tokens` | `tokens`, type `TokenPath`                |

Use the `/tokens` subpath when you only need the values (for example in a build script or a Tailwind/CSS generator) and want to avoid importing anything that touches `document`.

## API

### `tokens`

```ts
const tokens: {
  readonly colors: { readonly [name: string]: string }
  readonly radius: {
    readonly sm: string
    readonly md: string
    readonly lg: string
    readonly xl: string
  }
  readonly font: { readonly sans: string; readonly mono: string }
  readonly spacing: {
    readonly xs: string
    readonly sm: string
    readonly md: string
    readonly lg: string
    readonly xl: string
    readonly '2xl': string
  }
}
```

A plain object declared `as const`, so every value is typed as its literal string. It is the single source of truth for the default MFE Forge theme.

```ts
import { tokens } from '@mfe-forge/design'

tokens.colors.primary // 'oklch(0.82 0.2 128)'
tokens.spacing.lg // '1.5rem'
tokens.colors['muted-foreground'] // hyphenated keys need bracket access
```

### `applyTokens(element?)`

```ts
function applyTokens(element?: HTMLElement): void
```

| Parameter | Type          | Default                    | Description                                                  |
| --------- | ------------- | -------------------------- | ------------------------------------------------------------ |
| `element` | `HTMLElement` | `document.documentElement` | Element whose inline `style` receives the custom properties. |

Calls `element.style.setProperty()` for:

- every entry in `tokens.colors` as `--color-<name>`
- every entry in `tokens.radius` as `--radius-<name>`
- `--font-sans` and `--font-mono`

Behavior notes:

- **Spacing is not applied.** `tokens.spacing` has no CSS variables; read it from the `tokens` object.
- The properties are set as inline styles, so they override stylesheet declarations of the same custom property on that element.
- The default parameter reads `document`, so calling `applyTokens()` with no argument outside a browser or DOM test environment throws a `ReferenceError`. Passing an element avoids that.
- It is idempotent; calling it again rewrites the same values.

```ts
import { applyTokens } from '@mfe-forge/design'

// Globally, once, in the host bootstrap
applyTokens()

// Or scoped to a remote's root element
applyTokens(document.getElementById('checkout-root')!)
```

```css
.card {
  background: var(--color-card);
  color: var(--color-card-foreground);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  font-family: var(--font-sans);
}
```

### `TokenPath`

```ts
type TokenPath = keyof typeof tokens // 'colors' | 'radius' | 'font' | 'spacing'
```

Despite the name, this is the set of top-level token groups, not a dotted path such as `'colors.primary'`.

## Token reference

The default palette is a single dark theme. There is no light variant in the package.

### Colors

| Token key            | CSS variable                 | Value                      |
| -------------------- | ---------------------------- | -------------------------- |
| `background`         | `--color-background`         | `oklch(0.145 0 0)`         |
| `foreground`         | `--color-foreground`         | `oklch(0.985 0 0)`         |
| `card`               | `--color-card`               | `oklch(0.205 0 0)`         |
| `card-foreground`    | `--color-card-foreground`    | `oklch(0.985 0 0)`         |
| `border`             | `--color-border`             | `oklch(0.295 0 0)`         |
| `input`              | `--color-input`              | `oklch(0.295 0 0)`         |
| `primary`            | `--color-primary`            | `oklch(0.82 0.2 128)`      |
| `primary-foreground` | `--color-primary-foreground` | `oklch(0.145 0 0)`         |
| `muted`              | `--color-muted`              | `oklch(0.205 0 0)`         |
| `muted-foreground`   | `--color-muted-foreground`   | `oklch(0.556 0 0)`         |
| `destructive`        | `--color-destructive`        | `oklch(0.577 0.245 27.33)` |
| `ring`               | `--color-ring`               | `oklch(0.556 0 0)`         |

### Radius

| Token key | CSS variable  | Value     |
| --------- | ------------- | --------- |
| `sm`      | `--radius-sm` | `0.25rem` |
| `md`      | `--radius-md` | `0.5rem`  |
| `lg`      | `--radius-lg` | `0.75rem` |
| `xl`      | `--radius-xl` | `1rem`    |

### Font

| Token key | CSS variable  | Value                            |
| --------- | ------------- | -------------------------------- |
| `sans`    | `--font-sans` | `"Inter", system-ui, sans-serif` |
| `mono`    | `--font-mono` | `"JetBrains Mono", monospace`    |

The package does not load Inter or JetBrains Mono; include the font files yourself or rely on the fallbacks.

### Spacing

Not emitted by `applyTokens`.

| Token key | Value     |
| --------- | --------- |
| `xs`      | `0.25rem` |
| `sm`      | `0.5rem`  |
| `md`      | `1rem`    |
| `lg`      | `1.5rem`  |
| `xl`      | `2rem`    |
| `2xl`     | `3rem`    |

## Related

- [Design system guide](../design-system.md)
- [@mfe-forge/testing](./testing.md)
- [CLI: generate](../cli/generate.md)
