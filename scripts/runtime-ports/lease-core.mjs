import {randomUUID} from 'node:crypto'
import {execFile} from 'node:child_process'
import {mkdir, readFile, readdir, rename, rm, writeFile} from 'node:fs/promises'
import {createServer} from 'node:net'
import {join, resolve, sep} from 'node:path'
import {promisify} from 'node:util'
import {resolveLeaseRoot} from './lease-root.mjs'

export const FEATURE_PORT_POOL = Object.freeze({start: 32000, end: 32099})
export const TEST_FALLBACK_PORT_POOL = Object.freeze({start: 32100, end: 32999})
export const LEASE_PURPOSES = Object.freeze([
  'feature-next', 'test-next', 'test-wordpress', 'fixture',
])

const LOCK_RETRY_MS = 10
const execFileAsync = promisify(execFile)
const LEASE_FIELDS = Object.freeze([
  'schemaVersion',
  'leaseId',
  'runId',
  'purpose',
  'siteId',
  'worktree',
  'commit',
  'host',
  'ports',
  'processIds',
  'composeProject',
  'createdAt',
  'retainUntil',
])
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu

function invalidLease(message) {
  const error = new Error(message)
  error.code = 'INVALID_LEASE'
  return error
}

function isPort(port) {
  return Number.isInteger(port) && port >= 1 && port <= 65535
}

function isIsoDate(value) {
  return typeof value === 'string'
    && Number.isFinite(Date.parse(value))
    && new Date(value).toISOString() === value
}

function assertLeaseId(leaseId) {
  if (typeof leaseId !== 'string' || !UUID_PATTERN.test(leaseId)) {
    throw invalidLease('Lease ID must be a valid UUID')
  }
}

function leasePath(leaseRoot, leaseId) {
  assertLeaseId(leaseId)
  const resolvedRoot = resolve(leaseRoot)
  const resolvedPath = resolve(resolvedRoot, `${leaseId}.json`)
  const rootPrefix = `${resolvedRoot}${sep}`.toLowerCase()
  if (!resolvedPath.toLowerCase().startsWith(rootPrefix)) {
    throw invalidLease('Lease path must remain inside the supplied lease root')
  }
  return resolvedPath
}

function assertLeaseRecord(record) {
  if (!record || typeof record !== 'object' || Array.isArray(record)) {
    throw invalidLease('Lease record must be an object')
  }
  const keys = Object.keys(record).sort()
  const expectedKeys = [...LEASE_FIELDS].sort()
  if (keys.length !== expectedKeys.length || keys.some((key, index) => key !== expectedKeys[index])) {
    throw invalidLease('Lease record fields do not match schema version 1')
  }
  assertLeaseId(record.leaseId)
  if (record.schemaVersion !== 1
    || typeof record.runId !== 'string' || record.runId.length === 0
    || !LEASE_PURPOSES.includes(record.purpose)
    || !(record.siteId === null || typeof record.siteId === 'string')
    || typeof record.worktree !== 'string' || record.worktree.length === 0
    || typeof record.commit !== 'string' || record.commit.length !== 40
    || record.host !== '127.0.0.1'
    || !Array.isArray(record.ports) || record.ports.length === 0
    || record.ports.some(port => !isPort(port))
    || new Set(record.ports).size !== record.ports.length
    || !Array.isArray(record.processIds)
    || record.processIds.some(processId => !Number.isInteger(processId) || processId < 1)
    || new Set(record.processIds).size !== record.processIds.length
    || !(record.composeProject === null || typeof record.composeProject === 'string')
    || !isIsoDate(record.createdAt)
    || !(record.retainUntil === null || isIsoDate(record.retainUntil))) {
    throw invalidLease('Lease record does not satisfy schema version 1')
  }
  return record
}

function assertReservationOptions({purpose, commit, count, pool}) {
  if (!LEASE_PURPOSES.includes(purpose)) {
    throw invalidLease(`Unsupported lease purpose: ${purpose}`)
  }
  if (typeof commit !== 'string' || commit.length !== 40) {
    throw invalidLease('Lease commit must contain exactly 40 characters')
  }
  if (!Number.isInteger(count) || count < 1) {
    throw invalidLease('Lease count must be a positive integer')
  }
  if (!pool || !isPort(pool.start) || !isPort(pool.end) || pool.start > pool.end) {
    throw invalidLease('Lease pool must be an inclusive valid TCP port range')
  }
  if (count > pool.end - pool.start + 1) {
    throw invalidLease('Lease count cannot exceed the supplied port pool')
  }
}

function delay(milliseconds) {
  return new Promise(resolveDelay => setTimeout(resolveDelay, milliseconds))
}

async function withAllocatorLock(leaseRoot, operation) {
  await mkdir(leaseRoot, {recursive: true})
  const lockPath = join(leaseRoot, '.allocator.lock')

  while (true) {
    try {
      await mkdir(lockPath)
      break
    } catch (error) {
      if (error?.code !== 'EEXIST') throw error
      await delay(LOCK_RETRY_MS)
    }
  }

  try {
    return await operation()
  } finally {
    await rm(lockPath, {recursive: true, force: true})
  }
}

async function readLeaseRecords(leaseRoot) {
  const names = await readdir(leaseRoot)
  const entries = await Promise.all(names
    .filter(name => name.endsWith('.json'))
    .map(async name => {
      const record = assertLeaseRecord(JSON.parse(await readFile(join(leaseRoot, name), 'utf8')))
      if (name !== `${record.leaseId}.json`) {
        throw invalidLease('Lease filename must match its UUID')
      }
      return record
    }))
  return entries.sort((left, right) => left.createdAt.localeCompare(right.createdAt))
}

async function readLeaseRecord(leaseRoot, leaseId) {
  const record = assertLeaseRecord(JSON.parse(await readFile(
    leasePath(leaseRoot, leaseId),
    'utf8',
  )))
  if (record.leaseId !== leaseId) {
    throw invalidLease('Lease record UUID must match its requested path')
  }
  return record
}

async function canBindPort(port) {
  const server = createServer()

  try {
    await new Promise((resolveListen, rejectListen) => {
      server.once('error', rejectListen)
      server.listen(port, '127.0.0.1', resolveListen)
    })
    return true
  } catch (error) {
    if (error?.code === 'EADDRINUSE') return false
    throw error
  } finally {
    if (server.listening) {
      await new Promise((resolveClose, rejectClose) => {
        server.close(error => error ? rejectClose(error) : resolveClose())
      })
    }
  }
}

function isProcessPresent(processId) {
  try {
    process.kill(processId, 0)
    return true
  } catch (error) {
    return error?.code === 'EPERM'
  }
}

async function isComposeProjectPresent(composeProject) {
  if (composeProject === null) return false
  try {
    const {stdout} = await execFileAsync('docker', [
      'ps',
      '--all',
      '--quiet',
      '--filter',
      `label=com.docker.compose.project=${composeProject}`,
    ], {windowsHide: true})
    return stdout.trim().length > 0
  } catch {
    return true
  }
}

async function isLeaseStale(record) {
  if (record.retainUntil !== null && Date.parse(record.retainUntil) > Date.now()) return false
  if (record.processIds.some(isProcessPresent)) return false
  if (await isComposeProjectPresent(record.composeProject)) return false
  for (const port of record.ports) {
    if (!await canBindPort(port)) return false
  }
  return true
}

async function discardOwnedStaleLeases(leaseRoot, records) {
  const retainedRecords = []
  for (const record of records) {
    const hasRecordedOwner = record.processIds.length > 0 || record.composeProject !== null
    if (hasRecordedOwner && await isLeaseStale(record)) {
      await rm(leasePath(leaseRoot, record.leaseId))
    } else {
      retainedRecords.push(record)
    }
  }
  return retainedRecords
}

async function writeLeaseRecord(leaseRoot, record) {
  assertLeaseRecord(record)
  const targetPath = leasePath(leaseRoot, record.leaseId)
  const temporaryPath = `${targetPath}.${process.pid}.tmp`
  try {
    await writeFile(temporaryPath, `${JSON.stringify(record, null, 2)}\n`, {flag: 'wx'})
    await rename(temporaryPath, targetPath)
  } catch (error) {
    await rm(temporaryPath, {force: true})
    throw error
  }
}

export async function listLeases({leaseRoot, worktree} = {}) {
  const resolvedLeaseRoot = leaseRoot === undefined ? resolveLeaseRoot(worktree) : resolve(leaseRoot)
  await mkdir(resolvedLeaseRoot, {recursive: true})
  return readLeaseRecords(resolvedLeaseRoot)
}

export async function inspectLease({
  leaseRoot,
  worktree,
  leaseId,
}) {
  const resolvedLeaseRoot = leaseRoot === undefined ? resolveLeaseRoot(worktree) : resolve(leaseRoot)
  const record = await readLeaseRecord(resolvedLeaseRoot, leaseId)
  return {lease: record, stale: await isLeaseStale(record)}
}

export async function attachLease({
  leaseRoot,
  worktree,
  leaseId,
  processId,
  composeProject,
}) {
  const hasProcessId = processId !== undefined && processId !== null
  const hasComposeProject = composeProject !== undefined && composeProject !== null
  if ((hasProcessId && (!Number.isInteger(processId) || processId < 1))
    || (hasComposeProject && (typeof composeProject !== 'string' || composeProject.length === 0))
    || (!hasProcessId && !hasComposeProject)) {
    throw invalidLease('Attachment requires a valid process ID or Compose project')
  }
  const resolvedLeaseRoot = leaseRoot === undefined ? resolveLeaseRoot(worktree) : resolve(leaseRoot)

  return withAllocatorLock(resolvedLeaseRoot, async () => {
    const record = await readLeaseRecord(resolvedLeaseRoot, leaseId)
    if (hasComposeProject
      && record.composeProject !== null
      && record.composeProject !== composeProject) {
      const error = new Error('Lease Compose owner does not match the recorded owner')
      error.code = 'OWNER_MISMATCH'
      throw error
    }
    const processIds = hasProcessId && !record.processIds.includes(processId)
      ? [...record.processIds, processId]
      : record.processIds
    const attached = {
      ...record,
      processIds,
      composeProject: hasComposeProject ? composeProject : record.composeProject,
    }
    await writeLeaseRecord(resolvedLeaseRoot, attached)
    return attached
  })
}

export async function registerObservedLease({
  leaseRoot,
  runId,
  purpose,
  siteId = null,
  worktree,
  commit,
  ports,
  processIds = [],
  composeProject = null,
}) {
  if (!LEASE_PURPOSES.includes(purpose)
    || typeof commit !== 'string' || commit.length !== 40
    || !Array.isArray(ports) || ports.length === 0
    || ports.some(port => !isPort(port))
    || new Set(ports).size !== ports.length
    || !Array.isArray(processIds)
    || processIds.some(processId => !Number.isInteger(processId) || processId < 1)
    || !(composeProject === null || (typeof composeProject === 'string' && composeProject.length > 0))
    || (processIds.length === 0 && composeProject === null)) {
    throw invalidLease('Observed lease requires valid metadata, ports, and an owner identity')
  }
  const resolvedLeaseRoot = leaseRoot === undefined ? resolveLeaseRoot(worktree) : resolve(leaseRoot)

  return withAllocatorLock(resolvedLeaseRoot, async () => {
    const records = await discardOwnedStaleLeases(
      resolvedLeaseRoot,
      await readLeaseRecords(resolvedLeaseRoot),
    )
    const conflictingRecords = records.filter(record => record.ports.some(port => ports.includes(port)))
    for (const record of conflictingRecords) {
      if (await isLeaseStale(record)) continue
      const error = new Error('Observed port is already held by another active lease')
      error.code = 'PORT_ALREADY_LEASED'
      throw error
    }
    for (const port of ports) {
      if (await canBindPort(port)) {
        const error = new Error(`Observed port ${port} has no listener on 127.0.0.1`)
        error.code = 'PORT_NOT_LISTENING'
        throw error
      }
    }
    const record = {
      schemaVersion: 1,
      leaseId: randomUUID(),
      runId,
      purpose,
      siteId,
      worktree,
      commit,
      host: '127.0.0.1',
      ports,
      processIds,
      composeProject,
      createdAt: new Date().toISOString(),
      retainUntil: null,
    }
    await writeLeaseRecord(resolvedLeaseRoot, record)
    return record
  })
}

export async function releaseLease({
  leaseRoot,
  worktree,
  leaseId,
  expectedProcessIds = [],
  expectedComposeProject = null,
}) {
  if (!Array.isArray(expectedProcessIds)
    || expectedProcessIds.some(processId => !Number.isInteger(processId) || processId < 1)
    || new Set(expectedProcessIds).size !== expectedProcessIds.length
    || !(expectedComposeProject === null
      || (typeof expectedComposeProject === 'string' && expectedComposeProject.length > 0))) {
    throw invalidLease('Expected lease ownership must be valid')
  }
  const resolvedLeaseRoot = leaseRoot === undefined ? resolveLeaseRoot(worktree) : resolve(leaseRoot)
  const recordPath = leasePath(resolvedLeaseRoot, leaseId)

  return withAllocatorLock(resolvedLeaseRoot, async () => {
    let record
    try {
      record = await readLeaseRecord(resolvedLeaseRoot, leaseId)
    } catch (error) {
      if (error?.code === 'ENOENT') return {released: false, leaseId}
      throw error
    }

    const expectedProcessesMatch = expectedProcessIds.length === 0
      || (expectedProcessIds.length === record.processIds.length
        && expectedProcessIds.every(processId => record.processIds.includes(processId)))
    const expectedComposeMatches = expectedComposeProject === null
      || expectedComposeProject === record.composeProject
    if (!expectedProcessesMatch || !expectedComposeMatches) {
      const error = new Error('Lease owner identity does not match the expected owner')
      error.code = 'OWNER_MISMATCH'
      throw error
    }

    await rm(recordPath)
    return {released: true, leaseId}
  })
}

export async function reserveLease({
  leaseRoot,
  runId,
  purpose,
  siteId = null,
  worktree,
  commit,
  count = 1,
  retainUntil = null,
  pool = purpose === 'feature-next' ? FEATURE_PORT_POOL : TEST_FALLBACK_PORT_POOL,
}) {
  assertReservationOptions({purpose, commit, count, pool})
  const resolvedLeaseRoot = leaseRoot === undefined ? resolveLeaseRoot(worktree) : resolve(leaseRoot)

  return withAllocatorLock(resolvedLeaseRoot, async () => {
    const records = await discardOwnedStaleLeases(
      resolvedLeaseRoot,
      await readLeaseRecords(resolvedLeaseRoot),
    )
    const claimedPorts = new Set(records.flatMap(record => record.ports))
    const ports = []

    for (let port = pool.start; port <= pool.end && ports.length < count; port += 1) {
      if (!claimedPorts.has(port) && await canBindPort(port)) ports.push(port)
    }
    if (ports.length !== count) {
      const error = new Error(`Unable to reserve ${count} port(s) from ${pool.start}-${pool.end}`)
      error.code = 'PORT_POOL_EXHAUSTED'
      throw error
    }

    const record = {
      schemaVersion: 1,
      leaseId: randomUUID(),
      runId,
      purpose,
      siteId,
      worktree,
      commit,
      host: '127.0.0.1',
      ports,
      processIds: [],
      composeProject: null,
      createdAt: new Date().toISOString(),
      retainUntil,
    }
    await writeLeaseRecord(resolvedLeaseRoot, record)
    return record
  })
}
