<p align="center">
  <img src="https://raw.githubusercontent.com/D-Rayno/mfe-forge/main/logo.svg" alt="MFE Forge Logo" width="200" />
</p>

# MFE Forge

[![npm version](https://badge.fury.io/js/mfe-forge.svg)](https://www.npmjs.com/package/mfe-forge)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> Production-ready Micro Frontend framework for Vite + React + Module Federation

MFE Forge is a comprehensive CLI and runtime framework that eliminates the boilerplate and complexity of building Micro Frontend architectures. It provides intelligent scaffolding, automatic host registration, development orchestration, and production-grade runtime utilities.

## Features

- 🚀 **Zero-config scaffolding** — Generate apps, hosts, packages, and design systems in seconds
- 🏗️ **Scope-based architecture** — Organize MFEs by team, product, or domain
- 🔌 **Auto-registration** — Hosts automatically discover and register remotes in their scope
- 🖥️ **Dev orchestration** — Run all MFEs with a single command
- 📝 **Type safety** — Automatic TypeScript declaration sync across MFEs
- 🧪 **Testing** — Built-in Vitest + Playwright configuration
- 🎨 **Design system** — Token-based theming with Tailwind CSS
- 🐳 **CI/CD ready** — Docker and GitHub Actions templates
- 📊 **Observability** — Error boundaries, event bus, and performance monitoring

## Quick Start

```bash
# Create new project
npx mfe-forge init my-project
cd my-project

# Generate a scoped app
npx mfe-forge generate app checkout/dashboard

# Generate the host for that scope
npx mfe-forge generate host checkout/host

# Start all MFEs
npm run dev
```

## Installation

```bash
# Global
npm install -g mfe-forge

# Project-local
npm install --save-dev mfe-forge

# With pnpm
pnpm add -g mfe-forge

# With bun
bun add -g mfe-forge
```

## CLI Commands

### `mfe-forge init [name]`

Initialize a new MFE Forge project with interactive setup.

```bash
mfe-forge init my-project
mfe-forge init my-project --template default --package-manager bun
mfe-forge init my-project --skip-install --skip-git
```

**Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `-t, --template <template>` | Project template | `default` |
| `-pm, --package-manager <pm>` | Package manager (`bun`, `pnpm`, `npm`) | `bun` |
| `--skip-install` | Skip dependency installation | `false` |
| `--skip-git` | Skip git initialization | `false` |

### `mfe-forge generate <type> [name]` (alias: `g`)

Generate apps, hosts, packages, design systems, or libraries.

```bash
# Generate a remote app within a scope
mfe-forge generate app checkout/cart
mfe-forge g app checkout/cart --port 3001

# Generate a host for a scope
mfe-forge generate host checkout/host

# Generate a shared package
mfe-forge generate package shared-utils
mfe-forge g pkg ui-components

# Generate a design system with Storybook
mfe-forge generate design-system my-ds

# Generate a shared library
mfe-forge generate library analytics
```

**Options:**

| Option | Description |
|--------|-------------|
| `--port <port>` | Development server port |
| `--host <host>` | Target host for app registration |
| `--scope <scope>` | Scope/team for the app |
| `--features <features>` | Comma-separated features |
| `--skip-host` | Skip host auto-generation |

### `mfe-forge dev`

Start development servers for all or specific MFEs.

```bash
mfe-forge dev                    # Start all MFEs
mfe-forge dev --app checkout/cart  # Start a specific app
mfe-forge dev --scope checkout     # Start all apps in a scope
mfe-forge dev --host-only          # Start only host applications
```

### `mfe-forge build [app]`

Build applications for production.

```bash
mfe-forge build                  # Build all apps
mfe-forge build checkout/cart    # Build specific app
mfe-forge build --scope checkout # Build all in scope
mfe-forge build --analyze        # Analyze bundle size
```

### `mfe-forge test [app]`

Run tests across MFEs.

```bash
mfe-forge test                   # Run all tests
mfe-forge test checkout/cart     # Test specific app
mfe-forge test --unit            # Unit tests only
mfe-forge test --e2e             # E2E tests only
mfe-forge test --coverage        # With coverage
mfe-forge test --watch           # Watch mode
```

### `mfe-forge sync`

Synchronize types, host configurations, and route registrations.

```bash
mfe-forge sync          # Run all sync operations
mfe-forge sync --types  # Sync TypeScript declarations only
mfe-forge sync --hosts  # Sync host vite.config.ts with remotes
mfe-forge sync --routes # Sync route registrations
```

### `mfe-forge doctor`

Diagnose common issues in the MFE project.

```bash
mfe-forge doctor
```

Checks: Node version, lock file presence, port conflicts, host coverage, workspace configuration.

### `mfe-forge config`

Manage MFE Forge configuration.

```bash
mfe-forge config                   # Interactive configuration
mfe-forge config --get defaults.packageManager
mfe-forge config --set key --value val
mfe-forge config --edit            # Open config in editor
```

## Configuration

Create `mfeforge.config.ts` in your project root:

```typescript
import { defineConfig } from 'mfe-forge'

export default defineConfig({
  name: 'my-project',
  organization: '@acme',

  defaults: {
    framework: 'react',       // 'react' | 'vue' | 'svelte'
    language: 'typescript',    // 'typescript' | 'javascript'
    styling: 'tailwind',       // 'tailwind' | 'css-modules' | 'styled-components' | 'none'
    stateManagement: 'zustand', // 'zustand' | 'redux' | 'jotai' | 'none'
    packageManager: 'bun',     // 'bun' | 'pnpm' | 'npm'
  },

  federation: {
    plugin: '@originjs/vite-plugin-federation',
    shared: ['react', 'react-dom', 'react-router-dom'],
  },

  dev: {
    autoStartHost: true,
    parallelLimit: 10,
    portRange: [3000, 3999],
    cors: true,
  },

  build: {
    target: 'esnext',
    minify: false,
    cssCodeSplit: false,
    sourcemap: true,
  },

  testing: {
    unit: 'vitest',            // 'vitest' | 'jest' | 'none'
    e2e: 'playwright',         // 'playwright' | 'cypress' | 'none'
    coverage: true,
  },

  designSystem: {
    enabled: true,
    tokens: true,
    storybook: true,
  },

  ci: {
    provider: 'github',        // 'github' | 'gitlab' | 'azure' | 'none'
    docker: true,
    deployTarget: 'none',      // 'vercel' | 'netlify' | 'aws' | 'gcp' | 'none'
  },
})
```

## Project Structure

```
my-project/
├── apps/
│   ├── checkout/
│   │   ├── host/           # Host application (shell)
│   │   ├── cart/            # Cart MFE
│   │   └── payment/        # Payment MFE
│   └── admin/
│       ├── host/
│       └── dashboard/
├── packages/
│   ├── ui/                 # Shared UI components
│   ├── utils/              # Shared utilities
│   └── store/              # Shared state
├── mfeforge.config.ts      # Framework configuration
├── tsconfig.base.json      # Base TypeScript config
└── package.json
```

## Runtime Packages

| Package | Description |
|---------|-------------|
| [`@mfe-forge/core`](https://www.npmjs.com/package/@mfe-forge/core) | Error boundaries, event bus, remote loaders |
| [`@mfe-forge/router`](https://www.npmjs.com/package/@mfe-forge/router) | Cross-MFE routing coordination |
| [`@mfe-forge/store`](https://www.npmjs.com/package/@mfe-forge/store) | Shared Zustand stores with sync |
| [`@mfe-forge/design`](https://www.npmjs.com/package/@mfe-forge/design) | Design tokens and theming |
| [`@mfe-forge/testing`](https://www.npmjs.com/package/@mfe-forge/testing) | Testing utilities for MFEs |

### `@mfe-forge/core`

```typescript
import { MFErrorBoundary, EventBus, createEventBus, globalEventBus, RemoteLoader, LazyRemote } from '@mfe-forge/core'

// Error boundary for remote MFEs
<MFErrorBoundary remoteName="checkout/cart" onError={handleError}>
  <CartApp />
</MFErrorBoundary>

// Event bus for cross-MFE communication
const bus = createEventBus({ debug: true })
bus.on('cart:updated', (items) => console.log(items))
bus.emit('cart:updated', [{ id: 1, qty: 2 }])

// Remote loader
<RemoteLoader remoteName="checkoutApp" moduleName="App" />
```

### `@mfe-forge/store`

```typescript
import { useGlobalStore, createScopedStore } from '@mfe-forge/store'

// Global shared state
const user = useGlobalStore((state) => state.user)
const setTheme = useGlobalStore((state) => state.setTheme)

// Scoped store for a specific MFE
const useCartStore = createScopedStore('cart', { items: [], total: 0 })
```

### `@mfe-forge/router`

```typescript
import { useMFENavigation, useRouteSync, createRouteGuard } from '@mfe-forge/router'

// Cross-MFE navigation
const { navigateTo, getCurrentScope } = useMFENavigation()
navigateTo('checkout', '/cart')

// Route guard
const AuthGuard = createRouteGuard(() => isAuthenticated(), UnauthorizedPage)
```

## Documentation

📖 Full documentation: [https://d-rayno.github.io/mfe-forge/](https://d-rayno.github.io/mfe-forge/)

## Contributing

See [CONTRIBUTING.md](https://github.com/D-Rayno/mfe-forge/blob/main/CONTRIBUTING.md) for development setup and contribution guidelines.

## License

MIT © [D-Rayno](https://github.com/D-Rayno)
