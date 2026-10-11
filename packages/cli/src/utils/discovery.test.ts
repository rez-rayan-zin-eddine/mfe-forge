import fs from 'fs-extra'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { discoverApps, discoverHosts, resolveApp } from './discovery.js'
import type { RemoteApp } from '../types/index.js'

describe('discovery', () => {
  it('discovers remote apps and hosts from a scoped workspace', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mfe-forge-discovery-test-'))
    const appsDir = path.join(root, 'apps')

    try {
      await fs.outputFile(
        path.join(appsDir, 'checkout', 'cart', 'vite.config.ts'),
        'export default { server: { port: 3201 } }\n'
      )
      await fs.outputFile(
        path.join(appsDir, 'checkout', 'host', 'vite.config.ts'),
        'export default { server: { port: 3200 } }\n'
      )

      const context = {
        rootDir: root,
        appsDir,
        packagesDir: path.join(root, 'packages'),
        config: {
          organization: 'acme',
        },
        scopes: ['checkout'],
      } as any

      expect(discoverHosts(context)).toEqual(['checkout/host'])
      const apps = discoverApps(context)
      expect(apps).toHaveLength(2)

      const names = apps.map((app) => app.name).sort()
      expect(names).toEqual(['checkout/cart', 'checkout/host'])

      const cart = apps.find((app) => app.name === 'checkout/cart')
      expect(cart).toMatchObject({
        scope: 'checkout',
        port: 3201,
        federationName: 'checkoutCartApp',
      })
    } finally {
      await fs.remove(root)
    }
  })
})

describe('resolveApp', () => {
  const mk = (name: string) => ({ name }) as RemoteApp
  const apps = [mk('shop/cart'), mk('admin/cart'), mk('admin/users')]

  it('matches a fully qualified name', () => {
    expect(resolveApp(apps, 'shop/cart')?.name).toBe('shop/cart')
  })
  it('matches an unambiguous bare name', () => {
    expect(resolveApp(apps, 'users')?.name).toBe('admin/users')
  })
  it('returns undefined for an ambiguous bare name', () => {
    expect(resolveApp(apps, 'cart')).toBeUndefined()
  })
  it('returns undefined for an unknown name', () => {
    expect(resolveApp(apps, 'nope')).toBeUndefined()
  })
})
