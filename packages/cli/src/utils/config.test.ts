import fs from 'fs-extra'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it, vi } from 'vitest'
import { loadConfig, saveConfig, setConfigValue, stripDefineConfigGenerics, stripTypeAssertions } from './config.js'

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

  it('loads config with comments and URLs without truncating them', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mfe-forge-config-comments-test-'))
    try {
      const content = `
// Top-level comment: see https://mfe-forge.dev for documentation
/* Multi-line block comment
   discussing config options */
export default {
  name: 'commented-app', // Inline trailing comment
  registry: {
    // Registry URL comment
    url: 'https://registry.example.com/api', // trailing URL comment
  },
  defaults: {
    framework: 'react',
  },
}
`
      await fs.writeFile(path.join(root, 'mfeforge.config.ts'), content)
      const config = loadConfig(root)
      expect(config.name).toBe('commented-app')
      expect(config.registry?.url).toBe('https://registry.example.com/api')
      expect(config.defaults.framework).toBe('react')
    } finally {
      await fs.remove(root)
    }
  })

  it('loads valid object export with defineConfig and TypeScript syntax (as const, type annotations)', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mfe-forge-config-ts-syntax-test-'))
    try {
      const content = `
import { defineConfig } from 'mfe-forge'
import type { MFEConfig } from 'mfe-forge'

const customLimit: number = 5

export default defineConfig({
  name: 'typed-app',
  registry: {
    url: 'http://localhost:4000',
  },
  defaults: {
    framework: 'react' as const,
    language: 'typescript' as const,
  },
  dev: {
    parallelLimit: customLimit,
    portRange: [3000, 3999] as const,
  },
}) as const;
`
      await fs.writeFile(path.join(root, 'mfeforge.config.ts'), content)
      const config = loadConfig(root)
      expect(config.name).toBe('typed-app')
      expect(config.registry?.url).toBe('http://localhost:4000')
      expect(config.defaults.framework).toBe('react')
      expect(config.defaults.language).toBe('typescript')
      expect(config.dev.parallelLimit).toBe(5)
      expect(config.dev.portRange).toEqual([3000, 3999])
    } finally {
      await fs.remove(root)
    }
  })

  it('handles invalid syntax with a warning to stderr and falls back to default configuration', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mfe-forge-config-invalid-test-'))
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      await fs.writeFile(
        path.join(root, 'mfeforge.config.ts'),
        `export default { name: 'broken', defaults: { invalid syntax here !!! }`
      )
      const config = loadConfig(root)

      expect(warnSpy).toHaveBeenCalled()
      const warningMessage = warnSpy.mock.calls[0][0]
      expect(warningMessage).toContain('Warning: Failed to load')
      expect(warningMessage).toContain('mfeforge.config.ts')
      // Fallback name derives from working directory
      expect(config.name).toBe(path.basename(root))
      expect(config.defaults.packageManager).toBe('bun')
    } finally {
      warnSpy.mockRestore()
      await fs.remove(root)
    }
  })

  it('loads config with generic type assertions containing commas, unions, and multiline generics', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mfe-forge-config-generics-test-'))
    try {
      const content = `
import { defineConfig } from 'mfe-forge'
import type { MFEConfig } from 'mfe-forge'

export default defineConfig({
  name: 'generic-app',
  registry: {
    url: 'http://localhost:4000',
  } satisfies Record<string, unknown>,
  defaults: {
    framework: 'react' as 'react' | 'vue',
  },
  dev: {
    portRange: [3000, 3999] as [number, number],
  },
}) satisfies Record<
  string,
  unknown
>;
`
      await fs.writeFile(path.join(root, 'mfeforge.config.ts'), content)
      const config = loadConfig(root)
      expect(config.name).toBe('generic-app')
      expect(config.registry?.url).toBe('http://localhost:4000')
      expect(config.defaults.framework).toBe('react')
      expect(config.dev.portRange).toEqual([3000, 3999])
    } finally {
      await fs.remove(root)
    }
  })

  it('loads config with satisfies Record<string, unknown> and multi-generic assertions', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mfe-forge-config-multi-generic-test-'))
    try {
      const content = `
export default {
  name: 'multi-generic-app',
  dev: {
    portRange: [3000 as number, 3999 as number] as [number, number],
  },
} satisfies Record<string, unknown>;
`
      await fs.writeFile(path.join(root, 'mfeforge.config.ts'), content)
      const config = loadConfig(root)
      expect(config.name).toBe('multi-generic-app')
      expect(config.dev.portRange).toEqual([3000, 3999])
    } finally {
      await fs.remove(root)
    }
  })

  it('loads config with defineConfig<Partial<MFEConfig>>({ name: "app" })', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mfe-forge-config-partial-test-'))
    try {
      const content = `
import { defineConfig } from 'mfe-forge'
import type { MFEConfig } from 'mfe-forge'

export default defineConfig<Partial<MFEConfig>>({
  name: 'partial-app',
  dev: {
    parallelLimit: 7,
  },
});
`
      await fs.writeFile(path.join(root, 'mfeforge.config.ts'), content)
      const config = loadConfig(root)
      expect(config.name).toBe('partial-app')
      expect(config.dev.parallelLimit).toBe(7)
    } finally {
      await fs.remove(root)
    }
  })

  it('loads config with defineConfig<Record<string, unknown>>({ name: "app" })', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mfe-forge-config-record-test-'))
    try {
      const content = `
import { defineConfig } from 'mfe-forge'

export default defineConfig<Record<string, unknown>>({
  name: 'record-app',
  dev: {
    parallelLimit: 4,
  },
});
`
      await fs.writeFile(path.join(root, 'mfeforge.config.ts'), content)
      const config = loadConfig(root)
      expect(config.name).toBe('record-app')
      expect(config.dev.parallelLimit).toBe(4)
    } finally {
      await fs.remove(root)
    }
  })

  it('loads config with multiline satisfies union assertion', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mfe-forge-config-multiline-union-test-'))
    try {
      const content = `
export default {
  name: 'multiline-union-app',
} satisfies Record<string, unknown>
  | Record<number, unknown>;
`
      await fs.writeFile(path.join(root, 'mfeforge.config.ts'), content)
      const config = loadConfig(root)
      expect(config.name).toBe('multiline-union-app')
    } finally {
      await fs.remove(root)
    }
  })

  it('loads config with multiline as intersection assertion', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mfe-forge-config-multiline-intersection-test-'))
    try {
      const content = `
export default {
  name: 'multiline-intersection-app',
} as Foo
  & Bar;
`
      await fs.writeFile(path.join(root, 'mfeforge.config.ts'), content)
      const config = loadConfig(root)
      expect(config.name).toBe('multiline-intersection-app')
    } finally {
      await fs.remove(root)
    }
  })
})

describe('stripTypeAssertions', () => {
  it('strips satisfies and as with commas in generic types', () => {
    const input = 'export default { name: "app" } satisfies Record<string, unknown>;'
    expect(stripTypeAssertions(input).trim()).toBe('export default { name: "app" } ;')
  })

  it('strips multi-generic assertions like as Map<string, Array<number>>', () => {
    const input = 'const x = map as Map<string, Array<number>>;'
    expect(stripTypeAssertions(input).trim()).toBe('const x = map ;')
  })

  it('preserves array elements with type assertions without swallowing items', () => {
    const input = 'const arr = [1 as number, 2 as number, 3];'
    expect(stripTypeAssertions(input).trim()).toBe('const arr = [1 , 2 , 3];')
  })

  it('preserves object properties literally named as or satisfies', () => {
    const obj = { as: "alias", satisfies: true };
    expect(stripTypeAssertions(obj.toString()).trim()).toBeDefined()
    const input = 'const obj = { as: "alias", satisfies: true };'
    expect(stripTypeAssertions(input).trim()).toBe('const obj = { as: "alias", satisfies: true };')
  })

  it('handles multiline generics with commas cleanly', () => {
    const input = `export default { name: 'app' } satisfies Record<
  string,
  unknown
>;`
    expect(stripTypeAssertions(input).trim()).toBe("export default { name: 'app' } ;")
  })

  it('handles multiline union assertions with continuation pipes', () => {
    const input = `export default { name: 'app' } satisfies Record<string, unknown>
  | Record<number, unknown>;`
    expect(stripTypeAssertions(input).trim()).toBe("export default { name: 'app' } ;")
  })

  it('handles multiline intersection assertions with ampersands', () => {
    const input = `export default { name: 'app' } as Foo
  & Bar;`
    expect(stripTypeAssertions(input).trim()).toBe("export default { name: 'app' } ;")
  })

  it('handles multiline union assertions with continuation pipe on preceding line', () => {
    const input = `export default { name: 'app' } satisfies Record<string, unknown> |
  Record<number, unknown>;`
    expect(stripTypeAssertions(input).trim()).toBe("export default { name: 'app' } ;")
  })
})

describe('stripDefineConfigGenerics', () => {
  it('strips nested generics like defineConfig<Partial<MFEConfig>>({ name: "app" })', () => {
    const input = "export default defineConfig<Partial<MFEConfig>>({ name: 'app' });"
    expect(stripDefineConfigGenerics(input)).toBe("export default defineConfig({ name: 'app' });")
  })

  it('strips nested generics with commas like defineConfig<Record<string, unknown>>({ name: "app" })', () => {
    const input = "export default defineConfig<Record<string, unknown>>({ name: 'app' });"
    expect(stripDefineConfigGenerics(input)).toBe("export default defineConfig({ name: 'app' });")
  })

  it('strips deeply nested generics with arrays and maps', () => {
    const input = "defineConfig<Partial<Record<string, Array<number>>>>({ name: 'app' })"
    expect(stripDefineConfigGenerics(input)).toBe("defineConfig({ name: 'app' })")
  })

  it('leaves defineConfig without generics untouched', () => {
    const input = "export default defineConfig({ name: 'app' });"
    expect(stripDefineConfigGenerics(input)).toBe("export default defineConfig({ name: 'app' });")
  })
})

describe('saveConfig', () => {
  it('round-trips through a newly created mfeforge.config.ts', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mfe-forge-config-save-ts-'))
    try {
      await saveConfig({ name: 'saved', organization: 'acme' }, root)
      expect(await fs.pathExists(path.join(root, 'mfeforge.config.ts'))).toBe(true)
      expect(loadConfig(root).organization).toBe('acme')
    } finally {
      await fs.remove(root)
    }
  })

  it('keeps .mfeforgerc.json configs as valid JSON', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mfe-forge-config-save-json-'))
    try {
      const file = path.join(root, '.mfeforgerc.json')
      await fs.writeJson(file, { name: 'json-project' })
      await saveConfig({ name: 'json-project', organization: 'acme' }, root)
      expect(await fs.readJson(file)).toEqual({ name: 'json-project', organization: 'acme' })
      expect(loadConfig(root).organization).toBe('acme')
    } finally {
      await fs.remove(root)
    }
  })
})

describe('loadConfig with mfeforge.config.js', () => {
  it('loads the ESM object-literal config generated by init', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'mfe-forge-config-js-'))
    try {
      await fs.writeJson(path.join(root, 'package.json'), { name: 'demo', type: 'module' })
      await fs.writeFile(
        path.join(root, 'mfeforge.config.js'),
        "/** @type {import('mfe-forge').MFEConfig} */\nexport default {\n  name: 'demo',\n  defaults: { packageManager: 'npm' },\n}\n"
      )
      const config = loadConfig(root)
      expect(config.name).toBe('demo')
      expect(config.defaults.packageManager).toBe('npm')
    } finally {
      await fs.remove(root)
    }
  })
})
