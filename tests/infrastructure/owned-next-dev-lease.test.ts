import {execFile, spawn} from 'node:child_process'
import {randomBytes} from 'node:crypto'
import {EventEmitter, once} from 'node:events'
import {existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {PassThrough} from 'node:stream'
import {promisify} from 'node:util'

import {afterEach, describe, expect, it} from 'vitest'

import * as ownedNextDev from '../e2e/support/owned-next-dev'

// @ts-expect-error -- The native Windows ownership supervisor is an MJS script.
import {createProcessSupervisor} from '../../scripts/runtime-ports/owned-process-tree.mjs'

const roots: string[] = []
const commit = 'a'.repeat(40)
const port = 43210
const processId = 24680
const leaseId = '11111111-1111-4111-8111-111111111111'
const execFileAsync = promisify(execFile)

type StartOwnedNextDev = typeof ownedNextDev.startOwnedNextDev
type LauncherFactory = (dependencies: Record<string, unknown>) => StartOwnedNextDev

function launcherFactory(): LauncherFactory {
  const candidate = (ownedNextDev as unknown as {
    createOwnedNextDevLauncher?: LauncherFactory
  }).createOwnedNextDevLauncher
  expect(candidate, 'owned Next lifecycle must expose an injectable launcher').toBeTypeOf('function')
  return candidate!
}

class FakeChild extends EventEmitter {
  readonly pid = processId
  readonly stdout = new PassThrough()
  readonly stderr = new PassThrough()
  exitCode: number | null = null
  signalCode: NodeJS.Signals | null = null
  gateReleased = false
  killed = false

  send(): boolean {
    this.gateReleased = true
    return true
  }

  kill(): boolean {
    this.killed = true
    this.exitCode = 1
    this.emit('exit', 1, null)
    return true
  }
}

interface HarnessOptions {
  readonly acquisitionHandoffTimeoutMs?: number
  readonly closeFailure?: Error
  readonly cleanupAttachFailure?: Error
  readonly cleanupDescendantAfterSignal?: boolean
  readonly cleanupOperationTimeoutMs?: number
  readonly foreignListener?: boolean
  readonly lateListenerFailure?: Error
  readonly lateListenerOwners?: number[]
  readonly pauseAcquisition?: 'attach' | 'cleanup-snapshot' | 'cleanup-stop' | 'lease' | 'supervisor'
  readonly noListener?: boolean
  readonly onIdentityFetch?: (signals: EventEmitter) => void
  readonly spawnFailure?: Error
  readonly stopFailure?: Error
}

function createHarness(options: HarnessOptions = {}) {
  const root = mkdtempSync(join(tmpdir(), 'owned-next-dev-'))
  roots.push(root)
  mkdirSync(join(root, '.tmp'), {recursive: true})
  writeFileSync(join(root, 'tsconfig.json'), '{"compilerOptions":{},"include":[]}\n')

  const events: string[] = []
  const signals = new EventEmitter()
  const child = new FakeChild()
  const foreignProcessId = 97531
  const descendantProcessId = processId + 1
  let now = 0
  let alive = true
  let spawned = false
  let signalSeen = false
  let lease = {
    leaseId,
    ports: [port],
    processIds: [] as number[],
  }
  let attachedIdentity = false
  let attachAttempts = 0
  let supervisorCloseCount = 0
  let supervisorCreationCount = 0
  let descendantVisible = false
  let resolveAcquisitionStarted!: () => void
  let resumeAcquisition!: () => void
  let resolveAcquisitionCompleted!: () => void
  const acquisitionStarted = new Promise<void>((resolveStarted) => {
    resolveAcquisitionStarted = resolveStarted
  })
  const acquisitionGate = new Promise<void>((resolveGate) => {
    resumeAcquisition = resolveGate
  })
  const acquisitionCompleted = new Promise<void>((resolveCompleted) => {
    resolveAcquisitionCompleted = resolveCompleted
  })
  const pauseAcquisition = async (stage: HarnessOptions['pauseAcquisition']) => {
    if (options.pauseAcquisition !== stage) return
    resolveAcquisitionStarted()
    await acquisitionGate
    resolveAcquisitionCompleted()
  }
  const foreignAlive = options.foreignListener ?? false
  const identity = {
    pid: processId,
    parentPid: process.pid,
    startTime: '638931456000000000',
    command: 'node --import owned-entry-gate next dev',
    executable: process.execPath,
    token: 'b'.repeat(64),
  }
  const descendantIdentity = {
    ...identity,
    pid: descendantProcessId,
    parentPid: processId,
    startTime: '638931456000000001',
    command: 'node owned Next descendant',
  }
  const attachCalls: unknown[][] = []
  const releaseCalls: Array<Record<string, unknown>> = []
  const stopCalls: Array<Array<typeof identity>> = []
  if (options.cleanupDescendantAfterSignal) {
    signals.on('SIGINT', () => { descendantVisible = true })
  }

  const startOwnedNextDev = launcherFactory()({
    acquisitionHandoffTimeoutMs: options.acquisitionHandoffTimeoutMs,
    cleanupOperationTimeoutMs: options.cleanupOperationTimeoutMs,
    repositoryRoot: root,
    leaseRoot: join(root, '.runtime', 'port-leases'),
    readSourceCommit: async () => commit,
    reserveFreeLocalPort: async () => port,
    reserveLease: async (request: Record<string, unknown>) => {
      events.push('reserve-port-0')
      expect(request).toMatchObject({
        runId: 'editorial',
        purpose: 'test-next',
        siteId: 'tio2-a',
        worktree: root,
        commit,
        pool: {start: port, end: port},
      })
      await pauseAcquisition('lease')
      return lease
    },
    attachLease: async (request: Record<string, unknown>) => {
      events.push('attach-pid')
      attachAttempts += 1
      if (options.pauseAcquisition === 'attach' && attachAttempts > 1) {
        throw new Error('duplicate lease attachment during cancellation cleanup')
      }
      expect(attachedIdentity).toBe(true)
      const requestedProcessId = Number(request.processId)
      expect([processId, descendantProcessId]).toContain(requestedProcessId)
      expect(request).toMatchObject({leaseId, processId: requestedProcessId})
      if (
        requestedProcessId === descendantProcessId &&
        options.cleanupAttachFailure
      ) {
        throw options.cleanupAttachFailure
      }
      await pauseAcquisition('attach')
      lease = {
        ...lease,
        processIds: [...new Set([...lease.processIds, requestedProcessId])],
      }
      return lease
    },
    releaseLease: async (request: Record<string, unknown>) => {
      events.push('release-lease')
      releaseCalls.push(request)
      return {released: true, leaseId}
    },
    createProcessSupervisor: async () => {
      await pauseAcquisition('supervisor')
      supervisorCreationCount += 1
      const supervisorNumber = supervisorCreationCount
      return ({
      async attach(...args: unknown[]) {
        attachCalls.push(args)
        attachedIdentity = true
        return identity
      },
      async snapshot() {
        if (signalSeen) await pauseAcquisition('cleanup-snapshot')
        if (!alive) return []
        return descendantVisible ? [identity, descendantIdentity] : [identity]
      },
      async stop(_token: string, stoppedIdentities: Array<typeof identity>) {
        if (signalSeen) await pauseAcquisition('cleanup-stop')
        events.push('stop-owned-process')
        stopCalls.push(stoppedIdentities)
        if (options.stopFailure) throw options.stopFailure
        alive = false
        child.exitCode = 0
        child.emit('exit', 0, null)
      },
      async listenerOwners() {
        if (supervisorNumber > 1 && options.lateListenerFailure) {
          throw options.lateListenerFailure
        }
        if (supervisorNumber > 1 && options.lateListenerOwners) {
          return options.lateListenerOwners
        }
        if (foreignAlive) return [foreignProcessId]
        if (spawned && alive && !options.noListener) return [processId]
        if (!alive) events.push('listener-closed')
        return []
      },
      async close() {
        supervisorCloseCount += 1
        if (options.closeFailure) throw options.closeFailure
      },
      })
    },
    spawnProcess: () => {
      events.push('spawn-next')
      spawned = true
      if (options.spawnFailure) {
        alive = false
        throw options.spawnFailure
      }
      queueMicrotask(() => child.emit('message', {
        action: 'gated',
        owner: identity.token,
        pid: processId,
      }))
      return child
    },
    randomOwnerToken: () => identity.token,
    fetchIdentity: async (input: string | URL | Request) => {
      events.push('ready-identity')
      expect(new URL(String(input)).pathname).toBe('/robots.txt')
      if (options.onIdentityFetch) signalSeen = true
      options.onIdentityFetch?.(signals)
      return new Response([
        'User-Agent: *',
        'Disallow: /',
        '',
        'Host: https://tio2products.com',
        'Sitemap: https://tio2products.com/sitemap.xml',
      ].join('\n'))
    },
    signals,
    now: () => now,
    delay: async (milliseconds: number) => {
      now += milliseconds
    },
    startupTimeoutMs: 20,
    pollIntervalMs: 10,
  })

  return {
    acquisitionCompleted,
    acquisitionStarted,
    attachCalls,
    child,
    get currentLease() { return lease },
    events,
    foreignProcessId,
    descendantProcessId,
    get foreignAlive() { return foreignAlive },
    releaseCalls,
    resumeAcquisition,
    root,
    signals,
    stopCalls,
    get supervisorCloseCount() { return supervisorCloseCount },
    get supervisorCreationCount() { return supervisorCreationCount },
    start: () => startOwnedNextDev({
      environment: {SITE_ID: 'tio2-a'},
      runtimeId: 'editorial',
    }),
  }
}

afterEach(() => {
  for (const root of roots.splice(0)) {
    rmSync(root, {recursive: true, force: true})
  }
})

async function waitUntil(
  condition: () => boolean,
  description: string,
): Promise<void> {
  const deadline = Date.now() + 10_000
  while (Date.now() < deadline) {
    if (condition()) return
    await new Promise((resolveWait) => setTimeout(resolveWait, 20))
  }
  throw new Error(`Timed out waiting for ${description}`)
}

describe('owned Next.js lease lifecycle', () => {
  it('reserves an OS-selected port, records start identity, and releases after verified cleanup', async () => {
    const harness = createHarness()
    const runtime = await harness.start()

    expect(runtime.leaseId).toBe(leaseId)
    expect(harness.child.gateReleased).toBe(true)
    expect(harness.attachCalls).toHaveLength(1)
    expect(harness.attachCalls[0]?.[0]).toBe(processId)
    expect(harness.attachCalls[0]?.[1]).toBe('b'.repeat(64))
    expect(harness.attachCalls[0]?.[2]).toContain('owned-entry-gate.mjs')
    expect(harness.attachCalls[0]?.[3]).toBe(process.execPath)

    await runtime.stop()

    expect(harness.events).toEqual([
      'reserve-port-0',
      'spawn-next',
      'attach-pid',
      'ready-identity',
      'stop-owned-process',
      'listener-closed',
      'release-lease',
    ])
    expect(harness.releaseCalls).toEqual([{
      leaseRoot: join(harness.root, '.runtime', 'port-leases'),
      leaseId,
      expectedProcessIds: [processId],
    }])
    expect(harness.signals.listenerCount('SIGINT')).toBe(0)
  })

  it('releases a lease when spawning Next.js fails before an owner attaches', async () => {
    const harness = createHarness({spawnFailure: new Error('spawn failed')})

    await expect(harness.start()).rejects.toThrow('spawn failed')

    expect(harness.events).toEqual([
      'reserve-port-0',
      'spawn-next',
      'listener-closed',
      'release-lease',
    ])
  })

  it('uses the same idempotent stop path from an assertion finally block', async () => {
    const harness = createHarness()
    const runtime = await harness.start()
    let assertion: unknown

    try {
      throw new Error('simulated assertion failure')
    } catch (error) {
      assertion = error
    } finally {
      await Promise.all([runtime.stop(), runtime.stop()])
    }

    expect(assertion).toEqual(new Error('simulated assertion failure'))
    expect(harness.events.filter(event => event === 'stop-owned-process')).toHaveLength(1)
    expect(harness.events.filter(event => event === 'release-lease')).toHaveLength(1)
  })

  it('stops the owned tree and releases its lease after a startup timeout', async () => {
    const harness = createHarness({noListener: true})

    await expect(harness.start()).rejects.toThrow('Timed out waiting for tio2-a identity')

    expect(harness.events).toEqual([
      'reserve-port-0',
      'spawn-next',
      'attach-pid',
      'stop-owned-process',
      'listener-closed',
      'release-lease',
    ])
  })

  it('routes SIGINT during startup through the same owned cleanup path', async () => {
    const harness = createHarness({
      onIdentityFetch: signals => signals.emit('SIGINT'),
    })

    await expect(harness.start()).rejects.toThrow('Owned Next dev interrupted: SIGINT')

    expect(harness.events).toEqual([
      'reserve-port-0',
      'spawn-next',
      'attach-pid',
      'ready-identity',
      'stop-owned-process',
      'listener-closed',
      'release-lease',
    ])
    expect(harness.signals.listenerCount('SIGINT')).toBe(0)
  })

  it('attaches a descendant discovered after SIGINT before cleanup stops the verified tree', async () => {
    const harness = createHarness({
      cleanupDescendantAfterSignal: true,
      onIdentityFetch: signals => signals.emit('SIGINT'),
    })

    await expect(harness.start()).rejects.toThrow('Owned Next dev interrupted: SIGINT')

    expect(harness.stopCalls).toHaveLength(1)
    expect(harness.stopCalls[0]?.map(identity => identity.pid)).toEqual([
      processId,
      harness.descendantProcessId,
    ])
    expect(harness.releaseCalls[0]).toMatchObject({
      leaseId,
      expectedProcessIds: [processId, harness.descendantProcessId],
    })
  })

  it('does not stop or release when cleanup cannot attach a newly discovered descendant', async () => {
    const harness = createHarness({
      cleanupAttachFailure: new Error('descendant lease attachment failed'),
      cleanupDescendantAfterSignal: true,
      onIdentityFetch: signals => signals.emit('SIGINT'),
    })

    await expect(harness.start()).rejects.toThrow('descendant lease attachment failed')

    expect(harness.stopCalls).toHaveLength(0)
    expect(harness.releaseCalls).toHaveLength(0)
    expect(harness.child.exitCode).toBeNull()
  })

  it('bounds a cleanup snapshot after SIGINT and retains the lease', async () => {
    const harness = createHarness({
      acquisitionHandoffTimeoutMs: 20,
      cleanupOperationTimeoutMs: 20,
      onIdentityFetch: signals => signals.emit('SIGINT'),
      pauseAcquisition: 'cleanup-snapshot',
    })
    const starting = harness.start()
    await harness.acquisitionStarted
    setTimeout(harness.resumeAcquisition, 40)

    await expect(starting).rejects.toThrow('cleanup snapshot timed out')
    await harness.acquisitionCompleted
    expect(harness.releaseCalls).toHaveLength(0)
  })

  it('bounds cleanup stop after SIGINT and retains the lease', async () => {
    const harness = createHarness({
      acquisitionHandoffTimeoutMs: 20,
      cleanupOperationTimeoutMs: 20,
      onIdentityFetch: signals => signals.emit('SIGINT'),
      pauseAcquisition: 'cleanup-stop',
    })
    const starting = harness.start()
    await harness.acquisitionStarted
    setTimeout(harness.resumeAcquisition, 40)

    await expect(starting).rejects.toThrow('cleanup stop timed out')
    await harness.acquisitionCompleted
    expect(harness.releaseCalls).toHaveLength(0)
  })

  it('hands off a supervisor that resolves after SIGINT before cleanup completes', async () => {
    const harness = createHarness({pauseAcquisition: 'supervisor'})
    const starting = harness.start()
    await harness.acquisitionStarted

    harness.signals.emit('SIGINT')
    setTimeout(harness.resumeAcquisition, 10)

    await expect(starting).rejects.toThrow('Owned Next dev interrupted: SIGINT')
    await harness.acquisitionCompleted
    expect(harness.supervisorCloseCount).toBe(1)
  })

  it('hands off a lease that resolves after SIGINT before cleanup completes', async () => {
    const harness = createHarness({pauseAcquisition: 'lease'})
    const starting = harness.start()
    await harness.acquisitionStarted

    harness.signals.emit('SIGINT')
    setTimeout(harness.resumeAcquisition, 10)

    await expect(starting).rejects.toThrow('Owned Next dev interrupted: SIGINT')
    await harness.acquisitionCompleted
    expect(harness.releaseCalls).toEqual([{
      leaseRoot: join(harness.root, '.runtime', 'port-leases'),
      leaseId,
      expectedProcessIds: [],
    }])
  })

  it('waits for an interrupted lease attachment instead of starting duplicate cleanup attachment', async () => {
    const harness = createHarness({pauseAcquisition: 'attach'})
    const starting = harness.start()
    await harness.acquisitionStarted

    harness.signals.emit('SIGINT')
    setTimeout(harness.resumeAcquisition, 10)

    await expect(starting).rejects.toThrow('Owned Next dev interrupted: SIGINT')
    await harness.acquisitionCompleted
    expect(harness.events.filter(event => event === 'attach-pid')).toHaveLength(1)
    expect(harness.releaseCalls[0]).toMatchObject({
      leaseId,
      expectedProcessIds: [processId],
    })
  })

  it('bounds an unresolved acquisition and retains locks until its late supervisor is closed', async () => {
    const harness = createHarness({
      acquisitionHandoffTimeoutMs: 20,
      pauseAcquisition: 'supervisor',
    })
    const starting = harness.start()
    await harness.acquisitionStarted

    harness.signals.emit('SIGINT')

    await expect(starting).rejects.toThrow('cancellation handoff is uncertain')
    expect(existsSync(join(harness.root, '.tmp', 'task-9-next-dev-lifecycle.lock'))).toBe(true)
    expect(existsSync(join(harness.root, '.tmp', 'task-9-editorial-preview.lock'))).toBe(true)

    harness.resumeAcquisition()
    await harness.acquisitionCompleted
    await waitUntil(() => harness.supervisorCloseCount === 1, 'late supervisor cleanup')
  })

  it('reuses an in-flight attachment that settles during bounded cleanup reconciliation', async () => {
    const harness = createHarness({
      acquisitionHandoffTimeoutMs: 20,
      pauseAcquisition: 'attach',
    })
    const starting = harness.start()
    await harness.acquisitionStarted

    harness.signals.emit('SIGINT')
    setTimeout(harness.resumeAcquisition, 30)

    await expect(starting).rejects.toThrow('Owned Next dev interrupted: SIGINT')
    await harness.acquisitionCompleted
    expect(harness.events.filter(event => event === 'attach-pid')).toHaveLength(1)
    expect(harness.stopCalls).toHaveLength(1)
    expect(harness.releaseCalls[0]).toMatchObject({
      leaseId,
      expectedProcessIds: [processId],
    })
  })

  it('retains evidence without stopping when an attachment outlives both bounded windows', async () => {
    const harness = createHarness({
      acquisitionHandoffTimeoutMs: 20,
      pauseAcquisition: 'attach',
    })
    const starting = harness.start()
    await harness.acquisitionStarted

    harness.signals.emit('SIGINT')

    await expect(starting).rejects.toThrow('cleanup handoff timed out')
    expect(harness.events.filter(event => event === 'attach-pid')).toHaveLength(1)
    expect(harness.stopCalls).toHaveLength(0)
    expect(harness.releaseCalls).toHaveLength(0)

    harness.resumeAcquisition()
    await harness.acquisitionCompleted
    await waitUntil(
      () => harness.currentLease.processIds.includes(processId),
      'late attachment evidence',
    )
    expect(harness.releaseCalls).toHaveLength(0)
  })

  it('uses a fresh listener inspector before releasing a late reserved lease', async () => {
    const harness = createHarness({
      acquisitionHandoffTimeoutMs: 20,
      pauseAcquisition: 'lease',
    })
    const starting = harness.start()
    await harness.acquisitionStarted
    harness.signals.emit('SIGINT')

    await expect(starting).rejects.toThrow('cancellation handoff is uncertain')
    harness.resumeAcquisition()
    await harness.acquisitionCompleted
    await waitUntil(() => harness.releaseCalls.length === 1, 'late lease release')

    expect(harness.supervisorCreationCount).toBe(2)
    expect(harness.supervisorCloseCount).toBe(2)
    expect(harness.releaseCalls[0]).toMatchObject({leaseId, expectedProcessIds: []})
  })

  it('retains a late reserved lease when a fresh inspector finds a listener', async () => {
    const harness = createHarness({
      acquisitionHandoffTimeoutMs: 20,
      lateListenerOwners: [97531],
      pauseAcquisition: 'lease',
    })
    const starting = harness.start()
    await harness.acquisitionStarted
    harness.signals.emit('SIGINT')

    await expect(starting).rejects.toThrow('cancellation handoff is uncertain')
    harness.resumeAcquisition()
    await harness.acquisitionCompleted
    await waitUntil(() => harness.supervisorCloseCount === 2, 'late listener inspection')

    expect(harness.releaseCalls).toHaveLength(0)
  })

  it('retains a late reserved lease when fresh listener inspection errors', async () => {
    const harness = createHarness({
      acquisitionHandoffTimeoutMs: 20,
      lateListenerFailure: new Error('listener inspection unavailable'),
      pauseAcquisition: 'lease',
    })
    const starting = harness.start()
    await harness.acquisitionStarted
    harness.signals.emit('SIGINT')

    await expect(starting).rejects.toThrow('cancellation handoff is uncertain')
    harness.resumeAcquisition()
    await harness.acquisitionCompleted
    await waitUntil(() => harness.supervisorCloseCount === 2, 'failed late inspection')

    expect(harness.releaseCalls).toHaveLength(0)
  })

  it('retains the lease when Windows process-tree termination cannot be verified', async () => {
    const harness = createHarness({
      stopFailure: new Error('taskkill could not verify process cleanup'),
    })
    const runtime = await harness.start()

    await expect(runtime.stop()).rejects.toThrow('taskkill could not verify process cleanup')

    expect(harness.events).toContain('stop-owned-process')
    expect(harness.events).not.toContain('release-lease')
    expect(harness.child.exitCode).toBeNull()
  })

  it('retains the process and lease when the recorded PID start time no longer matches', async () => {
    const harness = createHarness({
      stopFailure: new Error('Process identity mismatch; process and lease retained'),
    })
    const runtime = await harness.start()

    await expect(runtime.stop()).rejects.toThrow('Process identity mismatch')

    expect(harness.events).not.toContain('release-lease')
    expect(harness.child.exitCode).toBeNull()
  })

  it('retains the lease when supervisor shutdown cannot be confirmed', async () => {
    const harness = createHarness({
      closeFailure: new Error('supervisor close failed'),
    })
    const runtime = await harness.start()

    await expect(runtime.stop()).rejects.toThrow('supervisor close failed')

    expect(harness.events).not.toContain('release-lease')
  })

  it('stops only its verified tree and retains the lease when a foreign listener owns the port', async () => {
    const harness = createHarness({foreignListener: true})

    await expect(harness.start()).rejects.toThrow('foreign listening owner')

    expect(harness.events).toContain('stop-owned-process')
    expect(harness.events).not.toContain('release-lease')
    expect(harness.foreignAlive).toBe(true)
    expect(harness.child.killed).toBe(false)
  })
})

describe.skipIf(process.platform !== 'win32')('native Windows owned process tree', () => {
  it('retries only an already-exited PID proven absent from the retained Job', async () => {
    const helperPath = new URL('../../scripts/runtime-ports/owned-process-tree.cs', import.meta.url)
    const powershell = [
      "$ErrorActionPreference = 'Stop'",
      `Add-Type -Path '${decodeURIComponent(helperPath.pathname).replace(/^\//u, '').replaceAll("'", "''")}' -ReferencedAssemblies System.Management`,
      "$flags = [System.Reflection.BindingFlags]'NonPublic,Static'",
      "$method = [D16OwnedE2E.Supervisor].GetMethod('SnapshotExitRaceMayRetry', $flags)",
      '$goneArgs = [object[]]@([System.InvalidOperationException]::new(), [int[]]@(11, 22), [int]33)',
      '$stillArgs = [object[]]@([System.InvalidOperationException]::new(), [int[]]@(11, 22), [int]22)',
      '$deniedArgs = [object[]]@([System.ComponentModel.Win32Exception]::new(5), [int[]]@(), [int]33)',
      '$gone = $method.Invoke($null, $goneArgs)',
      '$still = $method.Invoke($null, $stillArgs)',
      '$denied = $method.Invoke($null, $deniedArgs)',
      '[Console]::Write("$gone,$still,$denied")',
    ].join('; ')

    const {stdout} = await execFileAsync('powershell.exe', [
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      powershell,
    ], {windowsHide: true})

    expect(stdout).toBe('True,False,False')
  })

  it('stabilizes a snapshot when short-lived Job descendants disappear during capture', async () => {
    const root = mkdtempSync(join(tmpdir(), 'owned-next-native-snapshot-'))
    roots.push(root)
    const discoveryPath = join(root, 'children.json')
    const scriptPath = join(root, 'transient-tree.mjs')
    writeFileSync(scriptPath, [
      "import {spawn} from 'node:child_process'",
      "import {writeFileSync} from 'node:fs'",
      'const children = []',
      'for (let index = 0; index < 32; index += 1) {',
      "  children.push(spawn(process.execPath, ['-e', `setTimeout(() => process.exit(0), ${250 + index * 8})`], {stdio: 'ignore'}))",
      '}',
      `writeFileSync(${JSON.stringify(discoveryPath)}, JSON.stringify(children.map(child => child.pid)))`,
      'setInterval(() => {}, 1000)',
    ].join('\n'))

    const token = randomBytes(32).toString('hex')
    const gate = new URL('../../scripts/runtime-ports/owned-entry-gate.mjs', import.meta.url)
    gate.searchParams.set('owner', token)
    const child = spawn(process.execPath, ['--import', gate.href, scriptPath], {
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
      windowsHide: true,
    })
    const supervisor = await createProcessSupervisor()
    let attached = false

    try {
      const [message] = await once(child, 'message') as [Record<string, unknown>]
      expect(message).toMatchObject({action: 'gated', owner: token, pid: child.pid})
      const rootIdentity = await supervisor.attach(child.pid, token, gate.href, process.execPath)
      attached = true
      child.send({action: 'run', owner: token})
      await waitUntil(() => existsSync(discoveryPath), 'transient descendants')
      expect(JSON.parse(readFileSync(discoveryPath, 'utf8'))).toHaveLength(32)

      await supervisor.stop(token, [rootIdentity])

      expect(await supervisor.snapshot(token)).toEqual([])
    } finally {
      try {
        if (attached) {
          await new Promise((resolveWait) => setTimeout(resolveWait, 1_000))
          await supervisor.stop(token, await supervisor.snapshot(token))
        } else {
          child.kill()
        }
      } finally {
        await supervisor.close()
      }
    }
  }, 30_000)

  it('treats a Kill race as benign only when the retained process handle confirms exit', async () => {
    const root = mkdtempSync(join(tmpdir(), 'owned-next-native-race-'))
    roots.push(root)
    const discoveryPath = join(root, 'children.json')
    const scriptPath = join(root, 'short-lived-tree.mjs')
    writeFileSync(scriptPath, [
      "import {spawn} from 'node:child_process'",
      "import {writeFileSync} from 'node:fs'",
      'const children = []',
      'for (let index = 0; index < 6; index += 1) {',
      "  children.push(spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], {stdio: 'ignore'}))",
      '}',
      'let stopping = false',
      'for (const child of children) child.on(\'exit\', () => {',
      '  if (stopping) return',
      '  stopping = true',
      '  for (const sibling of children) if (sibling.exitCode === null) sibling.kill()',
      '})',
      `writeFileSync(${JSON.stringify(discoveryPath)}, JSON.stringify(children.map(child => child.pid)))`,
      'setInterval(() => {}, 1000)',
    ].join('\n'))

    const token = randomBytes(32).toString('hex')
    const gate = new URL('../../scripts/runtime-ports/owned-entry-gate.mjs', import.meta.url)
    gate.searchParams.set('owner', token)
    const child = spawn(process.execPath, ['--import', gate.href, scriptPath], {
      stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
      windowsHide: true,
    })
    const supervisor = await createProcessSupervisor()
    let attached = false

    try {
      const [message] = await once(child, 'message') as [Record<string, unknown>]
      expect(message).toMatchObject({action: 'gated', owner: token, pid: child.pid})
      await supervisor.attach(child.pid, token, gate.href, process.execPath)
      attached = true
      child.send({action: 'run', owner: token})
      await waitUntil(() => existsSync(discoveryPath), 'short-lived descendants')
      expect(JSON.parse(readFileSync(discoveryPath, 'utf8'))).toHaveLength(6)

      const identities = await supervisor.snapshot(token)
      expect(identities.length).toBeGreaterThan(1)
      await supervisor.stop(token, identities)

      expect(await supervisor.snapshot(token)).toEqual([])
    } finally {
      try {
        if (attached) {
          await new Promise((resolveWait) => setTimeout(resolveWait, 1_000))
          await supervisor.stop(token, await supervisor.snapshot(token))
        } else {
          child.kill()
        }
      } finally {
        await supervisor.close()
      }
    }
  }, 30_000)
})
