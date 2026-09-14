import {mkdir, mkdtemp, rm, writeFile} from 'node:fs/promises'
import {EventEmitter} from 'node:events'
import {PassThrough} from 'node:stream'
import {resolve, join} from 'node:path'
import {expect, test} from 'vitest'

type Identity = {pid: number; parentPid: number; startTime: string; command: string; executable: string; token: string}
type Lease = {leaseId: string; ports: number[]; processIds: number[]}
class MemoryChild extends EventEmitter {
  stdout = new PassThrough()
  stderr = new PassThrough()
  exitCode: number | null = null
  signalCode: string | null = null
  released = false
  constructor(readonly pid: number, readonly token: string, readonly role: string) { super() }
  send() { this.released = true; if (this.role === 'playwright') queueMicrotask(() => this.kill()); return true }
  kill() { if (this.exitCode === null) { this.exitCode = 0; this.emit('exit', 0) }; return true }
}

async function memoryLauncher(hang?: string, interrupt?: string, fault?: string) {
  const {runOwnedE2e} = await import(resolve('scripts/run-owned-e2e.mjs'))
  await mkdir(resolve('.tmp'), {recursive: true})
  const root = await mkdtemp(resolve('.tmp/final-memory-'))
  await mkdir(join(root, 'tests/e2e'), {recursive: true})
  await writeFile(join(root, 'tests/e2e/runtime.spec.ts'), "const url = requiredLocalUrl('TIO2_MY_BASE_URL')")
  await writeFile(join(root, 'tsconfig.json'), '{"include":[]}')
  const signals = new EventEmitter(), events: string[] = []
  const children: MemoryChild[] = []
  const members = new Map<string, Identity>()
  const retained = new Map<string, Lease>()
  let nextPid = 22000, stopStarted = false, closed = 0, factoryCount = 0
  let resume!: () => void, started!: () => void
  const paused = new Promise<void>(done => { resume = done })
  const stageStarted = new Promise<void>(done => { started = done })
  let intercepted = false
  const stage = async <T>(name: string, operation: () => T | Promise<T>): Promise<T> => {
    events.push(name)
    if (name === hang && !intercepted) {
      intercepted = true; started()
      if (interrupt) signals.emit(interrupt)
      await paused
      if (fault === 'late-reject') throw new Error('late native rejection')
    } else if (hang === 'serial' && stopStarted && ['stop', 'snapshot', 'listeners', 'close'].includes(name)) {
      started(); await paused
    }
    return operation()
  }
  const supervisorFactory = () => stage('factory', () => {
    factoryCount++
    return {
      attach: (pid: number, token: string, gate: string, executable: string) => stage('native-attach', () => {
        const identity = {pid, parentPid: process.pid, startTime: String(pid), command: `${executable} --import ${gate}`, executable, token}
        members.set(token, identity)
        return fault === 'identity' ? {...identity, token: 'foreign'} : identity
      }),
      snapshot: (token: string) => stage('snapshot', () => {
        const identity = members.get(token), child = children.find(child => child.token === token)
        return identity && child?.exitCode === null ? [identity] : []
      }),
      stop: (token: string, identities: Identity[]) => {
        stopStarted = true
        return stage('stop', () => {
          if (identities.some(identity => identity.token !== token)) throw new Error('OWNER_MISMATCH')
          children.find(child => child.token === token)?.kill()
        })
      },
      listenerOwners: () => stage('listeners', () => fault === 'listener' && stopStarted ? [999999]
        : children.filter(child => child.role === 'next' && child.released && child.exitCode === null).map(child => child.pid)),
      close: () => stage('close', () => { closed++; if (fault === 'close') throw new Error('close refused') }),
    }
  })
  const running = runOwnedE2e(['--site', 'tio2-my', '--spec', 'tests/e2e/runtime.spec.ts'], {
    repositoryRoot: root, leaseRoot: join(root, 'leases'), signals,
    environment: {WORDPRESS_GRAPHQL_URL: 'http://127.0.0.1:1/graphql'},
    // Ten milliseconds is deliberate only for never-settling operations.
    // Success/order assertions also touch real files and must tolerate scheduling.
    acquisitionHandoffTimeoutMs: hang ? 10 : 1_000,
    cleanupOperationTimeoutMs: hang && hang !== 'consumer' ? 10 : 1_000,
    startupTimeoutMs: 1_000,
    readSourceCommit: async () => 'a'.repeat(40), supervisorFactory,
    nextCli: 'next.mjs', playwrightCli: 'playwright.mjs',
    emit: () => {},
    spawnProcess: (_executable: string, args: string[]) => {
      const token = new URL(args[1]).searchParams.get('owner')!
      const child = new MemoryChild(++nextPid, token, args.includes('next.mjs') ? 'next' : 'playwright')
      if (hang === 'consumer' && child.role === 'playwright') child.send = () => {
        child.released = true
        void stage('consumer', () => child.kill())
        return true
      }
      children.push(child)
      queueMicrotask(() => child.emit('message', {owner: token, action: 'gated', pid: child.pid}))
      return child
    },
    reserveLease: () => stage('reserve', () => { const lease = {leaseId: 'memory-lease', ports: [32100], processIds: []}; retained.set(lease.leaseId, lease); return lease }),
    attachLease: (options: {processId: number}) => stage('lease-attach', () => {
      const lease = retained.get('memory-lease')!
      const updated = {...lease, processIds: [...new Set([...lease.processIds, options.processId])]}
      retained.set(lease.leaseId, updated); return updated
    }),
    releaseLease: () => stage('release', () => { retained.clear(); return {released: true} }),
    fetchIdentity: async () => new Response('<main data-site-id="tio2-my"></main>'),
  }).then((value: unknown) => ({value, error: null}), (error: unknown) => ({value: null, error}))
  return {root, running, signals, events, children, retained, stageStarted, resume, closed: () => closed, factoryCount: () => factoryCount}
}

test.each(['native-attach', 'reserve', 'lease-attach', 'snapshot', 'listeners', 'stop', 'close', 'serial'])(
  'actual launcher returns with evidence when %s never settles', async stage => {
    const h = await memoryLauncher(stage)
    try {
      await h.stageStarted
      const outcome = await Promise.race([h.running, new Promise<null>(done => setTimeout(() => done(null), 250))])
      expect(outcome, 'native request must return within its bound').not.toBeNull()
      expect(outcome?.error).toBeTruthy()
      expect(h.events).not.toContain('release')
      expect(h.signals.listenerCount('SIGINT') + h.signals.listenerCount('SIGTERM')).toBe(0)
    } finally { h.resume(); await h.running; await new Promise(done => setTimeout(done, 50)); await rm(h.root, {recursive: true, force: true}) }
  }, 5_000,
)

test.each(['SIGINT', 'SIGTERM'])('actual launcher reconciles late lease attachment after %s without duplicate attach or close', async signal => {
  const h = await memoryLauncher('lease-attach', signal)
  try {
    await h.stageStarted
    const outcome = await Promise.race([h.running, new Promise<null>(done => setTimeout(() => done(null), 250))])
    expect(outcome).not.toBeNull()
    expect(outcome?.error).toBeTruthy()
    expect(h.events.filter(event => event === 'lease-attach')).toHaveLength(1)
    h.resume()
    await new Promise(done => setTimeout(done, 60))
    expect(h.children.every(child => child.exitCode !== null)).toBe(true)
    expect(h.closed()).toBe(1)
    expect(h.retained.size).toBe(1)
    expect(h.signals.eventNames()).toEqual([])
  } finally { h.resume(); await h.running; await rm(h.root, {recursive: true, force: true}) }
})

test.each(['factory', 'native-attach', 'reserve'])('actual launcher reconciles a late %s after cancellation', async stage => {
  const h = await memoryLauncher(stage, 'SIGINT')
  try {
    await h.stageStarted
    const outcome = await Promise.race([h.running, new Promise<null>(done => setTimeout(() => done(null), 250))])
    expect(outcome?.error).toBeTruthy()
    expect(h.signals.eventNames()).toEqual([])
    h.resume()
    await new Promise(done => setTimeout(done, 70))
    expect(h.children.every(child => child.exitCode !== null)).toBe(true)
    expect(h.closed()).toBe(stage === 'reserve' ? 2 : 1)
    if (stage === 'reserve') {
      expect(h.factoryCount()).toBe(2)
      expect(h.retained.size).toBe(0)
      expect(h.events.lastIndexOf('close')).toBeLessThan(h.events.lastIndexOf('release'))
    } else expect(h.events).not.toContain('release')
  } finally { h.resume(); await h.running; await rm(h.root, {recursive: true, force: true}) }
})

test('actual launcher closes its supervisor after a timed-out native attachment later rejects', async () => {
  const h = await memoryLauncher('native-attach', 'SIGTERM', 'late-reject')
  try {
    await h.stageStarted
    expect((await h.running).error).toBeTruthy()
    h.resume()
    await new Promise(done => setTimeout(done, 70))
    expect(h.closed()).toBe(1)
    expect(h.retained.size).toBe(1)
    expect(h.children.every(child => child.exitCode !== null)).toBe(true)
    expect(h.events).not.toContain('release')
  } finally { h.resume(); await h.running; await rm(h.root, {recursive: true, force: true}) }
})

test.each(['snapshot', 'listeners'])('actual launcher observes an interrupted %s request after returning', async stage => {
  const unhandled: unknown[] = []
  const listener = (error: unknown) => { unhandled.push(error) }
  process.on('unhandledRejection', listener)
  const h = await memoryLauncher(stage, 'SIGINT')
  try {
    await h.stageStarted
    expect((await h.running).error).toBeTruthy()
    await new Promise(done => setTimeout(done, 40))
    expect(unhandled).toEqual([])
    expect(h.signals.eventNames()).toEqual([])
  } finally {
    h.resume(); await h.running
    await new Promise(done => setTimeout(done, 25))
    process.off('unhandledRejection', listener)
    await rm(h.root, {recursive: true, force: true})
  }
})

test.each(['identity', 'listener', 'close'])('actual launcher retains the lease for %s uncertainty', async fault => {
  const h = await memoryLauncher(undefined, undefined, fault)
  try {
    const outcome = await h.running
    expect(outcome.error).toBeTruthy()
    expect(h.retained.size).toBe(1)
    expect(h.events).not.toContain('release')
  } finally { for (const child of h.children) child.kill(); await rm(h.root, {recursive: true, force: true}) }
})

test('actual launcher releases only after all trees stop, listeners clear and supervisor closes', async () => {
  const h = await memoryLauncher()
  try {
    const outcome = await h.running
    expect(outcome.error).toBeNull()
    expect(h.retained.size).toBe(0)
    expect(h.children.every(child => child.exitCode !== null)).toBe(true)
    expect(h.events.lastIndexOf('listeners')).toBeLessThan(h.events.indexOf('close'))
    expect(h.events.indexOf('close')).toBeLessThan(h.events.indexOf('release'))
    expect(h.closed()).toBe(1)
    expect(h.signals.eventNames()).toEqual([])
  } finally { await rm(h.root, {recursive: true, force: true}) }
})

test('native request deadlines do not replace the Playwright consumer lifetime', async () => {
  const h = await memoryLauncher('consumer')
  try {
    await h.stageStarted
    const early = await Promise.race([h.running, new Promise<null>(done => setTimeout(() => done(null), 50))])
    expect(early).toBeNull()
    h.resume()
    expect((await h.running).error).toBeNull()
    expect(h.retained.size).toBe(0)
  } finally { h.resume(); await h.running; await rm(h.root, {recursive: true, force: true}) }
})

test('actual public launcher bounds a never-settling supervisor factory and removes handlers', async () => {
  const {runOwnedE2e} = await import(resolve('scripts/run-owned-e2e.mjs'))
  await mkdir(resolve('.tmp'), {recursive: true})
  const root = await mkdtemp(resolve('.tmp/final-bounded-'))
  await mkdir(join(root, 'tests/e2e'), {recursive: true})
  await writeFile(join(root, 'tests/e2e/runtime.spec.ts'), "const url = requiredLocalUrl('TIO2_MY_BASE_URL')")
  await writeFile(join(root, 'tsconfig.json'), '{"include":[]}')
  let rejectFactory!: (error: Error) => void
  let started!: () => void
  const factoryStarted = new Promise<void>(done => { started = done })
  const before = ['SIGINT', 'SIGTERM'].map(signal => process.listenerCount(signal))
  const running = runOwnedE2e(['--site', 'tio2-my', '--spec', 'tests/e2e/runtime.spec.ts'], {
    repositoryRoot: root, environment: {WORDPRESS_GRAPHQL_URL: 'http://127.0.0.1:1/graphql'},
    acquisitionHandoffTimeoutMs: 10, cleanupOperationTimeoutMs: 10,
    supervisorFactory: () => { started(); return new Promise((_, reject) => { rejectFactory = reject }) },
  }).then(() => 'resolved', () => 'rejected')
  try {
    await factoryStarted
    const outcome = await Promise.race([running, new Promise<string>(done => setTimeout(() => done('unbounded'), 150))])
    expect(outcome).toBe('rejected')
    expect(['SIGINT', 'SIGTERM'].map(signal => process.listenerCount(signal))).toEqual(before)
  } finally {
    rejectFactory(new Error('release test-only deferred factory'))
    await running
    await rm(root, {recursive: true, force: true})
  }
})
