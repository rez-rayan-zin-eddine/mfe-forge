import { cosmiconfigSync } from 'cosmiconfig'
import { z } from 'zod'
import path from 'path'
import fs from 'fs-extra'
import type { MFEConfig } from '../types/index.js'

const configSchema = z.object({
  name: z.string().min(1),
  organization: z.string().optional(),
  scopes: z.array(z.string()).optional(),
  registry: z
    .object({
      url: z.string().url(),
      auth: z.string().optional(),
    })
    .optional(),
  defaults: z
    .object({
      framework: z.enum(['react', 'vue', 'svelte']).default('react'),
      language: z.enum(['typescript', 'javascript']).default('typescript'),
      styling: z.enum(['tailwind', 'css-modules', 'styled-components', 'none']).default('tailwind'),
      stateManagement: z.enum(['zustand', 'redux', 'jotai', 'none']).default('zustand'),
      packageManager: z.enum(['bun', 'pnpm', 'npm']).default('bun'),
    })
    .default({}),
  federation: z
    .object({
      plugin: z
        .enum(['@originjs/vite-plugin-federation', '@module-federation/vite'])
        .default('@originjs/vite-plugin-federation'),
      shared: z.array(z.string()).default(['react', 'react-dom', 'react-router-dom']),
      runtimePlugin: z.string().optional(),
    })
    .default({}),
  dev: z
    .object({
      autoStartHost: z.boolean().default(true),
      parallelLimit: z.number().int().positive().default(10),
      portRange: z.tuple([z.number(), z.number()]).default([3000, 3999]),
      cors: z.boolean().default(true),
    })
    .default({}),
  build: z
    .object({
      target: z.union([z.string(), z.array(z.string())]).default('esnext'),
      minify: z.boolean().default(false),
      cssCodeSplit: z.boolean().default(false),
      sourcemap: z.boolean().default(true),
    })
    .default({}),
  testing: z
    .object({
      unit: z.enum(['vitest', 'jest', 'none']).default('vitest'),
      e2e: z.enum(['playwright', 'cypress', 'none']).default('playwright'),
      coverage: z.boolean().default(true),
    })
    .default({}),
  designSystem: z
    .object({
      enabled: z.boolean().default(true),
      tokens: z.boolean().default(true),
      storybook: z.boolean().default(true),
    })
    .default({}),
  ci: z
    .object({
      provider: z.enum(['github', 'gitlab', 'azure', 'none']).default('github'),
      docker: z.boolean().default(true),
      deployTarget: z.enum(['vercel', 'netlify', 'aws', 'gcp', 'none']).default('none'),
    })
    .default({}),
})

// No custom .ts loader — let cosmiconfig use its default JS loader for .js files
// .ts files require compilation so they're searched but may not load at runtime
const explorer = cosmiconfigSync('mfeforge', { searchPlaces: ['mfeforge.config.js', '.mfeforgerc', '.mfeforgerc.json', 'package.json'] })

function getConfigFilePath(cwd: string): string {
  for (const file of ['mfeforge.config.ts', 'mfeforge.config.js', '.mfeforgerc.json']) {
    const candidate = path.join(cwd, file)
    if (fs.existsSync(candidate)) return candidate
  }
  return path.join(cwd, 'mfeforge.config.ts')
}

function parseTypeScriptConfig(file: string): Record<string, unknown> | null {
  if (!fs.existsSync(file)) return null
  let source = fs.readFileSync(file, 'utf8')
  source = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')
  const match = source.match(/export\s+default\s+(?:defineConfig\s*\(\s*)?([\s\S]*?)(?:\s*\)\s*)?;?\s*$/)
  if (!match) return null
  try { return Function(`"use strict"; return (${match[1]})`)() as Record<string, unknown> } catch { return null }
}

export function loadConfig(cwd = process.cwd()): MFEConfig {
  let rawConfig: Record<string, unknown> = {}
  const tsConfig = parseTypeScriptConfig(path.join(cwd, 'mfeforge.config.ts'))
  if (tsConfig) rawConfig = tsConfig
  else {
    try {
      const result = explorer.search(cwd)
      if (result && !result.isEmpty && result.config) rawConfig = result.config
    } catch { /* invalid config is reported by validation below */ }
  }

  // Always inject a name fallback so the schema never fails on a missing name
  const configData = {
    name: path.basename(cwd),
    ...rawConfig,
  }

  const parsed = configSchema.parse(configData)
  return parsed as MFEConfig
}

// Config is saved as .js (not .ts) because cosmiconfig cannot parse TypeScript
// at CLI runtime without a compiler. Users who want .ts can manually rename and
// add ts-node or tsx as a dev dependency.
export async function saveConfig(config: Partial<MFEConfig>, cwd = process.cwd()) {
  const configPath = getConfigFilePath(cwd)
  const content = `/** @type {import('mfe-forge').MFEConfig} */\nexport default ${JSON.stringify(config, null, 2)};\n`
  await fs.writeFile(configPath, content)
}

export function getConfigValue(config: unknown, key: string): unknown {
  return key.split('.').reduce((value: unknown, part) => (value && typeof value === 'object') ? (value as Record<string, unknown>)[part] : undefined, config)
}

export function setConfigValue(config: MFEConfig, key: string, value: unknown): MFEConfig {
  const result = JSON.parse(JSON.stringify(config)) as MFEConfig
  const parts = key.split('.')
  let target: Record<string, unknown> = result as unknown as Record<string, unknown>
  parts.slice(0, -1).forEach((part) => {
    const current = target[part]
    if (!current || typeof current !== 'object') target[part] = {}
    target = target[part] as Record<string, unknown>
  })
  target[parts.at(-1)!] = value
  return result
}

export function validateConfig(config: MFEConfig): string[] {
  const result = configSchema.safeParse(config)
  return result.success ? [] : result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
}

export function defineConfig(config: Partial<MFEConfig>): Partial<MFEConfig> {
  return config
}

export function getProjectContext(cwd = process.cwd()) {
  const config = loadConfig(cwd)
  const rootDir = cwd
  const appsDir = path.join(rootDir, 'apps')
  const packagesDir = path.join(rootDir, 'packages')

  const scopes: string[] = []
  if (fs.existsSync(appsDir)) {
    const entries = fs.readdirSync(appsDir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const subEntries = fs.readdirSync(path.join(appsDir, entry.name), { withFileTypes: true })
        const hasSubApps = subEntries.some(
          (e) =>
            e.isDirectory() &&
            fs.existsSync(path.join(appsDir, entry.name, e.name, 'vite.config.ts'))
        )
        if (hasSubApps) scopes.push(entry.name)
      }
    }
  }

  return { rootDir, config, appsDir, packagesDir, scopes }
}