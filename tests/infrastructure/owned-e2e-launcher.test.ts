import {existsSync} from 'node:fs'
import {spawn} from 'node:child_process'
import {createServer} from 'node:http'
import {mkdir, mkdtemp, readFile, readdir, rm, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join, resolve} from 'node:path'
import {afterEach, beforeEach, expect, test} from 'vitest'
import {http, passthrough} from 'msw'
import {server} from '../mocks/server'

beforeEach(() => server.use(http.all(/^http:\/\/127\.0\.0\.1:\d+\//u, () => passthrough())))

const temporaryRoots: string[] = []
afterEach(async () => { await Promise.all(temporaryRoots.splice(0).map(root => rm(root, {recursive: true, force: true}))) })

async function launcher() {
  const path = resolve('scripts/run-owned-e2e.mjs')
  expect(existsSync(path), 'The owned E2E launcher must be available').toBe(true)
  return import(path)
}

test('launcher discovers fixture URLs, leases owned PIDs, filters env and reverses cleanup', async () => {
  const {runOwnedE2e} = await launcher()
  const root = await mkdtemp(join(tmpdir(), 'd16-owned-e2e-'))
  temporaryRoots.push(root)
  const leaseRoot = join(root, 'leases')
  const resultPath = join(root, 'result.json')
  const nextCli = join(root, 'fake-next.mjs')
  const playwrightCli = join(root, 'fake-playwright.mjs')
  const fixture = join(root, 'fake-fixture.mjs')
  await writeFile(nextCli, `import {createServer} from 'node:http';
const port = Number(process.argv[process.argv.indexOf('--port') + 1]);
if(process.argv[2] !== 'dev' || process.argv[process.argv.indexOf('--hostname') + 1] !== '127.0.0.1') process.exit(22);
createServer((q,s)=>s.end('<html data-site-id="'+process.env.SITE_ID+'"></html>')).listen(port,'127.0.0.1');`)
  await writeFile(fixture, `import {createServer} from 'node:http';
if(process.argv.slice(2).join(' ') !== '--port 0') process.exit(23);
const server=createServer((q,s)=>s.end('fixture-ok')).listen(0,'127.0.0.1',()=>{const {port}=server.address(); console.log(JSON.stringify({host:'127.0.0.1',port,baseUrl:'http://127.0.0.1:'+port}));});`)
  await writeFile(playwrightCli, `import {writeFile,readFile,readdir} from 'node:fs/promises';
const leases=await Promise.all((await readdir(${JSON.stringify(leaseRoot)})).filter(x=>x.endsWith('.json')).map(async x=>JSON.parse(await readFile(${JSON.stringify(leaseRoot)}+'/'+x,'utf8'))));
const fixture=await (await fetch(process.env.DOC_REACH_FIXTURE_URL)).text();
const html=await (await fetch(process.env.DOC_REACH_BASE_URL)).text();
await writeFile(${JSON.stringify(resultPath)},JSON.stringify({argv:process.argv.slice(2),env:process.env,leases,fixture,html}));`)
  const events: Array<Record<string, unknown>> = []
  const result = await runOwnedE2e(['--site', 'tio2-my', '--spec', 'tests/e2e/document-reach.spec.ts', '--fixture', `DOC_REACH_FIXTURE_URL=${fixture}`], {
    repositoryRoot: resolve('.'), leaseRoot, nextCli, playwrightCli,
    environment: {...process.env, UNRELATED_SECRET: 'must-not-leak'},
    emit: (event: Record<string, unknown>) => events.push(event),
  })
  const output = JSON.parse(await readFile(resultPath, 'utf8'))
  expect(result.exitCode).toBe(0)
  expect(output.argv.slice(0, 2)).toEqual(['test', 'tests/e2e/document-reach.spec.ts'])
  expect(output.fixture).toBe('fixture-ok')
  expect(output.html).toContain('data-site-id="tio2-my"')
  expect(output.env.TIO2_MY_BASE_URL).toBe(output.env.DOC_REACH_BASE_URL)
  expect(output.env.UNRELATED_SECRET).toBeUndefined()
  expect(output.leases.map((lease: {purpose: string}) => lease.purpose).sort()).toEqual(['fixture', 'test-next'])
  for (const lease of output.leases) expect(lease.processIds).toHaveLength(1)
  const nextPort = Number(new URL(output.env.TIO2_MY_BASE_URL).port)
  expect(nextPort).toBeGreaterThanOrEqual(32100)
  expect(nextPort).toBeLessThanOrEqual(32999)
  const started = events.filter(event => event.event === 'started').map(event => event.pid)
  expect(events.filter(event => event.event === 'stopped').map(event => event.pid)).toEqual([...started].reverse())
  expect(await readdir(leaseRoot)).toEqual([])
}, 30_000)

test('unknown env keys and remote URLs are rejected before starting children', async () => {
  const {runOwnedE2e} = await launcher()
  for (const [assignment, message] of [['NODE_OPTIONS=--require=evil', /not allowed/u], ['FIVE_WORDPRESS_GRAPHQL_URL=https://example.com/graphql', /loopback HTTP/u]] as const) {
    await expect(runOwnedE2e(['--site', 'tio2-my', '--spec', 'tests/e2e/editorial-five.spec.ts', '--env', assignment])).rejects.toThrow(message)
  }
})

test.each(['wrong-site', 'early-exit', 'SIGTERM', 'test-failure'])('cleans owned resources after %s without stopping a foreign listener', async mode => {
  const {runOwnedE2e} = await launcher()
  const root = await mkdtemp(join(tmpdir(), 'd16-owned-e2e-failure-'))
  temporaryRoots.push(root)
  const leaseRoot = join(root, 'leases')
  const nextCli = join(root, 'next.mjs')
  const playwrightCli = join(root, 'playwright.mjs')
  await writeFile(nextCli, mode === 'early-exit' ? 'process.exit(29)' : `import {createServer} from 'node:http';
const port=Number(process.argv[process.argv.indexOf('--port')+1]);createServer((q,s)=>s.end('<main data-site-id="${mode === 'wrong-site' ? 'tio2-b' : 'tio2-my'}"></main>')).listen(port,'127.0.0.1');`)
  await writeFile(playwrightCli, 'process.exit(7)')
  const foreign = createServer((_request, response) => response.end('foreign-owner-alive'))
  await new Promise<void>(done => foreign.listen(0, '127.0.0.1', done))
  const address = foreign.address()
  if (!address || typeof address === 'string') throw new Error('Missing foreign listener')
  const events: Array<Record<string, unknown>> = []
  try {
    const result = runOwnedE2e(['--site', 'tio2-my', '--spec', 'tests/e2e/document-reach.spec.ts', '--fixture', 'DOC_REACH_FIXTURE_URL=tests/e2e/support/document-reach-cms.mjs'], {
      repositoryRoot: resolve('.'), nextCli, playwrightCli, leaseRoot, startupTimeoutMs: 3_000,
      emit: (event: Record<string, unknown>) => {
        events.push(event)
        if (mode === 'SIGTERM' && event.event === 'ready' && event.label === 'next:tio2-my') process.emit('SIGTERM')
      },
    })
    if (mode === 'test-failure') expect((await result).exitCode).toBe(7)
    else await expect(result).rejects.toThrow(mode === 'wrong-site' ? /Wrong site identity/u : mode === 'early-exit' ? /exited before readiness/u : /interrupted: SIGTERM/u)
    expect(await readdir(leaseRoot)).toEqual([])
    expect(events.filter(event => event.event === 'stopped').map(event => event.pid)).toEqual(events.filter(event => event.event === 'started').map(event => event.pid).reverse())
    expect(await (await fetch(`http://127.0.0.1:${address.port}/`)).text()).toBe('foreign-owner-alive')
    if (mode !== 'test-failure') expect(events.some(event => event.event === 'started' && event.label === 'playwright')).toBe(false)
  } finally { await new Promise<void>((done, reject) => foreign.close(error => error ? reject(error) : done())) }
}, 15_000)

test('real CMS fixtures bind dynamic loopback ports and emit exactly one discovery record', async () => {
  const upstream = createServer((_request, response) => response.writeHead(503).end('controlled-unavailable'))
  await new Promise<void>(done => upstream.listen(0, '127.0.0.1', done))
  const address = upstream.address()
  if (!address || typeof address === 'string') throw new Error('No test upstream port')
  const children: ReturnType<typeof spawn>[] = []
  try {
    const records = []
    for (const [index, name] of ['document-reach', 'document-reach', 'document-tds', 'market-uk', 'request-documents', 'request-sample'].entries()) {
      const child = spawn(process.execPath, [`tests/e2e/support/${name}-cms.mjs`, ...(index === 1 ? [] : ['--port', '0'])], {
        env: {...process.env, DOC_TDS_CMS_UPSTREAM: `http://127.0.0.1:${address.port}/graphql`},
        stdio: 'pipe', windowsHide: true,
      })
      children.push(child)
      let output = ''
      child.stdout!.on('data', chunk => { output += chunk.toString() })
      await expect.poll(() => output, {timeout: 5_000}).toMatch(/^\{"host":"127\.0\.0\.1","port":[1-9][0-9]*,"baseUrl":/u)
      const [line, ...remaining] = output.trim().split(/\r?\n/u)
      expect(remaining).toEqual([])
      const record = JSON.parse(line!)
      expect(new URL(record.baseUrl).port).toBe(String(record.port))
      const response = await fetch(`${record.baseUrl}/graphql`, {method: 'POST', body: JSON.stringify({query: 'query { missingFixtureField }'})})
      expect(response.status).toBeGreaterThanOrEqual(400)
      records.push(record)
    }
    expect(new Set(records.map(record => record.port)).size).toBe(records.length)
  } finally {
    for (const child of children.reverse()) {
      const exited = new Promise<void>(done => child.once('exit', () => done()))
      if (child.exitCode === null) { child.kill(); await exited }
    }
    await new Promise<void>((done, reject) => upstream.close(error => error ? reject(error) : done()))
  }
}, 30_000)

test('real Next and Playwright use an owned port and site identity without a CMS', async () => {
  const {runOwnedE2e} = await launcher()
  await mkdir(resolve('.tmp'), {recursive: true})
  const root = await mkdtemp(resolve('.tmp/task6-next-'))
  temporaryRoots.push(root)
  await mkdir(join(root, 'app'), {recursive: true})
  await mkdir(join(root, 'tests/e2e'), {recursive: true})
  await writeFile(join(root, 'package.json'), JSON.stringify({private: true, type: 'module', dependencies: {next: '*', react: '*', 'react-dom': '*'}}))
  await writeFile(join(root, 'tsconfig.json'), JSON.stringify({compilerOptions: {jsx: 'preserve', noEmit: true, skipLibCheck: true}, include: ['**/*.ts', '**/*.tsx']}))
  await writeFile(join(root, 'next.config.mjs'), 'export default {distDir: process.env.NEXT_DIST_DIR}')
  await writeFile(join(root, 'app/layout.js'), 'export default function Layout({children}) {return <html><body>{children}</body></html>}')
  await writeFile(join(root, 'app/page.js'), 'export default function Page() {return <main data-site-id="tio2-my"><h1>Owned runtime ready</h1></main>}')
  await writeFile(join(root, 'playwright.config.ts'), "import {defineConfig} from '@playwright/test';export default defineConfig({testDir:'./tests/e2e',workers:1,reporter:'list'})")
  await writeFile(join(root, 'tests/e2e/runtime.spec.ts'), `import {test,expect} from '@playwright/test';
const requiredLocalUrl=(name:string)=>new URL(process.env[name]!);
const base=requiredLocalUrl('TIO2_MY_BASE_URL').origin;
test('owned identity',async({page})=>{await page.goto(base);await expect(page.locator('[data-site-id="tio2-my"]')).toHaveText('Owned runtime ready')});`)
  const fixture = join(root, 'fixture.mjs')
  await writeFile(fixture, `import {createServer} from 'node:http';const server=createServer((q,s)=>s.writeHead(503).end('no CMS in this test')).listen(0,'127.0.0.1',()=>{const {port}=server.address();console.log(JSON.stringify({host:'127.0.0.1',port,baseUrl:'http://127.0.0.1:'+port}))});`)
  const result = await runOwnedE2e(['--site', 'tio2-my', '--spec', 'tests/e2e/runtime.spec.ts', '--fixture', `SMOKE_FIXTURE_URL=${fixture}`], {
    repositoryRoot: root,
    startupTimeoutMs: 60_000,
  })
  expect(result.exitCode, result.output).toBe(0)
  expect(result.urls.TIO2_MY_BASE_URL).toMatch(/^http:\/\/127\.0\.0\.1:32[1-9][0-9]{2}$/u)
  expect(await readdir(join(root, '.runtime/port-leases'))).toEqual([])
}, 90_000)
