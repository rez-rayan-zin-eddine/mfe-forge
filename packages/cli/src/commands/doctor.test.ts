import fs from 'fs-extra'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { getProjectContext } from '../utils/config.js'
import { runDoctor } from './doctor.js'

async function fixture(setup: (root: string) => Promise<void>) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mfe-forge-doctor-'))
  await setup(root)
  return root
}

const app = (root: string, name: string, port: number) =>
  fs.outputFile(path.join(root, 'apps', name, 'vite.config.ts'), `export default { server: { port: ${port} } }\n`)

describe('runDoctor', () => {
  it('reports every check as pass for a healthy project', async () => {
    const root = await fixture(async (r) => {
      await fs.writeJson(path.join(r, 'package.json'), { workspaces: ['apps/*/*'] })
      await fs.writeFile(path.join(r, 'bun.lock'), '')
      await app(r, 'shop/host', 3000)
      await app(r, 'shop/cart', 3001)
    })
    try {
      const report = await runDoctor(getProjectContext(root), 'v22.0.0')
      expect(report.ok).toBe(true)
      expect(report.checks.map((c) => c.id)).toEqual(['node-version', 'lockfile', 'ports', 'hosts', 'workspaces'])
      expect(report.summary).toEqual({ pass: 5, warn: 0, fail: 0 })
    } finally {
      await fs.remove(root)
    }
  })

  it('reports failures with hints', async () => {
    const root = await fixture(async (r) => {
      await fs.writeJson(path.join(r, 'package.json'), {})
      await app(r, 'shop/cart', 3001)
      await app(r, 'shop/catalog', 3001)
    })
    try {
      const report = await runDoctor(getProjectContext(root), 'v18.19.0')
      expect(report.ok).toBe(false)
      const byId = Object.fromEntries(report.checks.map((c) => [c.id, c]))
      expect(byId['node-version'].status).toBe('fail')
      expect(byId.lockfile).toMatchObject({ status: 'fail', hint: 'Run `bun install`' })
      expect(byId.ports.message).toContain('3001')
      expect(byId.hosts.message).toContain('shop')
      expect(byId.workspaces.status).toBe('fail')
      expect(report.summary.fail).toBe(5)
    } finally {
      await fs.remove(root)
    }
  })
})
