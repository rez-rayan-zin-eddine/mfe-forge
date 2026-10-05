# @mfe-forge/design

> Shared design tokens for MFE Forge micro-frontends, exposed as a typed object and as CSS custom properties.

Part of the [MFE Forge](https://github.com/rez-rayan-zin-eddine/mfe-forge) project. Pre-1.0 (`0.x`): APIs may change between minor versions.

## Installation

```bash
npm install @mfe-forge/design
```

## Tokens

```ts
import { tokens, type TokenPath } from '@mfe-forge/design'

tokens.colors.primary // 'oklch(0.82 0.2 128)'
tokens.radius.md      // '0.5rem'
tokens.spacing.lg     // '1.5rem'
```

Groups: `colors`, `radius`, `font`, `spacing`. `TokenPath` is the union of group names.

## CSS custom properties

```ts
import { applyTokens } from '@mfe-forge/design'

applyTokens() // defaults to document.documentElement
applyTokens(document.querySelector('#cart-root') as HTMLElement)
```

Sets `--color-<name>`, `--radius-<name>`, `--font-sans` and `--font-mono` on the element, so styles (including Tailwind arbitrary values such as `bg-[var(--color-primary)]`) can consume them. Spacing tokens are available from the `tokens` object only.

## License

MIT
