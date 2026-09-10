import {execFile} from 'node:child_process'
import {readFile, readdir} from 'node:fs/promises'
import {createConnection} from 'node:net'
import {dirname, join, resolve} from 'node:path'
import {promisify} from 'node:util'

const execFileAsync = promisify(execFile)
const pathKey = value => typeof value === 'string' ? value.replaceAll('\\', '/').replace(/\/$/u, '').toLowerCase() : ''

async function canonicalRepositoryRoot() {
  const {stdout} = await execFileAsync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], {windowsHide: true})
  return dirname(stdout.trim())
}

async function probeListener(port) {
  return new Promise((resolveProbe, rejectProbe) => {
    const socket = createConnection({host: '127.0.0.1', port})
    socket.setTimeout(1000)
    socket.once('connect', () => { socket.destroy(); resolveProbe(true) })
    socket.once('timeout', () => { socket.destroy(); rejectProbe(new Error('Socket probe timed out')) })
    socket.once('error', error => {
      socket.destroy()
      if (error.code === 'ECONNREFUSED') resolveProbe(false)
      else rejectProbe(error)
    })
  })
}

async function inspectCompose() {
  const {stdout} = await execFileAsync('docker', ['ps', '--filter', 'label=com.docker.compose.project', '--format', '{{json .}}'], {windowsHide: true, timeout: 10000})
  const containers = stdout.trim() ? stdout.trim().split(/\r?\n/u).map(line => JSON.parse(line)) : []
  return Promise.all(containers.map(async container => {
    const {stdout: labelsJson} = await execFileAsync('docker', ['inspect', container.ID, '--format', '{{json .Config.Labels}}'], {windowsHide: true, timeout: 10000})
    const labels = JSON.parse(labelsJson)
    return {
      containerId: container.ID,
      project: labels['com.docker.compose.project'],
      workingDir: labels['com.docker.compose.project.working_dir'],
      configFiles: (labels['com.docker.compose.project.config_files'] ?? '').split(',').filter(Boolean),
      service: labels['com.docker.compose.service'],
      ports: [...(container.Ports ?? '').matchAll(/(?:127\.0\.0\.1|0\.0\.0\.0):(\d+)->/gu)].map(match => Number(match[1])),
    }
  }))
}

function ownerMatches(owner, repositoryRoot, composeFile) {
  // Compose normally labels its config directory; older explicit project-directory
  // invocations use the repository root. Both must point to this exact config.
  return [repositoryRoot, dirname(composeFile)].some(path => pathKey(owner.workingDir) === pathKey(path))
    && owner.configFiles?.length === 1
    && pathKey(owner.configFiles[0]) === pathKey(composeFile)
}

async function readLeaseEvidence(leaseRoot, owners, docker, probePort) {
  const names = await readdir(leaseRoot)
  return Promise.all(names.filter(name => name.endsWith('.json')).map(async name => {
    const lease = JSON.parse(await readFile(join(leaseRoot, name), 'utf8'))
    if (lease.schemaVersion !== 1 || name !== `${lease.leaseId}.json`
      || lease.host !== '127.0.0.1' || !Array.isArray(lease.ports) || !lease.ports.length
      || lease.ports.some(port => !Number.isInteger(port) || port < 1 || port > 65535)
      || !Array.isArray(lease.processIds)) throw new Error('Invalid lease evidence')
    let evidenceIncomplete = false
    const retained = lease.retainUntil !== null && Date.parse(lease.retainUntil) > Date.now()
    const liveProcess = lease.processIds.some(processId => {
      if (!Number.isInteger(processId) || processId < 1) { evidenceIncomplete = true; return false }
      try { process.kill(processId, 0); return true } catch (error) {
        if (error.code !== 'ESRCH') evidenceIncomplete = true
        return false
      }
    })
    const liveCompose = lease.composeProject !== null && owners.some(owner => owner.project === lease.composeProject)
    if (lease.composeProject !== null && !docker.available) evidenceIncomplete = true
    const listeners = await Promise.all(lease.ports.map(async port => {
      try {
        const listening = await probePort(port)
        if (typeof listening !== 'boolean') evidenceIncomplete = true
        return listening === true
      } catch { evidenceIncomplete = true; return false }
    }))
    return {lease, stale: !evidenceIncomplete && !retained && !liveProcess && !liveCompose && !listeners.some(Boolean), evidenceIncomplete}
  }))
}

/** Read-only evidence. No stop, lease release, cleanup or state writes occur here. */
export async function doctorRuntime({
  leaseRoot = resolve('.runtime/port-leases'),
  repositoryRoot,
  dockerInspect = inspectCompose,
  probePort = probeListener,
} = {}) {
  repositoryRoot ??= await canonicalRepositoryRoot()
  const fixed = [
    {environment: 'development', service: 'next', siteId: 'tio2-a', port: 3001},
    {environment: 'development', service: 'next', siteId: 'tio2-b', port: 3002},
    {environment: 'development', service: 'next', siteId: 'tio2-my', port: 3003},
    {environment: 'development', service: 'wordpress', port: 8080, project: 'wordpress', composeFile: resolve(repositoryRoot, 'wordpress/docker-compose.yml')},
    {environment: 'prerelease', service: 'web', port: 3100, project: 'd16-tio2-my-prerelease', composeFile: resolve(repositoryRoot, 'ops/prerelease/docker-compose.yml')},
    {environment: 'prerelease', service: 'wordpress', port: 8180, project: 'd16-tio2-my-prerelease', composeFile: resolve(repositoryRoot, 'ops/prerelease/docker-compose.yml')},
  ]
  let owners = []
  const docker = {available: true}
  try {
    owners = await dockerInspect()
    if (!Array.isArray(owners)) throw new Error('Invalid Docker evidence')
  } catch { owners = []; docker.available = false }
  const duplicateProjects = [...new Set(owners.map(owner => owner.project))].filter(project => {
    const identities = owners.filter(owner => owner.project === project).map(owner => JSON.stringify([pathKey(owner.workingDir), owner.configFiles?.map(pathKey).sort()]))
    return new Set(identities).size > 1
  })
  const fixedEndpoints = await Promise.all(fixed.map(async endpoint => {
    const result = {...endpoint, host: '127.0.0.1', state: 'unknown-listener', owner: null}
    let listening
    try { listening = await probePort(endpoint.port) } catch { return {...result, reason: 'probe-unavailable'} }
    if (typeof listening !== 'boolean') return {...result, reason: 'probe-unavailable'}
    if (endpoint.project && !docker.available) return {...result, reason: 'docker-unavailable', listening}
    const candidates = owners.filter(owner => owner.project === endpoint.project)
    if (endpoint.project && candidates.some(owner => !ownerMatches(owner, repositoryRoot, endpoint.composeFile))) {
      return {...result, state: 'owner-mismatch', owner: candidates, listening}
    }
    if (!listening) return {...result, state: 'available'}
    const owner = candidates.find(candidate => candidate.ports === undefined || (candidate.ports.includes(endpoint.port) && candidate.service === endpoint.service))
    if (owner) return {...result, state: 'expected-owner', owner}
    // A responding frontend without process ownership evidence remains unknown.
    return result
  }))
  let leases = []
  let leaseError = null
  try {
    // Allocator query helpers may mkdir or bind a port; Doctor only reads records.
    leases = await readLeaseEvidence(leaseRoot, owners, docker, probePort)
  } catch (error) {
    if (error.code !== 'ENOENT') leaseError = error.code ?? 'LEASE_INSPECTION_FAILED'
  }
  return {repositoryRoot, fixedEndpoints, docker, duplicateProjects, leases, leaseError, actionsTaken: []}
}
