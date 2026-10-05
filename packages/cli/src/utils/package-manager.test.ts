import { describe, expect, it } from 'vitest'
import { execBinCommand, runScriptCommand, workspaceRunCommand } from './package-manager.js'

describe('package manager commands', () => {
  it('uses --workspace for npm and --filter for bun/pnpm', () => {
    expect(workspaceRunCommand('npm', '@acme/cart', 'dev')).toBe('npm run dev --workspace=@acme/cart')
    expect(workspaceRunCommand('pnpm', '@acme/cart', 'dev')).toBe('pnpm --filter @acme/cart dev')
    expect(workspaceRunCommand('bun', '@acme/cart', 'dev')).toBe('bun --filter @acme/cart dev')
  })

  it('builds root script and binary commands', () => {
    expect(runScriptCommand('npm', 'dev')).toBe('npm run dev')
    expect(execBinCommand('npm', 'mfe')).toBe('npx mfe')
    expect(execBinCommand('bun', 'mfe')).toBe('bunx mfe')
    expect(execBinCommand('pnpm', 'mfe')).toBe('pnpm exec mfe')
  })
})
