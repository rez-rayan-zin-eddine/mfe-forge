import { describe, it, expect, vi, beforeEach } from 'vitest'

const execaMock = vi.fn()
vi.mock('execa', () => ({ execa: (...args: unknown[]) => execaMock(...args) }))
vi.mock('../utils/config.js', () => ({
  getProjectContext: () => ({ rootDir: '/repo', appsDir: '/repo/apps', config: { defaults: { packageManager: 'pnpm' } } }),
}))
vi.mock('../utils/discovery.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils/discovery.js')>()
  return { ...actual, discoverApps: () => [{ name: 'shop/cart' }] }
})

const { testCommand } = await import('./test.js')

const run = (...args: string[]) => testCommand.parseAsync(args, { from: 'user' })

describe('test command', () => {
  beforeEach(() => {
    execaMock.mockReset().mockResolvedValue({})
    for (const key of ['unit', 'e2e', 'coverage', 'watch']) testCommand.setOptionValue(key, undefined)
  })

  it('runs the test script from the root without extra args', async () => {
    await run()
    expect(execaMock).toHaveBeenCalledWith('pnpm', ['run', 'test'], expect.objectContaining({ cwd: '/repo' }))
  })

  it('maps --unit to the test:unit script and forwards runner flags after --', async () => {
    await run('--unit', '--coverage', 'cart')
    expect(execaMock).toHaveBeenCalledWith('pnpm', ['run', 'test:unit', '--', '--coverage'], expect.objectContaining({ cwd: '/repo/apps/shop/cart' }))
  })

  it('rejects --unit with --e2e', async () => {
    const err = await run('--unit', '--e2e').catch((e) => e)
    expect(err.exitCode).toBe(1)
  })

  it('exits with TaskFailed when the script fails', async () => {
    execaMock.mockRejectedValue(new Error('fail'))
    const err = await run().catch((e) => e)
    expect(err.exitCode).toBe(2)
  })
})
