# MFE Forge vs Alternatives

## Comparison with Existing Tools

| Feature               | MFE Forge         | Nx             | Turborepo  | Single SPA | Module Federation CLI |
| --------------------- | ----------------- | -------------- | ---------- | ---------- | --------------------- |
| **MFE Scaffolding**   | ✅ Built-in       | ⚠️ Via plugins | ❌ No      | ⚠️ Manual  | ⚠️ Basic              |
| **Auto-Registration** | ✅ Yes            | ❌ No          | ❌ No      | ❌ No      | ❌ No                 |
| **Scope-Based**       | ✅ Yes            | ⚠️ Apps/libs   | ❌ No      | ❌ No      | ❌ No                 |
| **Dev Orchestration** | ✅ Single command | ⚠️ Custom      | ⚠️ Custom  | ⚠️ Custom  | ⚠️ Basic              |
| **Type Sync**         | ✅ Auto           | ❌ No          | ❌ No      | ❌ No      | ⚠️ Manual             |
| **Error Boundaries**  | ✅ Runtime SDK    | ❌ No          | ❌ No      | ⚠️ Manual  | ❌ No                 |
| **Event Bus**         | ✅ Runtime SDK    | ❌ No          | ❌ No      | ⚠️ Manual  | ❌ No                 |
| **Design System**     | ✅ Template       | ⚠️ Via plugins | ❌ No      | ❌ No      | ❌ No                 |
| **Testing Utils**     | ✅ MFE-specific   | ⚠️ Generic     | ⚠️ Generic | ⚠️ Generic | ❌ No                 |
| **CI/CD Templates**   | ✅ Generated      | ⚠️ Custom      | ⚠️ Custom  | ❌ No      | ❌ No                 |
| **Docker Support**    | ✅ Generated      | ❌ No          | ❌ No      | ❌ No      | ❌ No                 |
| **Port Management**   | ✅ Auto           | ❌ No          | ❌ No      | ❌ No      | ❌ No                 |
| **Package Manager**   | ✅ npm/pnpm/Bun   | ⚠️ npm/pnpm    | ⚠️ All     | ⚠️ All     | ⚠️ npm                |

## When to Use MFE Forge

### Use MFE Forge when:

- You're building a **new** Micro Frontend architecture
- You want **convention over configuration**
- You need **scope-based organization** (teams/products)
- You want **auto-discovery** of remotes
- You need **cross-MFE communication** patterns
- You want opinionated, ready-to-run templates out of the box (pre-1.0; see FRAMEWORK.md for maturity)

### Use Nx when:

- You need a **monorepo** for libraries (not just MFEs)
- You want **advanced caching** and task orchestration
- You need **polyglot** support (Node, Python, Go, etc.)
- You're building **full-stack** applications

### Use Turborepo when:

- You want **fast task running** with excellent caching
- You have **existing** MFE setup and just need orchestration
- You prefer **minimal tooling** overhead
- You're already using **Vercel** ecosystem

### Use Single SPA when:

- You need **framework-agnostic** MFEs (React + Vue + Angular)
- You want **runtime** framework switching
- You're **migrating** from a monolith gradually

## MFE Forge Unique Value Proposition

1. **All-in-One**: CLI + Runtime SDK + Templates + Tooling
2. **Zero Config**: Auto-detect ports, auto-register remotes, auto-sync types
3. **Scope Architecture**: Natural team/product boundaries
4. **Production Ready**: Error boundaries, testing, CI/CD from day one
5. **Developer Experience**: Single command to run everything
