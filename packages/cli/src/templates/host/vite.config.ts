import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import federation from '@originjs/vite-plugin-federation'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    federation({
      name: '{{camelName}}App',
      // Remotes will be auto-populated by mfe-forge sync
      remotes: {
      },
      shared: {
        react: { singleton: true, requiredVersion: '^19.1.0' },
        'react-dom': { singleton: true, requiredVersion: '^19.1.0' },
        'react-router-dom': { singleton: true, requiredVersion: '^7.5.0' },
        zustand: { singleton: true, requiredVersion: '^5.0.12' },
      },
    }),
  ],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: { cors: true, port: {{port}} },
  preview: { cors: true, port: {{port}} },
  build: { target: 'esnext', minify: false, cssCodeSplit: false },
})
