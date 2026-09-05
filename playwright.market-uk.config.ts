import {defineConfig} from '@playwright/test'
import {randomUUID} from 'node:crypto'
const runId=process.env.UK_RUN_ID??randomUUID()
process.env.UK_RUN_ID=runId
export default defineConfig({
  testDir:'./tests/e2e',testMatch:'united-kingdom-market.spec.ts',workers:1,fullyParallel:false,
  timeout:60000,expect:{timeout:10000},
  outputDir:'.local-evidence/market-uk-playwright',
  reporter:[['list'],['json',{outputFile:'docs/verification/market-uk-001/playwright-results.json'}]],
  use:{baseURL:'http://localhost:3015',trace:'retain-on-failure'},
  webServer:process.env.UK_REUSE_SERVER==='1'?undefined:[
    {command:'node tests/e2e/support/market-uk-cms.mjs',url:'http://127.0.0.1:4024/__health',timeout:30000,reuseExistingServer:false},
    {command:'node node_modules/next/dist/bin/next build && node node_modules/next/dist/bin/next start -H 127.0.0.1 -p 3015',
      url:'http://localhost:3015/robots.txt',timeout:120000,reuseExistingServer:false,stdout:'pipe',
      env:{SITE_ID:'tio2-my',NEXT_DIST_DIR:'.next-market-uk-001',WORDPRESS_GRAPHQL_URL:'http://127.0.0.1:4024/graphql?run='+runId,
        REVALIDATION_SECRET:'uk-local-revalidation',NEXT_PUBLIC_TIO2_MY_WEB3FORMS_ACCESS_KEY:'00000000-0000-4000-8000-000000000001'}},
  ],
})
