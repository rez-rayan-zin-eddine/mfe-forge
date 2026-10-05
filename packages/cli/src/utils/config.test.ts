import fs from 'fs-extra'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { loadConfig, setConfigValue } from './config.js'

describe('loadConfig', () => {
  it('loads defaults and derives the project name from the working directory', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mfe-forge-config-test-'))

    try {
      const config = loadConfig(root)

      expect(config.name).toBe(path.basename(root))
      expect(config.defaults.packageManager).toBe('bun')
      expect(config.dev.portRange).toEqual([3000, 3999])
    } finally {
      await fs.remove(root)
    }
  })

  it('loads and edits a TypeScript config shape', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mfe-forge-config-ts-test-'))
    try {
      await fs.writeFile(path.join(root, 'mfeforge.config.ts'), `export default { name: 'demo', defaults: { packageManager: 'pnpm' } }\n`)
      expect(loadConfig(root).defaults.packageManager).toBe('pnpm')
      const updated = setConfigValue(loadConfig(root), 'dev.parallelLimit', 3)
      expect(updated.dev.parallelLimit).toBe(3)
    } finally {
      await fs.remove(root)
    }
  })
})
