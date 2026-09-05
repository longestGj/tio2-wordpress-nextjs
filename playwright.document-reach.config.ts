import {defineConfig, devices} from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'document-reach.spec.ts',
  timeout: 45_000,
  expect: {timeout: 10_000},
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {...devices['Desktop Chrome'], trace: 'retain-on-failure'},
  webServer: [
    {
      command: 'node tests/e2e/support/document-reach-cms.mjs',
      url: 'http://127.0.0.1:4013/__health',
      timeout: 120_000,
      reuseExistingServer: false,
    },
    {
      command: 'node node_modules/next/dist/bin/next start -p 3004',
      url: 'http://127.0.0.1:3004/robots.txt',
      timeout: 120_000,
      reuseExistingServer: false,
      env: {
        SITE_ID: 'tio2-my',
        WORDPRESS_GRAPHQL_URL: 'http://127.0.0.1:4013/graphql',
        NEXT_DIST_DIR: '.next-doc-reach-g8',
        REVALIDATION_SECRET: 'doc-reach-e2e-revalidation-secret',
      },
    },
  ],
})
