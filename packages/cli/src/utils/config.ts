import { cosmiconfigSync } from 'cosmiconfig'
import { z } from 'zod'
import path from 'path'
import fs from 'fs-extra'
import chalk from 'chalk'
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

/**
 * Strips TypeScript 'as' and 'satisfies' type assertions from code while
 * properly tracking nested bracket depths (<...>, {...}, [...], (...)) so that
 * generic types with commas (e.g. Record<string, unknown>) and unions/intersections
 * do not cause premature truncation. Preserves string literals and object properties.
 */
export function stripTypeAssertions(code: string): string {
  const tokenRegex =
    /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b(?:as\s+const|as|satisfies)\b)/g

  let result = ''
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = tokenRegex.exec(code)) !== null) {
    const [, stringLiteral, keyword] = match
    const matchStart = match.index

    if (stringLiteral) {
      result += code.slice(lastIndex, matchStart) + stringLiteral
      lastIndex = tokenRegex.lastIndex
      continue
    }

    if (keyword === 'as const' || /^as\s+const$/.test(keyword)) {
      result += code.slice(lastIndex, matchStart)
      lastIndex = tokenRegex.lastIndex
      continue
    }

    let i = tokenRegex.lastIndex

    while (i < code.length && /\s/.test(code[i])) {
      i++
    }

    const nextChar = code[i]
    if (
      !nextChar ||
      nextChar === ':' ||
      nextChar === '=' ||
      nextChar === ';' ||
      nextChar === ',' ||
      nextChar === '}' ||
      nextChar === ')' ||
      nextChar === ']'
    ) {
      continue
    }

    result += code.slice(lastIndex, matchStart)

    let angleDepth = 0
    let braceDepth = 0
    let parenDepth = 0
    let bracketDepth = 0
    let lastNonWs = ''

    while (i < code.length) {
      const char = code[i]

      if (
        angleDepth === 0 &&
        braceDepth === 0 &&
        parenDepth === 0 &&
        bracketDepth === 0
      ) {
        if (
          char === ';' ||
          char === ',' ||
          char === '}' ||
          char === ')' ||
          char === ']'
        ) {
          break
        }
        if (char === '\n') {
          // Check if this newline is followed or preceded by a type continuation (| or &)
          let nextNonWs = i + 1
          while (nextNonWs < code.length) {
            if (/\s/.test(code[nextNonWs])) {
              nextNonWs++
            } else if (code[nextNonWs] === '/' && code[nextNonWs + 1] === '/') {
              nextNonWs += 2
              while (nextNonWs < code.length && code[nextNonWs] !== '\n') {
                nextNonWs++
              }
            } else if (code[nextNonWs] === '/' && code[nextNonWs + 1] === '*') {
              nextNonWs += 2
              while (
                nextNonWs < code.length &&
                !(code[nextNonWs - 1] === '*' && code[nextNonWs] === '/')
              ) {
                nextNonWs++
              }
              nextNonWs++
            } else {
              break
            }
          }
          const nextChar = code[nextNonWs]
          if (
            nextChar !== '|' &&
            nextChar !== '&' &&
            lastNonWs !== '|' &&
            lastNonWs !== '&'
          ) {
            break
          }
        }
      }

      if (char === '=' && code[i + 1] === '>') {
        i += 2
        lastNonWs = '>'
        continue
      }

      if (char === '<') {
        angleDepth++
      } else if (char === '>') {
        if (angleDepth > 0) angleDepth--; else break
      } else if (char === '{') {
        braceDepth++
      } else if (char === '}') {
        if (braceDepth > 0) braceDepth--; else break
      } else if (char === '(') {
        parenDepth++
      } else if (char === ')') {
        if (parenDepth > 0) parenDepth--; else break
      } else if (char === '[') {
        bracketDepth++
      } else if (char === ']') {
        if (bracketDepth > 0) bracketDepth--; else break
      } else if (char === '"' || char === "'" || char === '`') {
        const quote = char
        i++
        while (i < code.length && code[i] !== quote) {
          if (code[i] === '\\') i++
          i++
        }
        lastNonWs = quote
      }

      if (!/\s/.test(char)) {
        lastNonWs = char
      }

      i++
    }

    lastIndex = i
    tokenRegex.lastIndex = i
  }

  result += code.slice(lastIndex)
  return result
}

/**
 * Strips generic type parameters from defineConfig<...>(...) calls
 * while properly tracking nested angle bracket depth (<...>), braces, parens,
 * brackets, and string literals.
 */
export function stripDefineConfigGenerics(code: string): string {
  const tokenRegex =
    /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\bdefineConfig\s*<)/g

  let result = ''
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = tokenRegex.exec(code)) !== null) {
    const [, stringLiteral, keyword] = match
    const matchStart = match.index

    if (stringLiteral) {
      result += code.slice(lastIndex, matchStart) + stringLiteral
      lastIndex = tokenRegex.lastIndex
      continue
    }

    if (keyword) {
      const angleStart = matchStart + keyword.lastIndexOf('<')
      let i = angleStart
      let angleDepth = 0
      let braceDepth = 0
      let parenDepth = 0
      let bracketDepth = 0

      while (i < code.length) {
        const char = code[i]
        if (char === '"' || char === "'" || char === '`') {
          const quote = char
          i++
          while (i < code.length && code[i] !== quote) {
            if (code[i] === '\\') i++
            i++
          }
          i++
          continue
        }

        if (char === '=' && code[i + 1] === '>') {
          i += 2
          continue
        }

        if (char === '{') {
          braceDepth++
        } else if (char === '}') {
          if (braceDepth > 0) braceDepth--
        } else if (char === '(') {
          parenDepth++
        } else if (char === ')') {
          if (parenDepth > 0) parenDepth--
        } else if (char === '[') {
          bracketDepth++
        } else if (char === ']') {
          if (bracketDepth > 0) bracketDepth--
        } else if (braceDepth === 0 && parenDepth === 0 && bracketDepth === 0) {
          if (char === '<') {
            angleDepth++
          } else if (char === '>') {
            angleDepth--
            if (angleDepth === 0) {
              i++
              break
            }
          }
        }

        i++
      }

      if (angleDepth === 0) {
        let afterGenerics = i
        while (afterGenerics < code.length && /\s/.test(code[afterGenerics])) {
          afterGenerics++
        }
        if (code[afterGenerics] === '(') {
          result += code.slice(lastIndex, matchStart) + 'defineConfig('
          lastIndex = afterGenerics + 1
          tokenRegex.lastIndex = lastIndex
          continue
        }
      }
    }
  }

  result += code.slice(lastIndex)
  return result
}

export function parseTypeScriptConfig(file: string): Record<string, unknown> | null {
  if (!fs.existsSync(file)) return null
  const source = fs.readFileSync(file, 'utf8')
  if (!/export\s+default\s+/.test(source)) {
    throw new Error('No default export found in configuration file')
  }

  // Strip block comments and line comments while preserving strings/URLs
  let cleaned = source.replace(
    /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\/\*[\s\S]*?\*\/|\/\/[^\r\n]*)/g,
    (_match, str) => (str ? str : ' ')
  )

  // Strip imports while preserving string literals
  cleaned = cleaned.replace(
    /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\bimport\s+(?:type\s+)?[\s\S]*?from\s+['"][^'"]+['"];?|\bimport\s+['"][^'"]+['"];?)/g,
    (_match, str) => (str ? str : '')
  )

  // Strip TypeScript variable type annotations (: Type =) while preserving string literals
  cleaned = cleaned.replace(
    /("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(:\s*[A-Za-z_$][A-Za-z0-9_$.<>[\],|&\s]*?(?=\s*=))/g,
    (_match, str) => (str ? str : '')
  )

  // Strip TypeScript assertions ('as const', 'as Type', 'satisfies Type') with balanced bracket tracking
  cleaned = stripTypeAssertions(cleaned)

  // Strip generic parameter from defineConfig<...>(...) with balanced bracket tracking
  cleaned = stripDefineConfigGenerics(cleaned)

  // Replace export default with return
  cleaned = cleaned.replace(/export\s+default\s+/, 'return ')

  const fn = Function('defineConfig', '"use strict"; ' + cleaned)
  const result = fn((config: unknown) => config)
  if (!result || typeof result !== 'object') {
    throw new Error('Default export must evaluate to a configuration object')
  }
  return result as Record<string, unknown>
}

function unwrapDefaultExport(config: unknown): Record<string, unknown> {
  if (config && typeof config === 'object' && 'default' in config) {
    const inner = (config as { default: unknown }).default
    if (inner && typeof inner === 'object') return inner as Record<string, unknown>
  }
  return (config ?? {}) as Record<string, unknown>
}

export function loadConfig(cwd = process.cwd()): MFEConfig {
  let rawConfig: Record<string, unknown> = {}
  let loaded = false

  // Object-literal configs (the shape written by `init` and `config --set`) are
  // evaluated statically, so ESM/CJS loading differences across Node versions
  // cannot cause them to be skipped.
  for (const file of ['mfeforge.config.ts', 'mfeforge.config.js']) {
    const configPath = path.join(cwd, file)
    if (!fs.existsSync(configPath)) continue
    try {
      const parsed = parseTypeScriptConfig(configPath)
      if (parsed) {
        rawConfig = parsed
        loaded = true
      }
    } catch (err: unknown) {
      if (file.endsWith('.ts')) {
        const message = err instanceof Error ? err.message : String(err)
        console.warn(
          chalk.yellow(
            `Warning: Failed to load ${configPath}: ${message}. Falling back to default configuration.`
          )
        )
        loaded = true
      }
      // .js configs that are not plain object literals fall through to cosmiconfig
    }
    break
  }

  if (!loaded) {
    try {
      const result = explorer.search(cwd)
      if (result && !result.isEmpty && result.config) rawConfig = unwrapDefaultExport(result.config)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      console.warn(chalk.yellow(`Warning: Failed to load MFE Forge configuration: ${message}. Using defaults.`))
    }
  }

  // Always inject a name fallback so the schema never fails on a missing name
  const configData = {
    name: path.basename(cwd),
    ...rawConfig,
  }

  const parsed = configSchema.parse(configData)
  return parsed as MFEConfig
}

// Config is written as a plain object literal so both the lightweight TS loader
// and cosmiconfig can read it back; .json configs are written as pure JSON.
export async function saveConfig(config: Partial<MFEConfig>, cwd = process.cwd()) {
  const configPath = getConfigFilePath(cwd)
  const content = configPath.endsWith('.json')
    ? `${JSON.stringify(config, null, 2)}\n`
    : `/** @type {import('mfe-forge').MFEConfig} */\nexport default ${JSON.stringify(config, null, 2)};\n`
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