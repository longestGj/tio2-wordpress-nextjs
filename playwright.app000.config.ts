import {defineConfig, devices} from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'app000-gate8.spec.ts',
  timeout: 45_000,
  workers: 1,
  use: {baseURL: process.env.APP000_BASE_URL ?? 'http://127.0.0.1:4391', trace: 'retain-on-failure'},
  projects: [
    {name: 'chromium', use: {...devices['Desktop Chrome']}},
    {name: 'firefox', use: {...devices['Desktop Firefox']}},
  ],
})

