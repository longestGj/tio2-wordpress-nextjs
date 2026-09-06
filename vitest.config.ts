import {fileURLToPath} from 'node:url'
import {configDefaults, defineConfig} from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: [
      {
        find: /^@\/app\/ms(?=\/|$)/,
        replacement: fileURLToPath(new URL('./app/(ms)/ms', import.meta.url)),
      },
      {
        find: /^@\/app(?=\/|$)/,
        replacement: fileURLToPath(new URL('./app/(en)', import.meta.url)),
      },
      {
        find: '@',
        replacement: fileURLToPath(new URL('./', import.meta.url)),
      },
    ],
  },
  test: {
    exclude: [...configDefaults.exclude, '.worktrees/**', 'tests/e2e/**'],
    maxWorkers: 4,
    setupFiles: ['./vitest.setup.ts'],
  },
})
