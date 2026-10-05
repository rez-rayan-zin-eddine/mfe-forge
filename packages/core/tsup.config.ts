import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/error-boundary.tsx', 'src/event-bus.ts', 'src/loader.tsx'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  splitting: true,
  external: ['react', 'react-dom'],
})
