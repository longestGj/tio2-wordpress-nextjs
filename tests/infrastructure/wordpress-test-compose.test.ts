import {execFileSync} from 'node:child_process'
import {existsSync, readFileSync, readdirSync, writeFileSync} from 'node:fs'
import {join} from 'node:path'
import {afterEach, describe, expect, it} from 'vitest'
import {startIsolatedWordPress, type WordPressRuntimeOptions} from '../helpers/wordpress-runtime'
import {createWordPressRuntimeSimulation} from '../helpers/wordpress-runtime-simulation'

// Real Docker calls only render config; lifecycle calls below use an injected executor.
export const WORDPRESS_RUNTIME_MODE = {dataMode: 'isolated', hostHttp: false} as const

describe('rendered test topologies', () => {
  for (const hostHttp of [false, true]) it(`renders ${hostHttp ? 'random loopback HTTP' : 'no host HTTP'} without a database binding`, () => {
    const topology = hostHttp ? 'random-http' : 'no-host'
    expect(existsSync(`wordpress/docker-compose.test-${topology}.yml`)).toBe(true)
    const config = JSON.parse(execFileSync('docker', ['compose', '--project-name', 'd16-test-rendered',
      '--env-file', existsSync('wordpress/.env') ? 'wordpress/.env' : 'wordpress/.env.example',
      '-f', 'wordpress/docker-compose.yml', '-f', `wordpress/docker-compose.test-${topology}.yml`,
      'config', '--format', 'json'], {encoding: 'utf8', windowsHide: true}))
    expect(config.services.db.ports ?? []).toEqual([])
    if (hostHttp) {
      expect(config.services.wordpress.ports).toEqual([expect.objectContaining({target: 80, host_ip: '127.0.0.1'})])
      expect([undefined, '', '0', 0]).toContain(config.services.wordpress.ports[0].published)
    } else expect(config.services.wordpress.ports ?? []).toEqual([])
    expect(config.volumes.db_data.name).toBe('d16-test-rendered_db_data')
    expect(config.volumes.wp_data.name).toBe('d16-test-rendered_wp_data')
  })
})

const simulations: Awaited<ReturnType<typeof createWordPressRuntimeSimulation>>[] = []
afterEach(async () => {
  for (const simulation of simulations.splice(0)) await simulation.dispose()
})

async function fixture(hostHttp = true) {
  const runtimeSimulation = await createWordPressRuntimeSimulation(hostHttp)
  simulations.push(runtimeSimulation)
  let options = runtimeSimulation.options
  const start = async (extra: Partial<WordPressRuntimeOptions> = {}) =>
    // Assignment preserves the exact input reference for post-call mutation tests.
    startIsolatedWordPress(options = {...options, ...extra, execute: runtimeSimulation.execute})
  return {...runtimeSimulation, start, get options() { return options }}
}

describe('owned WordPress lifecycle', () => {
  it('cannot replace the simulation capability or inject an executor into its factory', async () => {
    const simulation = await createWordPressRuntimeSimulation(false)
    try {
      expect(Object.isFrozen(simulation)).toBe(true)
      expect(() => Object.assign(simulation, {execute: async () => 'untrusted'})).toThrow()
      await expect(createWordPressRuntimeSimulation({execute: async () => 'untrusted'} as unknown as boolean)).rejects.toThrow(/boolean/u)
    } finally { await simulation.dispose() }
  })
  for (const [label, mutation] of [
    ['shared-mutating mode', {dataMode: 'shared-mutating'}],
    ['isolated mode', {dataMode: 'isolated'}],
    ['serial authorization', {serialMutationAuthorized: true}],
    ['HTTP mode', {hostHttp: true}],
    ['run identity', {runId: 'changed-run'}],
  ] as const) it(`does not escalate shared read-only access after caller mutates ${label}`, async () => {
    const f = await fixture(false)
    const runtime = await f.start({dataMode: 'shared-read-only'})
    Object.assign(f.options, mutation)
    const before = f.calls.length
    await expect(runtime.wp(['option', 'update', 'home', 'https://example.invalid'])).rejects.toThrow(/read-only/u)
    await runtime.stop()
    expect(f.calls).toHaveLength(before)
  })

  it('keeps isolated project arguments and stop ownership fixed after caller mutates options', async () => {
    const f = await fixture()
    const runtime = await f.start()
    const projectName = runtime.projectName
    const composeArgs = [...runtime.composeArgs]
    const graphqlUrl = runtime.graphqlUrl
    Object.assign(f.options, {dataMode: 'shared-read-only', serialMutationAuthorized: false,
      hostHttp: false, runId: 'changed-run', worktree: 'changed-worktree', leaseRoot: 'changed-lease-root',
      commit: 'b'.repeat(40), siteId: 'changed-site', stopTimeoutMs: -1,
      execute: async () => { throw new Error('Replaced executor must not run') }})
    f.options.environment!.TIO2_TEST_WORDPRESS_PROJECT = 'wordpress'
    expect(runtime.projectName).toBe(projectName)
    expect(runtime.composeArgs).toEqual(composeArgs)
    expect(runtime.graphqlUrl).toBe(graphqlUrl)
    await runtime.stop()
    expect(f.calls.filter(args => args.includes('down'))).toEqual([[...composeArgs, 'down']])
    expect(readdirSync(f.leaseRoot)).toEqual([])
  })

  it('attaches exact project ownership and releases only after down closes the listener', async () => {
    const f = await fixture()
    const runtime = await f.start()
    expect(runtime.graphqlUrl).toBe(`http://127.0.0.1:${f.port}/graphql`)
    const filename = readdirSync(f.leaseRoot).find(name => name.endsWith('.json'))!
    expect(JSON.parse(readFileSync(join(f.leaseRoot, filename), 'utf8'))).toMatchObject({composeProject: runtime.projectName, ports: [f.port]})
    expect(await runtime.wp(['core', 'version'])).toBe('wp-result')
    await runtime.stop()
    expect(f.calls.filter(args => args.includes('down'))).toEqual([[...runtime.composeArgs, 'down']])
    expect(readdirSync(f.leaseRoot)).toEqual([])
    await runtime.stop()
    expect(f.calls.filter(args => args.includes('down'))).toHaveLength(1)
  })
  for (const mismatch of ['owner', 'config'] as const) it(`retains resources and lease on ${mismatch} mismatch`, async () => {
    const f = await fixture()
    const runtime = await f.start()
    if (mismatch === 'owner') f.changeOwner(); else f.changeConfig()
    await expect(runtime.stop()).rejects.toThrow(/owner|config/iu)
    expect(f.calls.some(args => args.includes('down'))).toBe(false)
    expect(readdirSync(f.leaseRoot).filter(name => name.endsWith('.json'))).toHaveLength(1)
  })
  it('retains the lease if the listener is still present after down', async () => {
    const f = await fixture()
    const runtime = await f.start({stopTimeoutMs: 30})
    f.keepListener()
    await expect(runtime.stop()).rejects.toThrow(/listener/iu)
    expect(readdirSync(f.leaseRoot).filter(name => name.endsWith('.json'))).toHaveLength(1)
  })
  it('compares stable ownership labels rather than mutable container state', async () => {
    const f = await fixture()
    f.changeState()
    const runtime = await f.start()
    await runtime.stop()
    expect(readdirSync(f.leaseRoot)).toEqual([])
  })
  it('checks lease owner before removing any containers', async () => {
    const f = await fixture()
    const runtime = await f.start()
    const path = join(f.leaseRoot, readdirSync(f.leaseRoot).find(name => name.endsWith('.json'))!)
    const record = JSON.parse(readFileSync(path, 'utf8'))
    writeFileSync(path, JSON.stringify({...record, composeProject: 'wordpress'}))
    await expect(runtime.stop()).rejects.toThrow(/owner/iu)
    expect(f.calls.some(args => args.includes('down'))).toBe(false)
    expect(existsSync(path)).toBe(true)
  })
  it('includes retained project recovery evidence when startup fails after up', async () => {
    const f = await fixture()
    f.setPort('0.0.0.0:1234')
    await expect(f.start()).rejects.toMatchObject({projectName: expect.stringMatching(/^d16-test-/u), composeArgs: expect.any(Array)})
    expect(f.calls.some(args => args.includes('down'))).toBe(false)
  })
  for (const wrong of ['hash', 'environment'] as const) it(`rejects startup when live ${wrong} differs from requested Compose config`, async () => {
    const f = await fixture()
    if (wrong === 'hash') f.badHash(); else f.badEnvironment()
    await expect(f.start()).rejects.toThrow(/config|owner/iu)
    expect(f.calls.some(args => args.includes('down'))).toBe(false)
  })
  it('runs CLI-only isolation without allocating a host port or lease', async () => {
    const f = await fixture(false)
    const runtime = await f.start()
    expect(runtime.graphqlUrl).toBeNull()
    expect(f.calls.some(args => args.includes('port'))).toBe(false)
    await runtime.stop()
    expect(readdirSync(f.leaseRoot)).toEqual([])
  })
  for (const dataMode of ['shared-read-only', 'shared-mutating'] as const) it(`never manages shared lifecycle in ${dataMode}`, async () => {
    const f = await fixture(false)
    const runtime = await f.start({dataMode, serialMutationAuthorized: true})
    expect(runtime.projectName).toBe('wordpress')
    expect(await runtime.wp(['option', 'get', 'home'])).toBe('wp-result')
    if (dataMode === 'shared-read-only') {
      for (const args of [['post', 'delete', '1'], ['eval', 'echo 1;'], ['option', 'get', 'home', '--require=bad.php']])
        await expect(runtime.wp(args)).rejects.toThrow(/read-only/u)
    } else expect(await runtime.wp(['option', 'update', 'home', 'example'])).toBe('wp-result')
    await runtime.stop()
    expect(f.calls.some(args => ['up', 'down', 'stop'].some(command => args.includes(command)))).toBe(false)
  })
  for (const address of ['0.0.0.0:1234', 'localhost:1234', '127.0.0.1:0', '127.0.0.1:70000', '127.0.0.1:1234\n0.0.0.0:1234'])
    it(`refuses untrusted published address ${JSON.stringify(address)}`, async () => {
      const f = await fixture()
      f.setPort(address)
      await expect(f.start()).rejects.toThrow(/loopback|port/iu)
    })
})
