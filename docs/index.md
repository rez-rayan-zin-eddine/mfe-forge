---
layout: home

hero:
  name: 'MFE Forge'
  text: 'Micro Frontend Framework'
  tagline: Production-ready MFE architecture for Vite + React + Module Federation
  image:
    src: /logo.svg
    alt: MFE Forge Logo
  actions:
    - theme: brand
      text: Get Started
      link: /getting-started
    - theme: alt
      text: CLI Reference
      link: /cli

features:
  - icon: 🚀
    title: Zero-Config Scaffolding
    details: Generate apps, hosts, packages, and design systems with a single command. Auto-detects ports and registers remotes.
  - icon: 🏗️
    title: Scope-Based Architecture
    details: Organize MFEs by team, product, or domain. Each scope gets its own host with automatic remote discovery.
  - icon: 🔌
    title: Auto-Registration
    details: Hosts automatically discover and register remotes in their scope. No manual vite.config editing needed.
  - icon: 🖥️
    title: Dev Orchestration
    details: Run all MFEs in parallel with a single command. Built-in port management and CORS configuration.
  - icon: 📝
    title: Type Safety
    details: Automatic TypeScript declaration generation and sync across all MFEs in your architecture.
  - icon: 🧪
    title: Testing Built-In
    details: Vitest for unit tests, Playwright for E2E. Cross-MFE testing utilities included.
  - icon: 🎨
    title: Design System
    details: Token-based theming with Tailwind CSS. Storybook integration for component documentation.
  - icon: 🐳
    title: CI/CD Ready
    details: Docker, GitHub Actions, and deployment templates. Production builds optimized for Module Federation.
---

## Quick Start

```bash
# Install globally
npm install -g mfe-forge

# Create a project
mfe-forge init my-platform
cd my-platform

# Generate MFEs
mfe-forge generate host platform/host
mfe-forge generate app platform/auth
mfe-forge generate app platform/dashboard

# Start developing
bun install
bun dev
```

## Runtime Packages

| Package              | Description                                 |
| -------------------- | ------------------------------------------- |
| `@mfe-forge/core`    | Error boundaries, event bus, remote loaders |
| `@mfe-forge/router`  | Cross-MFE routing coordination              |
| `@mfe-forge/store`   | Shared Zustand stores with sync             |
| `@mfe-forge/design`  | Design tokens and theming                   |
| `@mfe-forge/testing` | Testing utilities for MFEs                  |
