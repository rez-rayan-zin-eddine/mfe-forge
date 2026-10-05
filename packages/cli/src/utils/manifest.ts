import fs from 'fs-extra'
import path from 'path'
import type { ProjectContext, ProjectManifest } from '../types/index.js'
import { discoverApps, discoverHosts } from './discovery.js'

export const MANIFEST_FILE = 'mfe-forge.manifest.json'
export function manifestPath(context: ProjectContext): string { return path.join(context.rootDir, MANIFEST_FILE) }

export function createManifest(context: ProjectContext): ProjectManifest {
  const packages: ProjectManifest['packages'] = []
  if (fs.existsSync(context.packagesDir)) {
    for (const entry of fs.readdirSync(context.packagesDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue
      const packagePath = path.join(context.packagesDir, entry.name)
      const packageJson = path.join(packagePath, 'package.json')
      if (fs.existsSync(packageJson)) {
        const pkg = fs.readJsonSync(packageJson) as { name?: string; dependencies?: Record<string, string> }
        packages.push({ name: pkg.name ?? entry.name, path: path.relative(context.rootDir, packagePath), dependencies: pkg.dependencies ?? {} })
      }
    }
  }
  return { version: 1, generatedAt: new Date().toISOString(), project: { name: context.config.name, root: context.rootDir }, apps: discoverApps(context), hosts: discoverHosts(context), packages, environments: {} }
}
export async function writeManifest(context: ProjectContext): Promise<ProjectManifest> { const manifest=createManifest(context); await fs.writeJson(manifestPath(context), manifest, { spaces: 2 }); return manifest }
export function loadManifest(context: ProjectContext): ProjectManifest | null { const file=manifestPath(context); return fs.existsSync(file) ? fs.readJsonSync(file) as ProjectManifest : null }
export function validateManifest(manifest: ProjectManifest): string[] {
  const errors: string[] = []
  if (manifest.version !== 1) errors.push(`Unsupported manifest version: ${manifest.version}`)
  const names = new Set<string>()
  for (const app of manifest.apps) {
    if (names.has(app.name)) errors.push(`Duplicate app: ${app.name}`)
    names.add(app.name)
    if (!Number.isInteger(app.port) || app.port < 1 || app.port > 65535) errors.push(`Invalid port for ${app.name}`)
  }
  return errors
}
