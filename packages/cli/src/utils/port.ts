import portfinder from 'portfinder'
import fs from 'fs-extra'
import path from 'path'
import type { ProjectContext } from '../types/index.js'

/**
 * Finds an available TCP port within the project's configured port range.
 * Uses `portfinder` to scan for the first unused port starting from the
 * preferred port or the range's start value.
 *
 * @param context - Project context containing the `dev.portRange` config
 * @param preferredPort - Optional preferred port to start scanning from
 * @returns Promise resolving to an available port number
 */
export async function findAvailablePort(
  context: ProjectContext,
  preferredPort?: number
): Promise<number> {
  const [start, end] = context.config.dev.portRange
  const usedPorts = getUsedPorts(context.appsDir)
  
  let currentPort = preferredPort || start
  
  while (currentPort <= end) {
    if (!usedPorts.has(currentPort)) {
      try {
        portfinder.setBasePort(currentPort)
        portfinder.setHighestPort(end)
        const port = await portfinder.getPortPromise()
        if (!usedPorts.has(port)) {
          return port
        }
        currentPort = port + 1
      } catch {
        break
      }
    } else {
      currentPort++
    }
  }
  
  throw new Error('No available ports found in the configured range')
}

/**
 * Scans the apps directory to find all ports currently in use.
 * Checks both `vite.config.ts` files (for `port:` directives) and
 * `package.json` scripts (for `--port` flags).
 *
 * Limitation: only literal port numbers are detected. Ports resolved at
 * runtime (e.g. `process.env.PORT || 3000` or values read from variables)
 * are not discovered and may collide with newly allocated ports.
 *
 * @param appsDir - Absolute path to the apps directory
 * @returns Set of port numbers currently in use
 */
export function getUsedPorts(appsDir: string): Set<number> {
  const used = new Set<number>()

  if (!fs.existsSync(appsDir)) return used

  const scanDir = (dir: string) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      if (entry.isDirectory() && entry.name !== 'node_modules') {
        const viteConfig = path.join(fullPath, 'vite.config.ts')
        const pkgJson = path.join(fullPath, 'package.json')

        if (fs.existsSync(viteConfig)) {
          const content = fs.readFileSync(viteConfig, 'utf-8')
          const match = content.match(/port:\s*(\d+)/)
          if (match) used.add(parseInt(match[1]))
        }

        if (fs.existsSync(pkgJson)) {
          const pkg = fs.readJsonSync(pkgJson)
          const devScript = pkg.scripts?.dev || ''
          const match = devScript.match(/--port\s+(\d+)/)
          if (match) used.add(parseInt(match[1]))
        }

        // Always recurse into subdirectories to find nested apps
        scanDir(fullPath)
      }
    }
  }

  scanDir(appsDir)
  return used
}
