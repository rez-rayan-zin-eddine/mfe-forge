import fs from 'fs-extra'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { createManifest, validateManifest, writeManifest } from './manifest.js'

describe('manifest', () => {
  it('writes topology and validates duplicate apps', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mfe-forge-manifest-test-'))
    try {
      await fs.outputFile(path.join(root, 'apps', 'checkout', 'host', 'vite.config.ts'), 'export default { server: { port: 3000 } }')
      const context = { rootDir: root, appsDir: path.join(root, 'apps'), packagesDir: path.join(root, 'packages'), config: { name: 'demo', organization: 'acme' }, scopes: ['checkout'] } as any
      const manifest = await writeManifest(context)
      expect(manifest.hosts).toEqual(['checkout/host'])
      expect(await fs.pathExists(path.join(root, 'mfe-forge.manifest.json'))).toBe(true)
      expect(validateManifest({ ...manifest, apps: [...manifest.apps, ...manifest.apps] })).toContain('Duplicate app: checkout/host')
      expect(createManifest(context).apps).toHaveLength(1)
    } finally { await fs.remove(root) }
  })
})
