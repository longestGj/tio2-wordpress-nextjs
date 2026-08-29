import {defineConfig, globalIgnores} from 'eslint/config'
import nextTypeScript from 'eslint-config-next/typescript'
import nextVitals from 'eslint-config-next/core-web-vitals'

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  globalIgnores([
    '.next/**',
    '.next-*/**',
    '.worktrees/**',
    'coverage/**',
    'node_modules/**',
    'site-prototypes/**/.next/**',
    'site-prototypes/**/.vinext/**',
    'site-prototypes/**/.wrangler/**',
    'site-prototypes/**/dist/**',
    'next-env.d.ts',
  ]),
])
