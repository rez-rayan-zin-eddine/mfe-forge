# Design system guide

Micro frontends are built and deployed independently, so visual consistency has to come from a shared contract rather than a shared build. In MFE Forge that contract is a set of **design tokens** exposed as CSS custom properties. This guide explains how the pieces fit, how to theme them, and how to use the `design-system` generator.

API details live in the [@mfe-forge/design reference](./packages/design.md).

## The pieces

| Piece                  | Where it lives                     | What it provides                                                                                                         |
| ---------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `@mfe-forge/design`    | npm package                        | `tokens` object and `applyTokens()` helper. No components.                                                               |
| App and host templates | `mfe-forge generate app` / `host`  | A `src/index.css` that imports Tailwind CSS v4 and declares the same color, radius and font values in an `@theme` block. |
| Design-system template | `mfe-forge generate design-system` | A React component package (`Button`, `Card`, `Input`) built on Tailwind utility classes, with a Storybook setup.         |

The token values in `@mfe-forge/design` and in the templates' `@theme` blocks are the same, but they are **copies**, not generated from one another. If you change one, change the others (see [Keeping values in sync](#keeping-values-in-sync)).

## Using tokens across micro frontends

### Option 1: CSS variables at runtime

Call `applyTokens()` once in the host. It writes `--color-*`, `--radius-*`, `--font-sans` and `--font-mono` onto `<html>`, and because custom properties inherit, every remote rendered into that document can use them without importing anything.

```ts
// host: src/bootstrap.tsx
import { applyTokens } from '@mfe-forge/design'

applyTokens()
```

```css
/* any remote */
.panel {
  background: var(--color-card);
  color: var(--color-card-foreground);
  border-radius: var(--radius-lg);
}
```

Remotes that also run standalone (their own dev server, without the host) should call `applyTokens()` in their own bootstrap too, or they will render without the variables. Calling it twice is harmless.

To theme only part of the page, pass an element: `applyTokens(rootEl)`.

::: tip Spacing
`applyTokens()` does not emit spacing variables. Use `tokens.spacing` in JavaScript, or Tailwind's spacing scale in templates.
:::

### Option 2: Tailwind `@theme`

Generated apps and hosts ship this in `src/index.css`:

```css
@import 'tailwindcss';

@theme {
  --color-background: oklch(0.145 0 0);
  --color-primary: oklch(0.82 0.2 128);
  /* ...the rest of the palette... */
  --radius: 0.5rem;
  --font-sans: 'Inter', system-ui, sans-serif;
}
```

Tailwind v4 turns each `--color-*` into utilities (`bg-primary`, `text-muted-foreground`, `border-border`, ...). Every app compiles its own CSS, so each one carries its own copy of the theme.

Note the template `@theme` declares a single `--radius` and no `--font-mono`, while `applyTokens()` emits `--radius-sm` through `--radius-xl` and `--font-mono`.

### Option 3: Values in JavaScript

```ts
import { tokens } from '@mfe-forge/design/tokens'

const chartColors = [tokens.colors.primary, tokens.colors.destructive]
```

Useful for canvas/SVG charts, inline styles and build scripts. The `/tokens` subpath never touches `document`.

### Which to choose

- One theme for the whole page, owned by the host: **Option 1** in the host, plus Tailwind utilities in remotes if you like.
- Remotes that must look right in isolation: each remote calls `applyTokens()` or relies on its own `@theme`.
- Avoid having two sources set the same variable with different values. Inline styles from `applyTokens()` on `<html>` win over a `:root` stylesheet rule.

## Theming

### Overriding tokens

`@mfe-forge/design` has no configuration API. To change values, set the custom properties after (or instead of) `applyTokens()`:

```ts
import { applyTokens } from '@mfe-forge/design'

applyTokens()
const root = document.documentElement
root.style.setProperty('--color-primary', 'oklch(0.65 0.2 260)')
root.style.setProperty('--color-primary-foreground', 'oklch(0.985 0 0)')
```

For a fully custom palette, keep your own token object (for example in a generated design-system package) and write it with the same naming scheme.

### Light and dark

The built-in palette is dark only. `@mfe-forge/store` keeps a `theme` value (`'light' | 'dark' | 'system'`, default `'system'`) in `useGlobalStore`, but nothing applies it to the DOM. Wire it yourself:

```tsx
import { useEffect } from 'react'
import { useGlobalStore } from '@mfe-forge/store'

export function ThemeSync() {
  const theme = useGlobalStore((s) => s.theme)
  useEffect(() => {
    const dark =
      theme === 'dark' ||
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
  }, [theme])
  return null
}
```

```css
[data-theme='light'] {
  --color-background: oklch(0.985 0 0);
  --color-foreground: oklch(0.145 0 0);
  /* ...define the remaining light values... */
}
```

Because `applyTokens()` writes inline styles on `<html>`, a `[data-theme='light']` stylesheet rule on the same element will **not** override them. Either skip `applyTokens()` and define both themes in CSS, or apply your light values with `style.setProperty` when the theme changes.

See [@mfe-forge/store](./packages/store.md) for the store API.

## The `design-system` generator

```bash
mfe-forge generate design-system acme-ui
# preview without writing files:
mfe-forge generate design-system acme-ui --dry-run
```

Where it goes and how it is named:

- Output directory: `apps/<scope>/<name>`. Without a `scope/` prefix the scope is `--scope` or `default`, so the example above lands in `apps/default/acme-ui`.
- Package name: `@<organization>/<scope>-<name>` when `organization` is set in the config (for example `@acme/default-acme-ui`), otherwise `<scope>-<name>`.
- A `dev:<scope>:<name>` script is added to the root `package.json`.

See [CLI: generate](./cli/generate.md) for all flags.

### What you get

```text
apps/default/acme-ui/
├── .storybook/
│   ├── main.ts        # @storybook/react-vite, stories: src/**/*.stories.*
│   └── preview.ts     # imports src/index.css
├── package.json
├── tsconfig.json
└── src/
    ├── index.ts       # re-exports tokens and components
    ├── index.css      # Tailwind import + @theme palette
    ├── tokens/index.ts
    ├── components/
    │   ├── Button.tsx
    │   ├── Card.tsx
    │   ├── Input.tsx
    │   └── index.ts
    └── utils/cn.ts    # clsx + tailwind-merge
```

Package exports: `.`, `./tokens`, `./components`, pointing directly at TypeScript sources (the package is `private` and has no library build).

| Script       | Command                                                             |
| ------------ | ------------------------------------------------------------------- |
| `dev`        | `storybook dev -p 6006`                                             |
| `build`      | `storybook build` (builds the Storybook site, not a library bundle) |
| `type-check` | `tsc --noEmit`                                                      |
| `lint`       | `eslint .`                                                          |

### Tokens module

`src/tokens/index.ts` re-exports `tokens` and `TokenPath` from `@mfe-forge/design` and adds an empty `customTokens` object for your own values:

```ts
export { tokens } from '@mfe-forge/design'
export type { TokenPath } from '@mfe-forge/design'

export const customTokens = {
  brand: { accent: 'oklch(0.7 0.18 40)' },
} as const
```

### Components

All three components use `React.forwardRef`, accept `className` (merged via `cn`), and forward all native props.

| Component | Props                                      | Notes                                                                                                                          |
| --------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `Button`  | `ButtonHTMLAttributes` + `variant`, `size` | `variant`: `default`, `destructive`, `outline`, `ghost`. `size`: `default`, `sm`, `lg`. Built with `class-variance-authority`. |
| `Card`    | `HTMLAttributes<HTMLDivElement>`           | Rounded, bordered card surface.                                                                                                |
| `Input`   | `InputHTMLAttributes<HTMLInputElement>`    | Styled text input.                                                                                                             |

```tsx
import { Button, Card, Input } from '@acme/default-acme-ui'

export function Login() {
  return (
    <Card className="p-6">
      <Input type="email" placeholder="Email" />
      <Button variant="default" size="lg">
        Sign in
      </Button>
    </Card>
  )
}
```

The classes (`bg-primary`, `border-border`, ...) only produce styles if the **consuming** app's Tailwind build scans the design-system sources and defines the same `@theme` colors. With Tailwind v4, add an `@source` directive pointing at the package in the consumer's CSS, for example `@source "../../default/acme-ui/src";`.

### Storybook

The template configures Storybook 8 with the React + Vite framework but includes **no stories**. Add `*.stories.tsx` files under `src/`:

```tsx
// src/components/Button.stories.tsx
import type { Meta, StoryObj } from '@storybook/react'
import { Button } from './Button'

const meta: Meta<typeof Button> = { component: Button, title: 'Components/Button' }
export default meta

export const Primary: StoryObj<typeof Button> = {
  args: { children: 'Click me', variant: 'default' },
}
```

### Known gaps in the template

- `src/index.css` does `@import 'tailwindcss'`, but the generated `package.json` does not list `tailwindcss` or a Tailwind integration for Storybook's Vite build. Add `tailwindcss` and `@tailwindcss/vite` (and register the plugin in `.storybook/main.ts` via `viteFinal`) before running Storybook.
- No tests or test script are generated.

## Keeping values in sync

Token values are currently duplicated in:

1. `@mfe-forge/design` (`tokens.ts`)
2. Generated app/host `src/index.css`
3. Generated design-system `src/index.css`

When you customize the palette, update all copies, or generate the CSS from one source (for example, a small script that reads `tokens` from `@mfe-forge/design/tokens` and writes an `@theme` block).

## Related

- [@mfe-forge/design reference](./packages/design.md)
- [Architecture](./architecture.md)
- [Configuration](./config.md)
- [Troubleshooting](./troubleshooting.md)
