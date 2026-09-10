import {execFileSync} from 'node:child_process'
import {existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync} from 'node:fs'
import {createServer, type Server} from 'node:net'
import {tmpdir} from 'node:os'
import {join, resolve} from 'node:path'
import {afterEach, describe, expect, it} from 'vitest'

const roots: string[] = []
const servers: Server[] = []
afterEach(async () => {
  for (const server of servers.splice(0)) if (server.listening) await new Promise<void>(done => server.close(() => done()))
  for (const root of roots.splice(0)) rmSync(root, {recursive: true, force: true})
})

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

async function fixture(hostHttp = true) {
  const leaseRoot = mkdtempSync(join(tmpdir(), 'wordpress-owned-test-'))
  roots.push(leaseRoot)
  const server = createServer()
  servers.push(server)
  if (hostHttp) await new Promise<void>(done => server.listen(0, '127.0.0.1', done))
  const address = server.address()
  const port = address && typeof address !== 'string' ? address.port : 0
  const calls: string[][] = []
  let started = false
  let project = ''
  let changedOwner = false
  let changedConfig = false
  let keepListener = false
  let portOutput = `127.0.0.1:${port}`
  let changingState = false
  let badHash = false
  let badEnvironment = false
  let inspections = 0
  const ids = {db: 'a'.repeat(64), wordpress: 'b'.repeat(64)}
  const execute = async (args: string[]) => {
    calls.push([...args])
    if (args[0] === 'inspect') return JSON.stringify((['db', 'wordpress'] as const).map(service => ({
      Id: ids[service], State: {Status: changingState ? String(inspections++) : 'running'}, Config: {Labels: {
        'com.docker.compose.project': changedOwner ? 'wordpress' : project,
        'com.docker.compose.project.config_files': [resolve('wordpress/docker-compose.yml'), resolve(`wordpress/docker-compose.test-${hostHttp ? 'random-http' : 'no-host'}.yml`)].join(','),
        'com.docker.compose.project.working_dir': resolve('wordpress'),
        'com.docker.compose.project.environment_file': resolve(badEnvironment ? 'wrong.env' : 'wordpress/.env'),
        'com.docker.compose.config-hash': badHash ? 'f'.repeat(64) : ids[service],
        'com.docker.compose.service': service,
      }},
    })))
    if (args[0] === 'ps') return started ? Object.values(ids).map(id => args.includes('--no-trunc') ? id : id.slice(0, 12)).join('\n') : ''
    project = args[2]
    if (args.includes('--hash')) return `db ${ids.db}\nwordpress ${ids.wordpress}`
    if (args.includes('config')) return JSON.stringify({name: project, services: {db: {}, wordpress: {
      ports: hostHttp ? [{target: 80, host_ip: '127.0.0.1'}] : [], image: changedConfig ? 'changed' : 'original',
    }}, volumes: {db_data: {name: `${project}_db_data`}, wp_data: {name: `${project}_wp_data`}}})
    if (args.includes('up')) { started = true; return '' }
    if (args.includes('port')) return portOutput
    if (args.includes('down')) {
      expect(readdirSync(leaseRoot).filter(name => name.endsWith('.json'))).toHaveLength(hostHttp ? 1 : 0)
      started = false
      if (server.listening && !keepListener) await new Promise<void>(done => server.close(() => done()))
      return ''
    }
    if (args.includes('run')) {
      if (args[args.indexOf('wpcli') + 1] !== 'wp') throw new Error('WordPress CLI image requires the wp command')
      return 'wp-result'
    }
    throw new Error(`Unexpected Docker command: ${args.join(' ')}`)
  }
  const start = async (extra = {}) => {
    expect(existsSync('tests/helpers/wordpress-runtime.ts')).toBe(true)
    const {startIsolatedWordPress} = await import('../helpers/wordpress-runtime')
    return startIsolatedWordPress({dataMode: 'isolated', runId: 'lifecycle', hostHttp, leaseRoot,
      commit: 'a'.repeat(40), execute, environment: {}, ...extra})
  }
  return {start, calls, leaseRoot, port, changeOwner: () => { changedOwner = true }, changeConfig: () => { changedConfig = true },
    keepListener: () => { keepListener = true }, setPort: (value: string) => { portOutput = value }, changeState: () => { changingState = true },
    badHash: () => { badHash = true }, badEnvironment: () => { badEnvironment = true }}
}

describe('owned WordPress lifecycle', () => {
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
