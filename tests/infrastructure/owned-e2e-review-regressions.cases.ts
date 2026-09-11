import {createServer} from 'node:http'
import {cp, mkdir, mkdtemp, readFile, readdir, rm, writeFile} from 'node:fs/promises'
import {join, resolve} from 'node:path'
import {afterEach, beforeEach, expect, test, vi} from 'vitest'
import {http, passthrough} from 'msw'
import {server} from '../mocks/server'

// Imported by owned-e2e-launcher.test.ts so all tests sharing the host's numeric
// fallback pool execute in one Vitest file context, not competing lease roots.

beforeEach(() => server.use(http.all(/^http:\/\/127\.0\.0\.1:\d+\//u, () => passthrough())))
const temporaryRoots: string[] = []
afterEach(async () => { await Promise.all(temporaryRoots.splice(0).map(root => rm(root, {recursive: true, force: true}))) })

async function setup() {
  const {runOwnedE2e} = await import(resolve('scripts/run-owned-e2e.mjs'))
  await mkdir(resolve('.tmp'), {recursive: true})
  const root = await mkdtemp(resolve('.tmp/task6-review-'))
  temporaryRoots.push(root)
  // Each fake repository reads copies of the actual selected contracts, but its
  // lock, tsconfig and output cannot collide with another test file's launcher.
  await cp(resolve('tests/e2e'), join(root, 'tests/e2e'), {recursive: true})
  await writeFile(join(root, 'tsconfig.json'), '{"include":[]}')
  const nextCli = join(root, 'next.mjs')
  const playwrightCli = join(root, 'playwright.mjs')
  const fixture = join(root, 'fixture.mjs')
  const resultPath = join(root, 'result.json')
  await writeFile(nextCli, `import {createServer} from 'node:http'; const port=Number(process.argv[process.argv.indexOf('--port')+1]); createServer((q,s)=>s.end('<main data-site-id="'+process.env.SITE_ID+'"></main>')).listen(port,'127.0.0.1');`)
  await writeFile(playwrightCli, `import {writeFile} from 'node:fs/promises';await writeFile(${JSON.stringify(resultPath)},JSON.stringify(process.env));`)
  await writeFile(fixture, `import {createServer} from 'node:http';const server=createServer((q,s)=>s.end('fixture')).listen(0,'127.0.0.1',()=>{const {port}=server.address();console.log(JSON.stringify({host:'127.0.0.1',port,baseUrl:'http://127.0.0.1:'+port}))});`)
  const events: Array<Record<string, unknown>> = []
  const deps = {repositoryRoot: root, leaseRoot: join(root, 'leases'), nextCli, playwrightCli, startupTimeoutMs: 10_000,
    environment: {...process.env, WORDPRESS_GRAPHQL_URL: 'http://127.0.0.1:54321/graphql'},
    emit: (event: Record<string, unknown>) => events.push(event)}
  return {runOwnedE2e, root, fixture, resultPath, events, deps}
}

test('TDS upstream 8080 is doctored and refused before any fixture or other consumer starts', async () => {
  const {runOwnedE2e, events, deps} = await setup()
  const doctorRuntime = vi.fn(async () => ({fixedEndpoints: [{port: 8080, state: 'owner-mismatch'}]}))
  await expect(runOwnedE2e(['--site', 'tio2-my', '--spec', 'tests/e2e/document-tds.spec.ts',
    '--fixture', 'DOC_TDS_FIXTURE_URL=tests/e2e/support/document-tds-cms.mjs',
    '--env', 'DOC_TDS_CMS_UPSTREAM=http://127.0.0.1:8080/graphql'], {...deps, doctorRuntime})).rejects.toThrow(/Canonical CMS ownership.*owner-mismatch/u)
  expect(doctorRuntime).toHaveBeenCalledOnce()
  expect(events.filter(event => event.event === 'started')).toEqual([])
}, 30_000)

test.each([
  ['FIVE_WORDPRESS_GRAPHQL_URL', 'editorial-five'],
  ['WORDPRESS_PREVIEW_URL', 'editorial-five'],
  ['EDITORIAL_WORDPRESS_GRAPHQL_URL', 'editorial-isolation'],
  ['EDITORIAL_WORDPRESS_PREVIEW_URL', 'site-a-editorial-preview'],
  ['PRODUCT_REVIEW_WORDPRESS_GRAPHQL_URL', 'site-a-products-review-preview'],
  ['POLAND_LOCAL_GRAPHQL_URL', 'poland-g9-isolation'],
])('preflights actual %s even when final Next CMS is elsewhere', async (name, spec) => {
  const {runOwnedE2e, events, deps} = await setup()
  const doctorRuntime = vi.fn(async () => ({fixedEndpoints: [{port: 8080, state: 'unknown-listener'}]}))
  const value = `http://127.0.0.1:8080/${name!.endsWith('PREVIEW_URL') ? 'wp-json/tio2/v1/preview' : 'graphql'}`
  await expect(runOwnedE2e(['--site', 'tio2-my', '--spec', `tests/e2e/${spec}.spec.ts`], {
    ...deps, doctorRuntime, environment: {...deps.environment,
      FIVE_WORDPRESS_GRAPHQL_URL: deps.environment.WORDPRESS_GRAPHQL_URL,
      EDITORIAL_WORDPRESS_GRAPHQL_URL: deps.environment.WORDPRESS_GRAPHQL_URL,
      EDITORIAL_WORDPRESS_PREVIEW_URL: 'http://127.0.0.1:54321/wp-json/tio2/v1/preview',
      [name!]: value},
  })).rejects.toThrow(/Canonical CMS ownership.*unknown-listener/u)
  expect(doctorRuntime).toHaveBeenCalledOnce()
  expect(events.filter(event => event.event === 'started')).toEqual([])
}, 30_000)

test('unrelated fixtures cannot supply an undeclared Next CMS fallback', async () => {
  const {runOwnedE2e, events, fixture, deps} = await setup()
  await expect(runOwnedE2e(['--site', 'tio2-my', '--spec', 'tests/e2e/document-reach.spec.ts', '--fixture', `DOC_REACH_FIXTURE_URL=${fixture}`], {
    ...deps, environment: {...deps.environment, WORDPRESS_GRAPHQL_URL: undefined},
  })).rejects.toThrow(/WORDPRESS_GRAPHQL_URL is required/u)
  expect(events.filter(event => event.event === 'started')).toEqual([])
})

test('rejects --env/--fixture ownership ambiguity before launching', async () => {
  const {runOwnedE2e, fixture, events, deps} = await setup()
  await expect(runOwnedE2e(['--site', 'tio2-my', '--spec', 'tests/e2e/document-reach.spec.ts',
    '--fixture', `DOC_REACH_FIXTURE_URL=${fixture}`, '--env', 'DOC_REACH_FIXTURE_URL=http://127.0.0.1:54322/'], deps)).rejects.toThrow(/both --env and --fixture/u)
  expect(events.filter(event => event.event === 'started')).toEqual([])
}, 30_000)

test('multiple fixture mappings are exact and order independent; neither overrides explicit Next CMS', async () => {
  for (const reversed of [false, true]) {
    const {runOwnedE2e, fixture, resultPath, deps} = await setup()
    const declarations = ['DOC_REACH_FIXTURE_URL', 'AUX_FIXTURE_URL']
    if (reversed) declarations.reverse()
    await runOwnedE2e(['--site', 'tio2-my', '--spec', 'tests/e2e/document-reach.spec.ts', ...declarations.flatMap(name => ['--fixture', `${name}=${fixture}`])], deps)
    const env = JSON.parse(await readFile(resultPath, 'utf8'))
    expect(env.WORDPRESS_GRAPHQL_URL).toBe(deps.environment.WORDPRESS_GRAPHQL_URL)
    expect(env.DOC_REACH_FIXTURE_URL).not.toBe(env.AUX_FIXTURE_URL)
    expect(new URL(env.DOC_REACH_FIXTURE_URL).pathname).toBe('/')
  }
}, 60_000)

test('a same-named WORDPRESS_GRAPHQL_URL fixture maps only its declared GraphQL path', async () => {
  const {runOwnedE2e, fixture, resultPath, deps} = await setup()
  await runOwnedE2e(['--site', 'tio2-my', '--spec', 'tests/e2e/document-reach.spec.ts',
    '--fixture', `DOC_REACH_FIXTURE_URL=${fixture}`, '--fixture', `WORDPRESS_GRAPHQL_URL=${fixture}`], deps)
  const env = JSON.parse(await readFile(resultPath, 'utf8'))
  expect(new URL(env.WORDPRESS_GRAPHQL_URL).pathname).toBe('/graphql')
  expect(new URL(env.WORDPRESS_GRAPHQL_URL).origin).not.toBe(new URL(env.DOC_REACH_FIXTURE_URL).origin)
}, 45_000)

test('mixed two-sites + product-hub always maps A, B and MY to three separate owned runtimes', async () => {
  const {runOwnedE2e, resultPath, deps, events} = await setup()
  await runOwnedE2e(['--site', 'tio2-a', '--spec', 'tests/e2e/two-sites.spec.ts', '--spec', 'tests/e2e/product-hub.spec.ts'], deps)
  const env = JSON.parse(await readFile(resultPath, 'utf8'))
  expect(new Set([env.TIO2_A_BASE_URL, env.TIO2_B_BASE_URL, env.TIO2_MY_BASE_URL]).size).toBe(3)
  expect(events.filter(event => event.event === 'ready' && String(event.label).startsWith('next:')).map(event => event.siteId).sort()).toEqual(['tio2-a', 'tio2-b', 'tio2-my'])
}, 60_000)

test('abnormally exited parent does not release a lease until its detached descendant and listener are stopped', async () => {
  const {runOwnedE2e, root, deps} = await setup()
  const descendant = join(root, 'descendant.mjs')
  const discoveryPath = join(root, 'descendant.json')
  const secretPath = `/stop-${root.split(/[\\/]/u).at(-1)}`
  await writeFile(descendant, `import {createServer} from 'node:http';import {writeFileSync} from 'node:fs';const port=Number(process.argv[2]);const server=createServer((q,s)=>{s.end('<main data-site-id="tio2-my"></main>');if(q.url===${JSON.stringify(secretPath)})server.close(()=>process.exit(0));}).listen(port,'127.0.0.1',()=>{writeFileSync(${JSON.stringify(discoveryPath)},JSON.stringify({pid:process.pid,port}));});`)
  await writeFile(deps.nextCli, `import {spawn} from 'node:child_process';import {existsSync} from 'node:fs';const child=spawn(process.execPath,[${JSON.stringify(descendant)},process.argv[process.argv.indexOf('--port')+1]],{stdio:'ignore',detached:true,windowsHide:true});child.unref();const timer=setInterval(()=>{if(existsSync(${JSON.stringify(discoveryPath)})){clearInterval(timer);process.exit(29)}},10);`)
  let discovered: {pid: number, port: number} | undefined
  try {
    await expect(runOwnedE2e(['--site', 'tio2-my', '--spec', 'tests/e2e/product-hub.spec.ts'], deps)).rejects.toThrow(/exited before readiness/u)
    discovered = JSON.parse(await readFile(discoveryPath, 'utf8'))
    await expect(fetch(`http://127.0.0.1:${discovered!.port}/`, {signal: AbortSignal.timeout(1_000)})).rejects.toThrow()
    expect(await readdir(deps.leaseRoot)).toEqual([])
  } finally {
    discovered ??= await readFile(discoveryPath, 'utf8').then(JSON.parse).catch(() => undefined)
    if (discovered) await fetch(`http://127.0.0.1:${discovered.port}${secretPath}`, {signal: AbortSignal.timeout(1_000)}).catch(() => {})
  }
}, 45_000)

test.each(['next', 'playwright-descendant'])('a changed %s process identity is neither terminated nor released', async target => {
  const {runOwnedE2e, deps, events} = await setup()
  if (target === 'playwright-descendant') await writeFile(deps.playwrightCli, `import {spawn} from 'node:child_process';const child=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'ignore',detached:true,windowsHide:true});child.unref();setTimeout(()=>process.exit(0),50);`)
  let supervisor: {attach(pid: number, token: string, gate: string, executable: string): Promise<{command: string}>; snapshot(token: string): Promise<unknown[]>; stop(token: string, identities: unknown[]): Promise<void>; close(): Promise<void>} | undefined
  let ownedToken: string | undefined
  const supervisorFactory = async () => {
    const {createProcessSupervisor} = await import(resolve('scripts/runtime-ports/owned-process-tree.mjs'))
    supervisor = await createProcessSupervisor()
    return {...supervisor, close: async () => {},
      attach: async (pid: number, token: string, gate: string, executable: string) => {
        const identity = await supervisor!.attach(pid, token, gate, executable)
        if (identity.command.includes(target === 'next' ? deps.nextCli : deps.playwrightCli)) ownedToken = token
        return identity
      },
      stop: async (token: string, identities: Array<Record<string, unknown>>) => {
        await supervisor!.stop(token, token === ownedToken ? identities.map(identity => ({...identity, startTime: 'wrong-start-time'})) : identities)
      }}
  }
  try {
    await expect(runOwnedE2e(['--site', 'tio2-my', '--spec', 'tests/e2e/product-hub.spec.ts'], {...deps, supervisorFactory})).rejects.toThrow(/cleanup failed/u)
    const ready = events.find(event => event.event === 'ready' && event.label === 'next:tio2-my')!
    if (target === 'next') expect(await (await fetch(String(ready.baseUrl))).text()).toContain('data-site-id="tio2-my"')
    expect((await supervisor!.snapshot(ownedToken!)).length).toBeGreaterThan(0)
    expect((await readdir(deps.leaseRoot)).filter(path => path.endsWith('.json'))).toHaveLength(1)
  } finally {
    if (supervisor && ownedToken) await supervisor.stop(ownedToken, await supervisor.snapshot(ownedToken))
    await supervisor?.close()
  }
}, 45_000)

test('same-site HTML from a foreign listening owner cannot satisfy readiness or start Playwright', async () => {
  const {runOwnedE2e, deps, events} = await setup()
  const foreign = createServer((_request, response) => response.end('foreign-owner-alive'))
  await new Promise<void>(done => foreign.listen(0, '127.0.0.1', done))
  const address = foreign.address()
  if (!address || typeof address === 'string') throw new Error('No controlled foreign listener')
  const supervisorFactory = async () => {
    const {createProcessSupervisor} = await import(resolve('scripts/runtime-ports/owned-process-tree.mjs'))
    const supervisor = await createProcessSupervisor()
    return {...supervisor, listenerOwners: async () => [process.pid]}
  }
  try {
    await expect(runOwnedE2e(['--site', 'tio2-my', '--spec', 'tests/e2e/product-hub.spec.ts'], {...deps, supervisorFactory})).rejects.toThrow(/foreign listening owner|cleanup failed/u)
    expect(events.some(event => event.event === 'started' && event.label === 'playwright')).toBe(false)
    expect((await readdir(deps.leaseRoot)).filter(path => path.endsWith('.json'))).toHaveLength(1)
    expect(await (await fetch(`http://127.0.0.1:${address.port}/`)).text()).toBe('foreign-owner-alive')
  } finally { await new Promise<void>((done, reject) => foreign.close(error => error ? reject(error) : done())) }
}, 45_000)

test('a service exit after readiness prevents the gated Playwright entry from executing', async () => {
  const {runOwnedE2e, deps, events, resultPath} = await setup()
  await writeFile(deps.nextCli, `import {createServer} from 'node:http';const port=Number(process.argv[process.argv.indexOf('--port')+1]);createServer((q,s)=>{s.end('<main data-site-id="tio2-my"></main>');if(q.url==='/controlled-exit')setTimeout(()=>process.exit(29),0)}).listen(port,'127.0.0.1');`)
  await expect(runOwnedE2e(['--site', 'tio2-my', '--spec', 'tests/e2e/product-hub.spec.ts'], {
    ...deps, emit: (event: Record<string, unknown>) => {
      events.push(event)
      if (event.event === 'ready' && event.label === 'next:tio2-my') void fetch(`${event.baseUrl}/controlled-exit`).catch(() => {})
    },
  })).rejects.toThrow(/exited before readiness|exited during/u)
  expect(await readFile(resultPath, 'utf8').catch(() => undefined)).toBeUndefined()
  expect(await readdir(deps.leaseRoot)).toEqual([])
}, 30_000)
