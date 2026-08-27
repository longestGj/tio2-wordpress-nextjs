import {fileURLToPath} from 'node:url'
import {configDefaults, defineConfig} from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
  test: {
    exclude: [...configDefaults.exclude, '.worktrees/**', 'tests/e2e/**'],
    maxWorkers: 4,
    setupFiles: ['./vitest.setup.ts'],
  },
})
