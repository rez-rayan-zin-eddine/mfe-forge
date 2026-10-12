import { defineConfig } from 'vitepress'

const repo = 'https://github.com/rez-rayan-zin-eddine/mfe-forge'

const guideSidebar = [
  {
    text: 'Introduction',
    items: [
      { text: 'What is MFE Forge?', link: '/getting-started' },
      { text: 'Core Concepts', link: '/concepts' },
      { text: 'Installation', link: '/installation' },
      { text: 'Quick Start', link: '/quick-start' },
      { text: 'Tutorial: Example Project', link: '/tutorials/example-project' },
    ],
  },
  {
    text: 'Guides',
    items: [
      { text: 'Architecture', link: '/architecture' },
      { text: 'Design System', link: '/design-system' },
      { text: 'Testing', link: '/testing' },
      { text: 'Building & Deploying', link: '/publishing' },
      { text: 'Migration', link: '/migration' },
      { text: 'Troubleshooting', link: '/troubleshooting' },
    ],
  },
  {
    text: 'Project',
    items: [
      { text: 'Comparison', link: '/comparison' },
      { text: 'Contributing', link: '/contributing' },
      { text: 'AI Operating Model', link: '/ai/agent-operating-model' },
    ],
  },
]

const cliSidebar = [
  {
    text: 'CLI Reference',
    items: [
      { text: 'Overview', link: '/cli/' },
      { text: 'init', link: '/cli/init' },
      { text: 'generate', link: '/cli/generate' },
      { text: 'dev', link: '/cli/dev' },
      { text: 'build', link: '/cli/build' },
      { text: 'sync', link: '/cli/sync' },
      { text: 'doctor', link: '/cli/doctor' },
      { text: 'config', link: '/cli/config' },
      { text: 'diagnostics', link: '/cli/diagnostics' },
    ],
  },
  {
    text: 'Configuration',
    items: [{ text: 'mfeforge.config.js', link: '/config' }],
  },
]

const packagesSidebar = [
  {
    text: 'Packages',
    items: [
      { text: 'Overview', link: '/packages/' },
      { text: '@mfe-forge/core', link: '/packages/core' },
      { text: '@mfe-forge/router', link: '/packages/router' },
      { text: '@mfe-forge/store', link: '/packages/store' },
      { text: '@mfe-forge/design', link: '/packages/design' },
      { text: '@mfe-forge/testing', link: '/packages/testing' },
    ],
  },
]

export default defineConfig({
  title: 'MFE Forge',
  description: 'CLI and runtime packages for Vite + React micro-frontends with Module Federation',
  base: '/mfe-forge/',
  lang: 'en-US',
  cleanUrls: true,
  lastUpdated: true,
  ignoreDeadLinks: false,
  srcExclude: ['ai/known-issues.md', 'ai/workflow.md', 'ai/compatibility.md', 'ai/architecture.md'],
  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/mfe-forge/logo.svg' }],
    ['meta', { name: 'theme-color', content: '#646cff' }],
    ['meta', { property: 'og:title', content: 'MFE Forge' }],
    [
      'meta',
      {
        property: 'og:description',
        content: 'CLI and runtime packages for Vite + React micro-frontends with Module Federation',
      },
    ],
  ],

  themeConfig: {
    logo: '/logo.svg',
    search: { provider: 'local' },
    outline: { level: [2, 3] },

    nav: [
      { text: 'Guide', link: '/getting-started', activeMatch: '^/(?!cli|config|packages)' },
      { text: 'CLI', link: '/cli/', activeMatch: '^/(cli|config)' },
      { text: 'Packages', link: '/packages/', activeMatch: '^/packages/' },
      {
        text: 'Links',
        items: [
          { text: 'Changelog', link: `${repo}/blob/main/packages/cli/CHANGELOG.md` },
          { text: 'Roadmap', link: `${repo}/blob/main/ROADMAP.md` },
          { text: 'Issues', link: `${repo}/issues` },
        ],
      },
    ],

    sidebar: {
      '/cli/': cliSidebar,
      '/config': cliSidebar,
      '/packages/': packagesSidebar,
      '/': guideSidebar,
    },

    editLink: {
      pattern: `${repo}/edit/main/docs/:path`,
      text: 'Edit this page on GitHub',
    },

    socialLinks: [{ icon: 'github', link: repo }],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026 MFE Forge Contributors',
    },
  },
})
