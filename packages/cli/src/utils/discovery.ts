import fs from 'fs-extra'
import path from 'path'
import { toCamelCase, toPascalCase, getPackageName } from './files.js'
import type { ProjectContext, RemoteApp } from '../types/index.js'

/**
 * Discovers all remote MFE applications in the project by scanning the `apps/` directory.
 * Apps are organized by scope (e.g., `apps/checkout/cart`, `apps/admin/dashboard`).
 *
 * For each discovered app, extracts:
 * - Name and scope from the directory structure
 * - Port number by parsing the `vite.config.ts` file
 * - Generated camelCase/PascalCase identifiers for use in federation config
 *
 * @param context - The project context containing directory paths and config
 * @returns Array of discovered remote app descriptors
 */
export function discoverApps(context: ProjectContext): RemoteApp[] {
  const apps: RemoteApp[] = []
  const { appsDir, config } = context

  if (!fs.existsSync(appsDir)) return apps

  /**
   * Scans a scope directory for app subdirectories containing vite.config.ts.
   * @param scopeDir - Absolute path to the scope directory
   * @param scopeName - Name of the scope (e.g., 'checkout')
   */
  const scanScope = (scopeDir: string, scopeName: string) => {
    const entries = fs.readdirSync(scopeDir, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name === 'node_modules') continue

      const appDir = path.join(scopeDir, entry.name)
      const viteConfig = path.join(appDir, 'vite.config.ts')

      if (fs.existsSync(viteConfig)) {
        const name = entry.name
        const fullName = `${scopeName}/${name}`
        const camelName = toCamelCase(fullName)
        const pascalName = toPascalCase(fullName)

        // Extract port number from vite.config.ts using regex
        let port = 3000
        const content = fs.readFileSync(viteConfig, 'utf-8')
        const match = content.match(/port:\s*(\d+)/)
        if (match) port = parseInt(match[1])

        apps.push({
          name: fullName,
          scope: scopeName,
          port,
          url: `http://localhost:${port}/assets/remoteEntry.js`,
          camelName,
          pascalName,
          federationName: `${camelName}App`,
          packageName: getPackageName(fullName.replace(/\//g, '-'), config.organization),
          entry: `./src/bootstrap.tsx`,
        })
      }
    }
  }

  // Scan each top-level directory in apps/ as a potential scope
  const entries = fs.readdirSync(appsDir, { withFileTypes: true })
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const scopeDir = path.join(appsDir, entry.name)
    const hasApps = fs
      .readdirSync(scopeDir, { withFileTypes: true })
      .some((e) => e.isDirectory() && fs.existsSync(path.join(scopeDir, e.name, 'vite.config.ts')))

    if (hasApps) {
      scanScope(scopeDir, entry.name)
    }
  }

  return apps
}

/**
 * Discovers all host applications in the project.
 * A host is identified by a directory named "host" within a scope directory
 * that contains a `vite.config.ts`.
 *
 * @param context - The project context containing directory paths
 * @returns Array of host application names (e.g., ['checkout/host', 'admin/host'])
 */
export function discoverHosts(context: ProjectContext): string[] {
  const hosts: string[] = []
  const { appsDir } = context

  if (!fs.existsSync(appsDir)) return hosts

  const entries = fs.readdirSync(appsDir, { withFileTypes: true })
  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const scopeDir = path.join(appsDir, entry.name)
    const hostDir = path.join(scopeDir, 'host')

    if (fs.existsSync(path.join(hostDir, 'vite.config.ts'))) {
      hosts.push(`${entry.name}/host`)
    }
  }

  return hosts
}

/**
 * Resolves a user-supplied app reference (`scope/name` or bare `name`) to a discovered app.
 * A bare name matches only when it is unambiguous across scopes.
 *
 * @param apps - Apps returned by {@link discoverApps}
 * @param ref - App reference from the command line
 * @returns The matching app, or `undefined` when nothing (or more than one app) matches
 */
export function resolveApp(apps: RemoteApp[], ref: string): RemoteApp | undefined {
  if (ref.includes('/')) return apps.find((app) => app.name === ref)
  const matches = apps.filter((app) => app.name.endsWith(`/${ref}`))
  return matches.length === 1 ? matches[0] : undefined
}
