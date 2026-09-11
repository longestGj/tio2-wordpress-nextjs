import {defineConfig} from '@playwright/test'
const actual=process.env.TIO2_PRODUCTION_BASE_URL
export default defineConfig({
 testDir:'../../e2e',testMatch:'production-public-surface.spec.ts',fullyParallel:true,workers:3,retries:0,timeout:45000,
 outputDir:process.env.TIO2_PRODUCTION_ARTIFACTS||'../../../.tmp/task4/browser-fixture',
 reporter:[['list'],['json',{outputFile:process.env.TIO2_PRODUCTION_REPORT||'.tmp/task4/browser-fixture.json'}]],
 use:{baseURL:actual||'http://127.0.0.1:31947',browserName:'chromium',trace:'retain-on-failure'},
 projects:[1440,768,390].map(width=>({name:String(width),use:{viewport:{width,height:1000}}})),
 webServer:actual?undefined:{cwd:process.cwd(),command:'node tests/fixtures/production/server.mjs',url:'http://127.0.0.1:31947',reuseExistingServer:false},
})
