import {defineConfig, devices} from '@playwright/test'
import {randomUUID} from 'node:crypto'

const baseUrl = process.env.DOC_REACH_BASE_URL ?? 'http://localhost:3004'
const fixtureUrl = process.env.DOC_REACH_FIXTURE_URL ?? 'http://127.0.0.1:4013'
// Each run starts with fresh CMS cache entries; transitions within that run
// still use the real signed revalidation endpoint and production cache.
const fixtureRunId = process.env.DOC_REACH_RUN_ID ?? randomUUID()
process.env.DOC_REACH_RUN_ID = fixtureRunId

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: ['document-reach.spec.ts', 'document-reach-dependencies.spec.ts'],
  timeout: 45_000,
  expect: {timeout: 10_000},
  fullyParallel: false,
  workers: 1,
  outputDir: '.local-evidence/doc-reach-dep01-playwright',
  reporter: [['list'], ['json', {outputFile: 'docs/verification/document-reach/doc-reach-dep01-playwright-results.json'}]],
  use: {...devices['Desktop Chrome'], trace: 'retain-on-failure'},
  webServer: [
    {
      command: 'node tests/e2e/support/document-reach-cms.mjs',
      url: `${fixtureUrl}/__health`,
      env: {DOC_REACH_CMS_PORT: new URL(fixtureUrl).port},
      timeout: 120_000,
      reuseExistingServer: false,
    },
    {
      command: `node node_modules/next/dist/bin/next build && node node_modules/next/dist/bin/next start -p ${new URL(baseUrl).port}`,
      stdout: 'pipe',
      url: `${baseUrl}/robots.txt`,
      timeout: 120_000,
      reuseExistingServer: false,
      env: {
        SITE_ID: 'tio2-my',
        WORDPRESS_GRAPHQL_URL: `${fixtureUrl}/graphql?fixtureRun=${fixtureRunId}`,
        NEXT_DIST_DIR: process.env.NEXT_DIST_DIR ?? '.next-doc-reach-dep01',
        REVALIDATION_SECRET: 'doc-reach-e2e-revalidation-secret',
        NEXT_PUBLIC_TIO2_MY_WEB3FORMS_ACCESS_KEY: '00000000-0000-4000-8000-000000000001',
      },
    },
  ],
})
