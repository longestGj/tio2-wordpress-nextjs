import {mkdtempSync, readdirSync, rmSync} from 'node:fs'
import {createServer} from 'node:net'
import {tmpdir} from 'node:os'
import {join, resolve} from 'node:path'
import type {WordPressRuntimeOptions} from './wordpress-runtime'

/** Test-only fixed Docker simulator: no child process, caller executor or CMS access.
 * Its only live resource is its own OS-selected loopback socket, closed on simulated
 * down/dispose. The frozen result is the classifier's explicit simulation capability. */
export async function createWordPressRuntimeSimulation(hostHttp = true) {
  if (typeof hostHttp !== 'boolean') throw new Error('Simulation hostHttp must be a boolean')
  const leaseRoot = mkdtempSync(join(tmpdir(), 'wordpress-owned-test-'))
  const server = createServer()
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
      if (readdirSync(leaseRoot).filter(name => name.endsWith('.json')).length !== (hostHttp ? 1 : 0)) throw new Error('Simulation lease count mismatch')
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
  const options: WordPressRuntimeOptions = {dataMode: 'isolated', runId: 'lifecycle', hostHttp, leaseRoot,
    commit: 'a'.repeat(40), execute, environment: {}}
  return Object.freeze({options, execute, calls, leaseRoot, port,
    changeOwner: () => { changedOwner = true }, changeConfig: () => { changedConfig = true },
    keepListener: () => { keepListener = true }, setPort: (value: string) => { portOutput = value },
    changeState: () => { changingState = true }, badHash: () => { badHash = true },
    badEnvironment: () => { badEnvironment = true },
    async dispose() {
      if (server.listening) await new Promise<void>(done => server.close(() => done()))
      rmSync(leaseRoot, {recursive: true, force: true})
    },
  })
}
