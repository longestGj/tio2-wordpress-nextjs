import {execFile} from 'node:child_process'
import {createHash} from 'node:crypto'
import {createServer} from 'node:net'
import {dirname, resolve} from 'node:path'
import {promisify} from 'node:util'
import {wordpressComposeArgs, type WordPressComposeOptions} from './wordpress-compose'
// @ts-expect-error -- Runtime leases are intentionally delivered as an MJS script.
import {attachLease, listLeases, registerObservedLease, releaseLease} from '../../scripts/runtime-ports/lease-core.mjs'

const execFileAsync = promisify(execFile)
export interface WordPressRuntimeOptions extends WordPressComposeOptions {
  worktree?: string
  commit?: string
  siteId?: string
  leaseRoot?: string
  environment?: Record<string, string | undefined>
  stopTimeoutMs?: number
  execute?: (args: string[]) => Promise<string>
}

export interface OwnedWordPressRuntime {
  readonly projectName: string
  readonly composeArgs: readonly string[]
  readonly graphqlUrl: string | null
  wp(args: string[]): Promise<string>
  stop(): Promise<void>
}

interface Container {
  Id: string
  Config: {Labels: Record<string, string>}
}
interface RenderedConfig {
  name: string
  services: Record<string, {ports?: {target: number; host_ip?: string; published?: string | number}[]}>
  volumes?: Record<string, {name: string; external?: boolean}>
}

function publishedEndpoint(output: string) {
  const match = /^(127\.0\.0\.1|\[::1\]):([0-9]+)$/u.exec(output.trim())
  const port = Number(match?.[2])
  if (!match || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('Expected one loopback published port from Compose')
  }
  return {host: match[1], port, graphqlUrl: `http://${match[1]}:${port}/graphql`}
}

const normalizePath = (value: string) => value.replace(/\\/gu, '/').replace(/\/$/u, '')
const digest = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')

async function portClosed(port: number, host: string) {
  const server = createServer()
  try {
    await new Promise<void>((done, reject) => {
      server.once('error', reject)
      server.listen(port, host === '[::1]' ? '::1' : host, done)
    })
    return true
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EADDRINUSE') return false
    throw error
  } finally {
    if (server.listening) await new Promise<void>((done, reject) => server.close(error => error ? reject(error) : done()))
  }
}

function assertReadOnly(args: string[]) {
  const commands = new Set(['core version', 'core is-installed', 'option get', 'option list', 'post get', 'post list',
    'post meta get', 'post meta list', 'term get', 'term list', 'user get', 'user list', 'plugin list', 'plugin status', 'theme list'])
  const command = args.slice(0, args[1] === 'meta' ? 3 : 2).join(' ')
  if (!commands.has(command) || args.some(arg => /^--(?:require|exec|ssh|http|path|config)(?:=|$)/u.test(arg) || arg.startsWith('@'))) {
    throw new Error('Command is not permitted in shared-read-only mode')
  }
}

/** The returned runtime owns only its generated project; shared modes never manage lifecycle. */
export async function startIsolatedWordPress(options: WordPressRuntimeOptions): Promise<OwnedWordPressRuntime> {
  const worktree = resolve(options.worktree ?? process.cwd())
  const environment = {...(options.environment ?? process.env)}
  const composeArgs = Object.freeze(wordpressComposeArgs(options, environment))
  const projectName = composeArgs[2]
  const execute = options.execute ?? (async (args: string[]) => {
    const {stdout} = await execFileAsync('docker', args, {cwd: worktree, windowsHide: true,
      env: {...process.env, ...environment}, encoding: 'utf8', timeout: 180_000, maxBuffer: 8 * 1024 * 1024})
    return stdout
  })
  const compose = (...args: string[]) => execute([...composeArgs, ...args])
  const isolated = options.dataMode === 'isolated'
  let endpoint: ReturnType<typeof publishedEndpoint> | null = null
  let leaseId: string | null = null
  let stopped = false
  let stopping: Promise<void> | null = null
  let downCompleted = false
  let configHash = ''
  let serviceHashes: Record<string, string> = {}
  let owners: Container[] = []
  const leaseRoot = options.leaseRoot ?? resolve(worktree, '.runtime/port-leases')
  const configFiles = composeArgs.flatMap((arg, index) => arg === '-f' ? [normalizePath(resolve(worktree, composeArgs[index + 1]))] : [])
  const projectDirectory = normalizePath(dirname(resolve(worktree, composeArgs[composeArgs.indexOf('-f') + 1])))
  const environmentFile = normalizePath(resolve(worktree, composeArgs[composeArgs.indexOf('--env-file') + 1]))
  const readConfig = async (): Promise<RenderedConfig> => JSON.parse(await compose('config', '--format', 'json'))
  const projectContainers = async () => (await execute(['ps', '--all', '--quiet', '--no-trunc', '--filter', `label=com.docker.compose.project=${projectName}`])).trim().split(/\s+/u).filter(Boolean)

  async function inspectOwners(): Promise<Container[]> {
    const ids = await projectContainers()
    if (ids.length === 0) throw new Error('Compose owner mismatch: owned containers are missing')
    const containers: Container[] = JSON.parse(await execute(['inspect', ...ids]))
    if (containers.length !== ids.length || containers.some(container => !ids.includes(container.Id))) throw new Error('Compose owner identity mismatch')
    for (const container of containers) {
      const labels = container.Config?.Labels ?? {}
      if (labels['com.docker.compose.project'] !== projectName
        || labels['com.docker.compose.project.config_files']?.split(',').map(normalizePath).join(',') !== configFiles.join(',')
        || normalizePath(labels['com.docker.compose.project.working_dir'] ?? '') !== projectDirectory
        || normalizePath(labels['com.docker.compose.project.environment_file'] ?? '') !== environmentFile
        || labels['com.docker.compose.config-hash'] !== serviceHashes[labels['com.docker.compose.service']]
        || !['db', 'wordpress'].includes(labels['com.docker.compose.service'])) {
        throw new Error('Compose owner/config labels mismatch; resources and lease retained')
      }
    }
    if (!['db', 'wordpress'].every(service => containers.some(container => container.Config.Labels['com.docker.compose.service'] === service))) {
      throw new Error('Compose owner mismatch: required services missing')
    }
    return containers.map(({Id, Config}) => ({Id, Config: {Labels: Config.Labels}})).sort((a, b) => a.Id.localeCompare(b.Id))
  }

  try {
    if (isolated) {
      const config = await readConfig()
      if (config.name !== projectName || (config.services.db?.ports ?? []).length > 0) throw new Error('Unsafe isolated Compose config')
      const ports = config.services.wordpress?.ports ?? []
      if (options.hostHttp
        ? ports.length !== 1 || ports[0].target !== 80 || ports[0].host_ip !== '127.0.0.1' || ![undefined, '', '0', 0].includes(ports[0].published)
        : ports.length !== 0) throw new Error('Unsafe isolated WordPress port config')
      for (const [name, volume] of Object.entries(config.volumes ?? {})) {
        if (volume.external || volume.name !== `${projectName}_${name}`) throw new Error('Unsafe shared volume in isolated Compose config')
      }
      configHash = digest(config)
      serviceHashes = Object.fromEntries((await compose('config', '--hash', '*')).trim().split(/\r?\n/u).map(line => line.trim().split(/\s+/u)))
      if (!['db', 'wordpress'].every(service => /^[a-f0-9]{64}$/u.test(serviceHashes[service] ?? ''))) throw new Error('Missing Compose service config hashes')
      if ((await projectContainers()).length) throw new Error('Compose project already has an owner')
      await compose('up', '-d', '--wait', 'db', 'wordpress')
      owners = await inspectOwners()
    }
    if (options.hostHttp) {
      endpoint = publishedEndpoint(await compose('port', 'wordpress', '80'))
      if (isolated) {
        const commit = options.commit ?? (await execFileAsync('git', ['rev-parse', 'HEAD'], {cwd: worktree, windowsHide: true})).stdout.trim()
        const lease = await registerObservedLease({leaseRoot, runId: options.runId, purpose: 'test-wordpress',
          siteId: options.siteId ?? null, worktree, commit, ports: [endpoint.port], composeProject: projectName})
        leaseId = lease.leaseId
        await attachLease({leaseRoot, leaseId, composeProject: projectName})
      }
    }
  } catch (error) {
    // Preserve uncertain/partially started resources and provide exact recovery identity.
    throw Object.assign(new Error(`WordPress startup failed for ${projectName}: ${(error as Error).message}`), {
      projectName, composeArgs, leaseId,
    })
  }

  async function stopOwned() {
    if (leaseId) {
      const records = await listLeases({leaseRoot})
      const record = records.find((candidate: {leaseId: string}) => candidate.leaseId === leaseId)
      if (!record || record.composeProject !== projectName || record.runId !== options.runId
        || record.worktree !== worktree || record.ports.length !== 1 || record.ports[0] !== endpoint?.port) {
        throw new Error('Lease owner mismatch; resources and lease retained')
      }
    }
    if (!downCompleted) {
      if (digest(await readConfig()) !== configHash) throw new Error('Compose config changed; resources and lease retained')
      if (digest(await inspectOwners()) !== digest(owners)) throw new Error('Compose owner changed; resources and lease retained')
      await compose('down')
      downCompleted = true
    }
    if (endpoint) {
      const deadline = Date.now() + (options.stopTimeoutMs ?? 10_000)
      while (!await portClosed(endpoint.port, endpoint.host)) {
        if (Date.now() >= deadline) throw new Error('WordPress listener remains open; lease retained')
        await new Promise(done => setTimeout(done, 20))
      }
    }
    if (leaseId) await releaseLease({leaseRoot, leaseId, expectedComposeProject: projectName})
    stopped = true
  }

  return Object.freeze({projectName, composeArgs, graphqlUrl: endpoint?.graphqlUrl ?? null,
    async wp(args: string[]) {
      if (stopped || stopping) throw new Error('WordPress runtime has stopped')
      if (options.dataMode === 'shared-read-only') assertReadOnly(args)
      return compose('run', '--rm', '--no-deps', '-T', 'wpcli', 'wp', ...args)
    },
    async stop() {
      if (!isolated || stopped) return
      if (!stopping) stopping = stopOwned().finally(() => { stopping = null })
      await stopping
    },
  })
}
