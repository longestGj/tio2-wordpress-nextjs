import {existsSync, readFileSync, readdirSync, rmSync, writeFileSync} from 'node:fs'
import {mkdtemp} from 'node:fs/promises'
import {randomUUID} from 'node:crypto'
import {createServer, type Server} from 'node:net'
import {tmpdir} from 'node:os'
import {dirname, join, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {afterEach, describe, expect, test} from 'vitest'

// @ts-expect-error -- The runtime allocator is intentionally delivered as an MJS script.
import {FEATURE_PORT_POOL, LEASE_PURPOSES, TEST_FALLBACK_PORT_POOL, attachLease, inspectLease, listLeases, registerObservedLease, releaseLease, reserveLease} from '../../scripts/runtime-ports/lease-core.mjs'

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const leaseRoots: string[] = []

async function listenOnLoopback(): Promise<{port: number; server: Server}> {
  const server = createServer()
  await new Promise<void>((resolveListen, rejectListen) => {
    server.once('error', rejectListen)
    server.listen(0, '127.0.0.1', resolveListen)
  })
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Expected a TCP listener address')
  return {port: address.port, server}
}

async function closeServer(server: Server) {
  await new Promise<void>((resolveClose, rejectClose) => {
    server.close(error => error ? rejectClose(error) : resolveClose())
  })
}

async function createLeaseRoot() {
  const leaseRoot = await mkdtemp(join(tmpdir(), 'runtime-port-leases-'))
  leaseRoots.push(leaseRoot)
  return leaseRoot
}

afterEach(() => {
  for (const leaseRoot of leaseRoots.splice(0)) {
    rmSync(leaseRoot, {recursive: true, force: true})
  }
})

describe('runtime port lease allocation', () => {
  test('publishes the allocation pools and supported purposes', () => {
    expect(FEATURE_PORT_POOL).toEqual({start: 32000, end: 32099})
    expect(TEST_FALLBACK_PORT_POOL).toEqual({start: 32100, end: 32999})
    expect(LEASE_PURPOSES).toEqual([
      'feature-next', 'test-next', 'test-wordpress', 'fixture',
    ])
  })

  test('persists the complete lease schema for a reservation', async () => {
    const leaseRoot = await createLeaseRoot()

    const first = await reserveLease({
      leaseRoot,
      runId: 'vitest-a',
      purpose: 'test-next',
      siteId: 'tio2-my',
      worktree: repositoryRoot,
      commit: 'a'.repeat(40),
      pool: {start: 32500, end: 32501},
    })

    expect(first).toMatchObject({
      schemaVersion: 1,
      runId: 'vitest-a',
      purpose: 'test-next',
      siteId: 'tio2-my',
      host: '127.0.0.1',
      ports: [expect.any(Number)],
      processIds: [],
      composeProject: null,
      retainUntil: null,
    })
    expect(Object.keys(first).sort()).toEqual([
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
    ].sort())
    expect(JSON.parse(readFileSync(join(leaseRoot, `${first.leaseId}.json`), 'utf8')))
      .toEqual(first)
  })

  test('serializes concurrent reservations so they receive distinct ports', async () => {
    const leaseRoot = await createLeaseRoot()
    const options = {
      leaseRoot,
      purpose: 'test-next' as const,
      siteId: 'tio2-my',
      worktree: repositoryRoot,
      commit: 'b'.repeat(40),
      pool: {start: 32500, end: 32501},
    }

    const [a, b] = await Promise.all([
      reserveLease({...options, runId: 'parallel-a'}),
      reserveLease({...options, runId: 'parallel-b'}),
    ])

    expect(a.ports[0]).not.toBe(b.ports[0])
  })

  test('skips a port already owned by an OS listener during reservation', async () => {
    const leaseRoot = await createLeaseRoot()
    const {port, server} = await listenOnLoopback()
    const pool = port <= 65515
      ? {start: port, end: port + 20}
      : {start: port - 20, end: port}

    try {
      const lease = await reserveLease({
        leaseRoot,
        runId: 'probe-listener',
        purpose: 'test-next',
        worktree: repositoryRoot,
        commit: '8'.repeat(40),
        pool,
      })

      expect(lease.ports).toHaveLength(1)
      expect(lease.ports[0]).not.toBe(port)
    } finally {
      await closeServer(server)
    }
  })

  test.each([
    {label: 'unsupported purpose', changes: {purpose: 'other'}},
    {label: 'non-40-character commit', changes: {commit: 'short'}},
    {label: 'port below range', changes: {pool: {start: 0, end: 1}}},
    {label: 'port above range', changes: {pool: {start: 65535, end: 65536}}},
    {label: 'inverted port pool', changes: {pool: {start: 32501, end: 32500}}},
    {label: 'zero count', changes: {count: 0}},
  ])('rejects $label before creating a lease', async ({changes}) => {
    const leaseRoot = await createLeaseRoot()
    const options = {
      leaseRoot,
      runId: 'invalid-reservation',
      purpose: 'test-next',
      siteId: 'tio2-my',
      worktree: repositoryRoot,
      commit: 'c'.repeat(40),
      pool: {start: 32500, end: 32501},
      ...changes,
    }

    await expect(reserveLease(options)).rejects.toMatchObject({code: 'INVALID_LEASE'})
    expect(readdirSync(leaseRoot).filter(name => name.endsWith('.json'))).toEqual([])
  })

  test('lists validated leases and reports a retained reservation as non-stale', async () => {
    const leaseRoot = await createLeaseRoot()
    const retained = await reserveLease({
      leaseRoot,
      runId: 'retained-run',
      purpose: 'fixture',
      worktree: repositoryRoot,
      commit: 'd'.repeat(40),
      retainUntil: '2099-01-01T00:00:00.000Z',
      pool: {start: 32500, end: 32501},
    })

    expect(await listLeases({leaseRoot})).toEqual([retained])
    expect(await inspectLease({leaseRoot, leaseId: retained.leaseId})).toEqual({
      lease: retained,
      stale: false,
    })
  })

  test.each([
    {label: 'unknown field', mutate: (record: Record<string, unknown>) => ({...record, surprise: true})},
    {label: 'invalid UUID', mutate: (record: Record<string, unknown>) => ({...record, leaseId: 'not-a-uuid'})},
    {label: 'non-40-character commit', mutate: (record: Record<string, unknown>) => ({...record, commit: 'short'})},
    {label: 'out-of-range port', mutate: (record: Record<string, unknown>) => ({...record, ports: [65536]})},
  ])('rejects a persisted lease with an $label', async ({mutate}) => {
    const leaseRoot = await createLeaseRoot()
    const lease = await reserveLease({
      leaseRoot,
      runId: 'corrupt-record',
      purpose: 'fixture',
      worktree: repositoryRoot,
      commit: 'e'.repeat(40),
      pool: {start: 32500, end: 32501},
    })
    const recordPath = join(leaseRoot, `${lease.leaseId}.json`)
    writeFileSync(recordPath, JSON.stringify(mutate(lease)), 'utf8')

    await expect(listLeases({leaseRoot})).rejects.toMatchObject({code: 'INVALID_LEASE'})
  })

  test.each(['not-a-uuid', '../outside'])('rejects an invalid or escaping lease path %s', async leaseId => {
    const leaseRoot = await createLeaseRoot()

    await expect(inspectLease({leaseRoot, leaseId})).rejects.toMatchObject({code: 'INVALID_LEASE'})
  })

  test('rejects a valid record UUID that does not match its requested lease path', async () => {
    const leaseRoot = await createLeaseRoot()
    const lease = await reserveLease({
      leaseRoot,
      runId: 'identity-mismatch',
      purpose: 'fixture',
      worktree: repositoryRoot,
      commit: '9'.repeat(40),
      pool: {start: 32500, end: 32501},
    })
    writeFileSync(
      join(leaseRoot, `${lease.leaseId}.json`),
      JSON.stringify({...lease, leaseId: randomUUID()}),
      'utf8',
    )

    await expect(inspectLease({leaseRoot, leaseId: lease.leaseId}))
      .rejects.toMatchObject({code: 'INVALID_LEASE'})
  })

  test('atomically attaches process and Compose ownership to a lease', async () => {
    const leaseRoot = await createLeaseRoot()
    const lease = await reserveLease({
      leaseRoot,
      runId: 'attach-owner',
      purpose: 'test-next',
      worktree: repositoryRoot,
      commit: 'f'.repeat(40),
      pool: {start: 32500, end: 32501},
    })

    const attached = await attachLease({
      leaseRoot,
      leaseId: lease.leaseId,
      processId: process.pid,
      composeProject: 'vitest-compose',
    })
    const attachedAgain = await attachLease({
      leaseRoot,
      leaseId: lease.leaseId,
      processId: process.pid,
      composeProject: 'vitest-compose',
    })

    expect(attached).toEqual({...lease, processIds: [process.pid], composeProject: 'vitest-compose'})
    expect(attachedAgain).toEqual(attached)
    expect(JSON.parse(readFileSync(join(leaseRoot, `${lease.leaseId}.json`), 'utf8'))).toEqual(attached)
    expect(readdirSync(leaseRoot).filter(name => name.endsWith('.tmp'))).toEqual([])
  })

  test('rejects an attachment without a valid owner identity', async () => {
    const leaseRoot = await createLeaseRoot()
    const lease = await reserveLease({
      leaseRoot,
      runId: 'attach-invalid',
      purpose: 'test-next',
      worktree: repositoryRoot,
      commit: '1'.repeat(40),
      pool: {start: 32500, end: 32501},
    })

    await expect(attachLease({
      leaseRoot,
      leaseId: lease.leaseId,
      processId: 0,
      composeProject: null,
    })).rejects.toMatchObject({code: 'INVALID_LEASE'})
  })

  test('atomically permits only one observed lease for an active listening port', async () => {
    const leaseRoot = await createLeaseRoot()
    const {port, server} = await listenOnLoopback()

    try {
      const common = {
        leaseRoot,
        purpose: 'fixture' as const,
        siteId: 'tio2-my',
        worktree: repositoryRoot,
        commit: '2'.repeat(40),
        ports: [port],
        processIds: [process.pid],
        composeProject: null,
      }
      const results = await Promise.allSettled([
        registerObservedLease({...common, runId: 'observed-a'}),
        registerObservedLease({...common, runId: 'observed-b'}),
      ])

      expect(results.filter(result => result.status === 'fulfilled')).toHaveLength(1)
      const rejection = results.find(result => result.status === 'rejected')
      expect(rejection).toMatchObject({status: 'rejected', reason: {code: 'PORT_ALREADY_LEASED'}})
      const leases = await listLeases({leaseRoot})
      expect(leases).toHaveLength(1)
      expect(leases[0]).toMatchObject({
        runId: expect.stringMatching(/^observed-[ab]$/u),
        ports: [port],
        processIds: [process.pid],
      })
    } finally {
      await closeServer(server)
    }
  })

  test('rejects observed registration without ownership or a listener', async () => {
    const leaseRoot = await createLeaseRoot()
    const {port, server} = await listenOnLoopback()
    await closeServer(server)
    const common = {
      leaseRoot,
      runId: 'observed-invalid',
      purpose: 'fixture' as const,
      worktree: repositoryRoot,
      commit: '3'.repeat(40),
      ports: [port],
    }

    await expect(registerObservedLease({
      ...common,
      processIds: [],
      composeProject: null,
    })).rejects.toMatchObject({code: 'INVALID_LEASE'})
    await expect(registerObservedLease({
      ...common,
      processIds: [process.pid],
      composeProject: null,
    })).rejects.toMatchObject({code: 'PORT_NOT_LISTENING'})
  })

  test('marks a lease stale only when its PIDs and listeners are all absent', async () => {
    const leaseRoot = await createLeaseRoot()
    const lease = await reserveLease({
      leaseRoot,
      runId: 'stale-state',
      purpose: 'test-next',
      worktree: repositoryRoot,
      commit: '4'.repeat(40),
      pool: {start: 32500, end: 32501},
    })
    const live = await attachLease({
      leaseRoot,
      leaseId: lease.leaseId,
      processId: process.pid,
      composeProject: null,
    })
    expect((await inspectLease({leaseRoot, leaseId: live.leaseId})).stale).toBe(false)

    const recordPath = join(leaseRoot, `${lease.leaseId}.json`)
    writeFileSync(recordPath, JSON.stringify({...live, processIds: [2147483647]}), 'utf8')
    expect((await inspectLease({leaseRoot, leaseId: live.leaseId})).stale).toBe(true)
  })

  test('reclaims an owned stale lease under the allocation lock', async () => {
    const leaseRoot = await createLeaseRoot()
    const stale = await reserveLease({
      leaseRoot,
      runId: 'stale-owner',
      purpose: 'test-next',
      worktree: repositoryRoot,
      commit: '0'.repeat(40),
      pool: {start: 32500, end: 32500},
    })
    await attachLease({
      leaseRoot,
      leaseId: stale.leaseId,
      processId: 2147483647,
      composeProject: null,
    })

    const replacement = await reserveLease({
      leaseRoot,
      runId: 'stale-replacement',
      purpose: 'test-next',
      worktree: repositoryRoot,
      commit: 'a'.repeat(40),
      pool: {start: 32500, end: 32500},
    })

    expect(replacement.ports).toEqual([32500])
    expect(replacement.leaseId).not.toBe(stale.leaseId)
    expect(existsSync(join(leaseRoot, `${stale.leaseId}.json`))).toBe(false)
  })

  test('treats a listening observed port as live even when its PID is absent', async () => {
    const leaseRoot = await createLeaseRoot()
    const {port, server} = await listenOnLoopback()
    let closed = false
    try {
      const lease = await registerObservedLease({
        leaseRoot,
        runId: 'listener-state',
        purpose: 'fixture',
        worktree: repositoryRoot,
        commit: '5'.repeat(40),
        ports: [port],
        processIds: [2147483647],
        composeProject: null,
      })

      expect((await inspectLease({leaseRoot, leaseId: lease.leaseId})).stale).toBe(false)
      await closeServer(server)
      closed = true
      expect((await inspectLease({leaseRoot, leaseId: lease.leaseId})).stale).toBe(true)
    } finally {
      if (!closed) await closeServer(server)
    }
  })

  test('rejects mismatched release ownership and preserves the lease', async () => {
    const leaseRoot = await createLeaseRoot()
    const lease = await reserveLease({
      leaseRoot,
      runId: 'release-mismatch',
      purpose: 'test-next',
      worktree: repositoryRoot,
      commit: '6'.repeat(40),
      pool: {start: 32500, end: 32501},
    })
    const attached = await attachLease({
      leaseRoot,
      leaseId: lease.leaseId,
      processId: process.pid,
      composeProject: 'release-compose',
    })

    await expect(releaseLease({
      leaseRoot,
      leaseId: attached.leaseId,
      expectedProcessIds: [process.pid + 1],
    })).rejects.toMatchObject({code: 'OWNER_MISMATCH'})
    expect(existsSync(join(leaseRoot, `${attached.leaseId}.json`))).toBe(true)
  })

  test('releases a matching lease and reports an already absent lease', async () => {
    const leaseRoot = await createLeaseRoot()
    const lease = await reserveLease({
      leaseRoot,
      runId: 'release-match',
      purpose: 'test-next',
      worktree: repositoryRoot,
      commit: '7'.repeat(40),
      pool: {start: 32500, end: 32501},
    })
    const attached = await attachLease({
      leaseRoot,
      leaseId: lease.leaseId,
      processId: process.pid,
      composeProject: 'release-compose',
    })

    await expect(releaseLease({
      leaseRoot,
      leaseId: attached.leaseId,
      expectedProcessIds: [process.pid],
      expectedComposeProject: 'release-compose',
    })).resolves.toEqual({released: true, leaseId: attached.leaseId})
    expect(existsSync(join(leaseRoot, `${attached.leaseId}.json`))).toBe(false)
    await expect(releaseLease({
      leaseRoot,
      leaseId: attached.leaseId,
    })).resolves.toEqual({released: false, leaseId: attached.leaseId})
  })
})
