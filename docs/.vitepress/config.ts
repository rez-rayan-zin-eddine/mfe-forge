import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'MFE Forge',
  description: 'CLI and runtime packages for Vite + React micro-frontends with Module Federation',
  base: '/mfe-forge/',
  ignoreDeadLinks: true,
  head: [['link', { rel: 'icon', type: 'image/svg+xml', href: '/mfe-forge/logo.svg' }]],

  themeConfig: {
    logo: '/logo.svg',
    nav: [
      { text: 'Guide', link: '/getting-started' },
      { text: 'CLI', link: '/cli' },
      { text: 'API', link: '/architecture' },
      { text: 'Diagnostics', link: '/cli#inspection-and-health' },
    ],

    sidebar: {
      '/': [
        {
          text: 'Getting Started',
          items: [
            { text: 'Introduction', link: '/getting-started' },
            { text: 'Installation', link: '/installation' },
            { text: 'Quick Start', link: '/quick-start' },
          ],
        },
        {
          text: 'CLI Reference',
          items: [
            { text: 'Commands', link: '/cli' },
            { text: 'Configuration', link: '/config' },
          ],
        },
        {
          text: 'Architecture',
          items: [
            { text: 'Overview', link: '/architecture' },
            { text: 'Design System', link: '/design-system' },
            { text: 'Testing', link: '/testing' },
          ],
        },
        {
          text: 'Advanced',
          items: [
            { text: 'Publishing', link: '/publishing' },
            { text: 'Migration', link: '/migration' },
            { text: 'AI Operating Model', link: '/ai/agent-operating-model' },
          ],
        },
      ],
    },

    socialLinks: [{ icon: 'github', link: 'https://github.com/rez-rayan-zin-eddine/mfe-forge' }],

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2026 MFE Forge Contributors',
    },
  },
})
