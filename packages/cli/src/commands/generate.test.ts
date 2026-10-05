import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { generateCommand } from './generate.js'
import fs from 'fs-extra'

describe('generateCommand', () => {
  let exitSpy: any
  let consoleErrorSpy: any
  let consoleLogSpy: any

  beforeEach(() => {
    exitSpy = vi.spyOn(process, 'exit').mockImplementation(((code?: number) => {
      throw new Error(`process.exit: ${code}`)
    }) as any)
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    exitSpy.mockRestore()
    consoleErrorSpy.mockRestore()
    consoleLogSpy.mockRestore()
  })

  describe('Command Definition', () => {
    it('defines the correct command name and alias', () => {
      expect(generateCommand.name()).toBe('generate')
      expect(generateCommand.alias()).toBe('g')
    })

    it('defines a descriptive summary', () => {
      expect(generateCommand.description()).toBe(
        'Generate apps, hosts, packages, or design systems'
      )
    })

    it('configures expected arguments', () => {
      const args = generateCommand.registeredArguments
      expect(args).toHaveLength(2)

      const typeArg = args.find((a) => a.name() === 'type')
      expect(typeArg).toBeDefined()
      expect(typeArg?.required).toBe(true)
      expect(typeArg?.description).toContain('app, host, package, design-system, library')

      const nameArg = args.find((a) => a.name() === 'name')
      expect(nameArg).toBeDefined()
      expect(nameArg?.required).toBe(false)
    })

    it('configures expected options', () => {
      const options = generateCommand.options
      const optionFlags = options.map((o) => o.flags)

      expect(optionFlags).toContain('--port <port>')
      expect(optionFlags).toContain('--host <host>')
      expect(optionFlags).toContain('--scope <scope>')
      expect(optionFlags).toContain('--features <features>')
      expect(optionFlags).toContain('--skip-host')
      expect(optionFlags).toContain('--dry-run')
    })
  })

  describe('Type Validation', () => {
    it('rejects an invalid generation type', async () => {
      await expect(
        generateCommand.parseAsync(['widget', 'my-scope/my-widget', '--dry-run'], {
          from: 'user',
        })
      ).rejects.toThrow('process.exit: 1')

      const errorOutput = consoleErrorSpy.mock.calls
        .map((call: unknown[]) => call.join(' '))
        .join('\n')
      expect(errorOutput).toContain('Invalid type "widget"')
      expect(errorOutput).toContain('Valid: app, host, package, design-system, library, pkg')
    })

    it('rejects another unknown type', async () => {
      await expect(
        generateCommand.parseAsync(['microservice', 'my-scope/backend', '--dry-run'], {
          from: 'user',
        })
      ).rejects.toThrow('process.exit: 1')

      const errorOutput = consoleErrorSpy.mock.calls
        .map((call: unknown[]) => call.join(' '))
        .join('\n')
      expect(errorOutput).toContain('Invalid type "microservice"')
    })

    it('enforces scope/name format for app', async () => {
      await expect(
        generateCommand.parseAsync(['app', 'unscoped-app', '--dry-run'], {
          from: 'user',
        })
      ).rejects.toThrow('process.exit: 1')

      const errorOutput = consoleErrorSpy.mock.calls
        .map((call: unknown[]) => call.join(' '))
        .join('\n')
      expect(errorOutput).toContain('Apps and hosts must be scoped: "unscoped-app"')
    })

    it('enforces scope/name format for host', async () => {
      await expect(
        generateCommand.parseAsync(['host', 'unscoped-host', '--dry-run'], {
          from: 'user',
        })
      ).rejects.toThrow('process.exit: 1')

      const errorOutput = consoleErrorSpy.mock.calls
        .map((call: unknown[]) => call.join(' '))
        .join('\n')
      expect(errorOutput).toContain('Apps and hosts must be scoped: "unscoped-host"')
    })
  })

  describe('Dry-Run Generation', () => {
    const testDryRun = async (type: string, name: string) => {
      const fsEnsureDirSpy = vi.spyOn(fs, 'ensureDir')
      const fsWriteFileSpy = vi.spyOn(fs, 'writeFile')

      await generateCommand.parseAsync([type, name, '--dry-run'], {
        from: 'user',
      })

      // In dry-run mode, no directories should be ensured or files written
      expect(fsEnsureDirSpy).not.toHaveBeenCalled()
      expect(fsWriteFileSpy).not.toHaveBeenCalled()

      fsEnsureDirSpy.mockRestore()
      fsWriteFileSpy.mockRestore()

      const logs = consoleLogSpy.mock.calls.map((call: unknown[]) => call.join(' ')).join('\n')
      expect(logs).toContain('Dry run — files that would be generated:')
      return logs
    }

    it('simulates app generation in dry-run mode without writing to disk', async () => {
      const logs = await testDryRun('app', 'checkout/cart')
      expect(logs).toContain('apps/checkout/cart')
    })

    it('simulates host generation in dry-run mode without writing to disk', async () => {
      const logs = await testDryRun('host', 'core/shell')
      expect(logs).toContain('apps/core/shell')
    })

    it('simulates package generation in dry-run mode without writing to disk', async () => {
      const logs = await testDryRun('package', 'utils')
      expect(logs).toContain('packages/utils')
    })

    it('accepts pkg alias and normalizes to package in dry-run mode', async () => {
      const logs = await testDryRun('pkg', 'helpers')
      expect(logs).toContain('packages/helpers')
    })

    it('simulates library generation in dry-run mode without writing to disk', async () => {
      const logs = await testDryRun('library', 'shared-lib')
      expect(logs).toContain('packages/shared-lib')
    })

    it('simulates design-system generation in dry-run mode without writing to disk', async () => {
      const logs = await testDryRun('design-system', 'ui-tokens')
      expect(logs).toContain('ui-tokens')
    })
  })

  describe('Option Parsing and Flags', () => {
    it('parses custom options including port, host, scope, features, and skip-host', async () => {
      await generateCommand.parseAsync(
        [
          'app',
          'sales/pos',
          '--port',
          '3456',
          '--host',
          'sales/main-host',
          '--scope',
          'sales',
          '--features',
          'auth,billing',
          '--skip-host',
          '--dry-run',
        ],
        { from: 'user' }
      )

      const opts = generateCommand.opts()
      expect(opts.port).toBe('3456')
      expect(opts.host).toBe('sales/main-host')
      expect(opts.scope).toBe('sales')
      expect(opts.features).toBe('auth,billing')
      expect(opts.skipHost).toBe(true)
      expect(opts.dryRun).toBe(true)
    })
  })
})
