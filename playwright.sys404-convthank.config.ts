import {defineConfig, devices} from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  testMatch: 'sys404-convthank-gate8.spec.ts',
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: [['list']],
  timeout: 45_000,
  use: {
    baseURL: process.env.TIO2_MY_BASE_URL ?? 'http://127.0.0.1:4381',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },
  projects: [
    {name: 'chromium', use: {...devices['Desktop Chrome']}},
    {name: 'firefox', use: {...devices['Desktop Firefox']}},
  ],
  outputDir: '.tmp/playwright-sys404-convthank-results',
})
