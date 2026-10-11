import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { RemoteApp } from '../types/index.js'

const execaMock = vi.fn()
vi.mock('execa', () => ({ execa: (...args: unknown[]) => execaMock(...args) }))

const app = (name: string): RemoteApp => ({
  name,
  scope: name.split('/')[0],
  port: 3001,
  url: '',
  camelName: '',
  pascalName: '',
  federationName: '',
  packageName: name,
  entry: './src/bootstrap.tsx',
})
const apps = [app('shop/cart'), app('shop/catalog'), app('admin/users')]

vi.mock('../utils/config.js', () => ({
  getProjectContext: () => ({
    rootDir: '/repo',
    appsDir: '/repo/apps',
    config: { defaults: { packageManager: 'bun' } },
  }),
}))
vi.mock('../utils/discovery.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils/discovery.js')>()
  return { ...actual, discoverApps: () => apps }
})
vi.mock('ora', () => ({
  default: () => ({ start: vi.fn(), succeed: vi.fn(), fail: vi.fn() }),
}))

const { buildCommand } = await import('./build.js')
const { CliError, ExitCode } = await import('../utils/exit.js')

async function run(...args: string[]) {
  return buildCommand.parseAsync(args, { from: 'user' })
}

describe('build command', () => {
  beforeEach(() => {
    execaMock.mockReset()
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    buildCommand.setOptionValue('bail', undefined)
    buildCommand.setOptionValue('scope', undefined)
  })

  it('builds every app and resolves when all succeed', async () => {
    execaMock.mockResolvedValue({})
    await run()
    expect(execaMock).toHaveBeenCalledTimes(3)
    expect(execaMock).toHaveBeenCalledWith('bun', ['run', 'build'], expect.objectContaining({ cwd: '/repo/apps/shop/cart' }))
  })

  it('throws a TaskFailed CliError naming the failed app', async () => {
    execaMock.mockImplementation((_pm: string, _args: string[], opts: { cwd: string }) =>
      opts.cwd.endsWith('catalog') ? Promise.reject(new Error('boom')) : Promise.resolve({})
    )
    const err = await run().catch((e) => e)
    expect(err).toBeInstanceOf(CliError)
    expect(err.exitCode).toBe(ExitCode.TaskFailed)
    expect(err.message).toContain('shop/catalog')
    expect(execaMock).toHaveBeenCalledTimes(3)
  })

  it('stops at the first failure with --bail', async () => {
    execaMock.mockRejectedValue(new Error('boom'))
    const err = await run('--bail').catch((e) => e)
    expect(err.exitCode).toBe(ExitCode.TaskFailed)
    expect(execaMock).toHaveBeenCalledTimes(1)
  })

  it('rejects an unknown app with UserError instead of skipping it', async () => {
    const err = await run('nope').catch((e) => e)
    expect(err.exitCode).toBe(ExitCode.UserError)
    expect(execaMock).not.toHaveBeenCalled()
  })

  it('resolves an unambiguous bare app name', async () => {
    execaMock.mockResolvedValue({})
    await run('users')
    expect(execaMock).toHaveBeenCalledWith('bun', ['run', 'build'], expect.objectContaining({ cwd: '/repo/apps/admin/users' }))
  })

  it('filters by scope', async () => {
    execaMock.mockResolvedValue({})
    await run('--scope', 'shop')
    expect(execaMock).toHaveBeenCalledTimes(2)
  })
})
