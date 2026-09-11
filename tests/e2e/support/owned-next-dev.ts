import {
  execFile,
  spawn,
  type ChildProcess,
  type SpawnOptions,
} from 'node:child_process'
import {randomBytes} from 'node:crypto'
import {
  closeSync,
  mkdirSync,
  openSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import {createServer} from 'node:net'
import {resolve} from 'node:path'
import {promisify} from 'node:util'

import {tio2A} from '../../../sites/tio2-a'
import {tio2B} from '../../../sites/tio2-b'
import {tio2Malaysia} from '../../../sites/tio2-my'

// @ts-expect-error -- Runtime leases are intentionally delivered as an MJS script.
import {attachLease as attachRuntimeLease, releaseLease as releaseRuntimeLease, reserveLease as reserveRuntimeLease} from '../../../scripts/runtime-ports/lease-core.mjs'
// @ts-expect-error -- The native Windows ownership supervisor is an MJS script.
import {createProcessSupervisor as createNativeProcessSupervisor} from '../../../scripts/runtime-ports/owned-process-tree.mjs'

type Task9RuntimeId = 'application-review' | 'editorial' | 'product' | 'resource-review'
type InterruptSignal = 'SIGINT' | 'SIGTERM'

interface OwnedNextDevOptions {
  readonly environment: Readonly<Record<string, string | undefined>>
  readonly runtimeId: Task9RuntimeId
}

interface PortLease {
  readonly leaseId: string
  readonly ports: number[]
  readonly processIds: number[]
}

interface ProcessIdentity {
  readonly pid: number
  readonly parentPid: number
  readonly startTime: string
  readonly command: string
  readonly executable: string
  readonly token: string
}

interface ProcessSupervisor {
  attach(
    pid: number,
    token: string,
    gate: string,
    executable: string,
  ): Promise<ProcessIdentity>
  snapshot(token: string): Promise<ProcessIdentity[]>
  stop(token: string, identities: ProcessIdentity[]): Promise<void>
  listenerOwners(port: number): Promise<number[]>
  close(): Promise<void>
}

interface SignalSource {
  on(signal: InterruptSignal, handler: () => void): unknown
  off(signal: InterruptSignal, handler: () => void): unknown
}

interface OwnedNextDevDependencies {
  readonly acquisitionHandoffTimeoutMs?: number
  readonly cleanupOperationTimeoutMs?: number
  readonly repositoryRoot?: string
  readonly leaseRoot?: string
  readonly readSourceCommit?: (repositoryRoot: string) => Promise<string>
  readonly reserveFreeLocalPort?: () => Promise<number>
  readonly reserveLease?: (options: Record<string, unknown>) => Promise<PortLease>
  readonly attachLease?: (options: Record<string, unknown>) => Promise<PortLease>
  readonly releaseLease?: (options: Record<string, unknown>) => Promise<unknown>
  readonly createProcessSupervisor?: () => Promise<ProcessSupervisor>
  readonly spawnProcess?: (
    command: string,
    args: readonly string[],
    options: SpawnOptions,
  ) => ChildProcess
  readonly randomOwnerToken?: () => string
  readonly fetchIdentity?: typeof fetch
  readonly signals?: SignalSource
  readonly now?: () => number
  readonly delay?: (milliseconds: number) => Promise<void>
  readonly startupTimeoutMs?: number
  readonly pollIntervalMs?: number
}

export interface OwnedNextDevRuntime {
  readonly baseUrl: string
  readonly leaseId: string
  readonly port: number
  serverErrorsSince(offset: number): string[]
  serverLogOffset(): number
  stop(): Promise<void>
  url(path: string): string
}

const execFileAsync = promisify(execFile)
const siteOrigins = new Map<string, string>([
  [tio2A.id, new URL(tio2A.url).origin],
  [tio2B.id, new URL(tio2B.url).origin],
  [tio2Malaysia.id, new URL(tio2Malaysia.url).origin],
])

export function assertExplicitLocalHttpUrl(
  value: string,
  expectedPath?: string,
): URL {
  const url = new URL(value)
  if (
    url.protocol !== 'http:' ||
    !['127.0.0.1', 'localhost'].includes(url.hostname) ||
    !url.port ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (expectedPath !== undefined && url.pathname !== expectedPath)
  ) {
    throw new Error(`Expected an explicit local HTTP URL: ${value}`)
  }
  return url
}

async function reserveFreeLocalPort(): Promise<number> {
  const server = createServer()
  await new Promise<void>((resolveListen, rejectListen) => {
    server.once('error', rejectListen)
    server.listen(0, '127.0.0.1', resolveListen)
  })
  const address = server.address()
  if (!address || typeof address === 'string') {
    server.close()
    throw new Error('Could not reserve an explicit local Next.js port')
  }
  await new Promise<void>((resolveClose, rejectClose) => {
    server.close((error) => {
      if (error) rejectClose(error)
      else resolveClose()
    })
  })
  return address.port
}

function sanitizeServerLogChunk(value: string): string {
  return value.replace(/([?&]signature=)[^&\s]+/giu, '$1[REDACTED]')
}

function acquireOwnedLock(
  lockPath: string,
  collisionMessage: string,
): () => void {
  mkdirSync(resolve(lockPath, '..'), {recursive: true})
  let descriptor: number
  try {
    descriptor = openSync(lockPath, 'wx')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
      throw new Error(collisionMessage)
    }
    throw error
  }
  try {
    writeFileSync(descriptor, String(process.pid))
  } catch (error) {
    try {
      closeSync(descriptor)
    } finally {
      rmSync(lockPath, {force: true})
    }
    throw error
  }

  let released = false
  return () => {
    if (released) return
    released = true
    try {
      closeSync(descriptor)
    } finally {
      rmSync(lockPath, {force: true})
    }
  }
}

function restoreOwnedTsconfig(
  tsconfigPath: string,
  originalText: string,
  ownedIncludes: ReadonlySet<string>,
): void {
  const currentText = readFileSync(tsconfigPath, 'utf8')
  const original = JSON.parse(originalText) as Record<string, unknown>
  const current = JSON.parse(currentText) as Record<string, unknown>
  if (!Array.isArray(current.include)) {
    throw new Error('Next dev removed the tracked TypeScript include list')
  }
  const withoutOwnedIncludes = {
    ...current,
    include: current.include.filter(
      (value) => typeof value !== 'string' || !ownedIncludes.has(value),
    ),
  }
  if (JSON.stringify(withoutOwnedIncludes) !== JSON.stringify(original)) {
    throw new Error('Tracked tsconfig.json changed beyond Task 9 Next dev additions')
  }
  writeFileSync(tsconfigPath, originalText)
}

function finished(child: ChildProcess): boolean {
  return child.exitCode !== null || child.signalCode !== null
}

function robotsIdentityMatches(value: string, siteOrigin: string): boolean {
  const lines = new Set(value.split(/\r?\n/u).map((line) => line.trim()))
  return lines.has(`Host: ${siteOrigin}`) &&
    lines.has(`Sitemap: ${siteOrigin}/sitemap.xml`)
}

export function createOwnedNextDevLauncher(
  dependencies: OwnedNextDevDependencies = {},
): (options: OwnedNextDevOptions) => Promise<OwnedNextDevRuntime> {
  const repositoryRoot = resolve(dependencies.repositoryRoot ?? '.')
  const leaseRoot = resolve(
    dependencies.leaseRoot ?? resolve(repositoryRoot, '.runtime/port-leases'),
  )
  const tsconfigPath = resolve(repositoryRoot, 'tsconfig.json')
  const globalLifecycleLockPath = resolve(
    repositoryRoot,
    '.tmp/task-9-next-dev-lifecycle.lock',
  )
  const readSourceCommit = dependencies.readSourceCommit ?? (async (root: string) => {
    const {stdout} = await execFileAsync('git', ['rev-parse', 'HEAD'], {
      cwd: root,
      encoding: 'utf8',
      windowsHide: true,
    })
    return String(stdout).trim()
  })
  const findFreePort = dependencies.reserveFreeLocalPort ?? reserveFreeLocalPort
  const reserveLease = dependencies.reserveLease ?? reserveRuntimeLease
  const attachLease = dependencies.attachLease ?? attachRuntimeLease
  const releaseLease = dependencies.releaseLease ?? releaseRuntimeLease
  const supervisorFactory = dependencies.createProcessSupervisor ?? createNativeProcessSupervisor
  const spawnProcess = dependencies.spawnProcess ?? spawn
  const randomOwnerToken = dependencies.randomOwnerToken ?? (() => randomBytes(32).toString('hex'))
  const fetchIdentity = dependencies.fetchIdentity ?? fetch
  const signals = dependencies.signals ?? process
  const now = dependencies.now ?? Date.now
  const delay = dependencies.delay ?? ((milliseconds: number) => new Promise<void>(
    (resolveDelay) => setTimeout(resolveDelay, milliseconds),
  ))
  const startupTimeoutMs = dependencies.startupTimeoutMs ?? 90_000
  const pollIntervalMs = dependencies.pollIntervalMs ?? 250
  const acquisitionHandoffTimeoutMs = dependencies.acquisitionHandoffTimeoutMs ?? 5_000
  const cleanupOperationTimeoutMs = dependencies.cleanupOperationTimeoutMs ?? 30_000

  return async function launchOwnedNextDev({
    environment,
    runtimeId,
  }: OwnedNextDevOptions): Promise<OwnedNextDevRuntime> {
    const siteId = environment.SITE_ID?.trim()
    if (!siteId) throw new Error('SITE_ID is required for owned Next readiness')
    const siteOrigin = siteOrigins.get(siteId)
    if (!siteOrigin) throw new Error(`Unknown SITE_ID: ${siteId}`)

    const nextDistDirectory = `.next-task-9-${runtimeId}`
    const nextDistPath = resolve(repositoryRoot, nextDistDirectory)
    const runtimeLockPath = resolve(
      repositoryRoot,
      `.tmp/task-9-${runtimeId}-preview.lock`,
    )
    const ownedIncludes = new Set([
      `${nextDistDirectory}/types/**/*.ts`,
      `${nextDistDirectory}/dev/types/**/*.ts`,
    ])
    const releaseGlobalLifecycleLock = acquireOwnedLock(
      globalLifecycleLockPath,
      'A Task 9 owned Next dev lifecycle is already active',
    )
    const releaseRuntimeLock = (() => {
      try {
        return acquireOwnedLock(
          runtimeLockPath,
          `A Task 9 ${runtimeId} preview runtime is already active`,
        )
      } catch (error) {
        releaseGlobalLifecycleLock()
        throw error
      }
    })()

    let originalTsconfig: string
    try {
      originalTsconfig = readFileSync(tsconfigPath, 'utf8')
    } catch (error) {
      releaseRuntimeLock()
      releaseGlobalLifecycleLock()
      throw error
    }

    let supervisor: ProcessSupervisor | undefined
    let lease: PortLease | undefined
    let port: number | undefined
    let baseUrl: string | undefined
    let nextServer: ChildProcess | undefined
    let ownerToken: string | undefined
    let attachedToSupervisor = false
    let gateReleased = false
    let serverLogs = ''
    let serverStartupError: Error | undefined
    let completion: Promise<number> | undefined
    let stopping: Promise<void> | undefined
    let runtimeReady = false
    let localStateReleased = false
    const identities = new Map<number, ProcessIdentity>()
    const pendingLeaseAttachments = new Map<string, Promise<PortLease>>()
    const unresolvedAcquisitions = new Set<Promise<unknown>>()
    const controller = new AbortController()
    const cancellation = new Promise<never>((_resolve, reject) => {
      controller.signal.addEventListener(
        'abort',
        () => reject(controller.signal.reason),
        {once: true},
      )
    })
    cancellation.catch(() => {})

    const acquireOwnedResource = async <T>(
      label: string,
      operation: Promise<T>,
      register: (value: T) => void,
      disposeLate: (value: T) => Promise<void>,
    ): Promise<T> => {
      let registered = false
      let handoffTimedOut = false
      const registerOnce = (value: T): T => {
        if (!registered) {
          register(value)
          registered = true
        }
        return value
      }
      try {
        const value = await Promise.race([operation, cancellation])
        registerOnce(value)
        unresolvedAcquisitions.delete(operation)
        controller.signal.throwIfAborted()
        return value
      } catch (error) {
        if (!controller.signal.aborted) throw error

        const timeoutError = new Error(
          `${label} did not settle within the cancellation handoff window`,
        )
        let timeout: ReturnType<typeof setTimeout> | undefined
        try {
          const value = await Promise.race([
            operation,
            new Promise<never>((_resolve, reject) => {
              timeout = setTimeout(() => reject(timeoutError), acquisitionHandoffTimeoutMs)
            }),
          ])
          registerOnce(value)
        } catch (handoffError) {
          if (handoffError === timeoutError) {
            handoffTimedOut = true
            unresolvedAcquisitions.add(operation)
            void operation.then(async (value) => {
              await disposeLate(value)
              unresolvedAcquisitions.delete(operation)
            }, () => {}).catch(() => {})
          } else {
            throw new AggregateError(
              [error, handoffError],
              `${label} failed while handing ownership to cancellation cleanup`,
            )
          }
        } finally {
          if (timeout) clearTimeout(timeout)
        }
        if (handoffTimedOut) {
          throw new AggregateError(
            [error, timeoutError],
            `${label} cancellation handoff is uncertain after ${error instanceof Error ? error.message : String(error)}; ownership evidence retained`,
          )
        }
        throw error
      }
    }

    const acquireCleanupResource = async <T>(
      label: string,
      operation: Promise<T>,
      register: (value: T) => void,
      disposeLate: (value: T) => Promise<void>,
    ): Promise<T> => {
      const timeoutError = new Error(`${label} cleanup handoff timed out`)
      let timeout: ReturnType<typeof setTimeout> | undefined
      try {
        const value = await Promise.race([
          operation,
          new Promise<never>((_resolve, reject) => {
            timeout = setTimeout(() => reject(timeoutError), acquisitionHandoffTimeoutMs)
          }),
        ])
        register(value)
        unresolvedAcquisitions.delete(operation)
        return value
      } catch (error) {
        if (error === timeoutError) {
          unresolvedAcquisitions.add(operation)
          void operation.then(async (value) => {
            await disposeLate(value)
            unresolvedAcquisitions.delete(operation)
          }, () => {}).catch(() => {})
        }
        throw error
      } finally {
        if (timeout) clearTimeout(timeout)
      }
    }

    const checked = async <T>(operation: Promise<T>): Promise<T> => {
      controller.signal.throwIfAborted()
      const result = await Promise.race([operation, cancellation])
      controller.signal.throwIfAborted()
      return result
    }

    const awaitCleanupOutcome = async <T>(
      label: string,
      operation: Promise<T>,
    ): Promise<T> => {
      let timeout: ReturnType<typeof setTimeout> | undefined
      try {
        return await Promise.race([
          operation,
          new Promise<never>((_resolve, reject) => {
            timeout = setTimeout(
              () => reject(new Error(`${label} timed out; lease retained`)),
              cleanupOperationTimeoutMs,
            )
          }),
        ])
      } finally {
        if (timeout) clearTimeout(timeout)
      }
    }

    const rememberIdentities = async (
      observed: ProcessIdentity[],
      phase: 'cleanup' | 'startup',
    ): Promise<ProcessIdentity[]> => {
      for (const identity of observed) {
        if (
          !Number.isInteger(identity.pid) ||
          identity.pid < 1 ||
          typeof identity.startTime !== 'string' ||
          identity.startTime.length === 0
        ) {
          throw new Error('Owned process identity is missing PID/start time')
        }
        identities.set(identity.pid, identity)
        if (lease && !lease.processIds.includes(identity.pid)) {
          const leaseId = lease.leaseId
          const attachmentKey = `${identity.pid}:${identity.startTime}:${identity.token}`
          const existingAttachment = pendingLeaseAttachments.get(attachmentKey)
          const attachment = existingAttachment ?? attachLease({
              leaseRoot,
              leaseId,
              processId: identity.pid,
            })
          if (!existingAttachment) {
            pendingLeaseAttachments.set(attachmentKey, attachment)
            void attachment.finally(() => {
              if (pendingLeaseAttachments.get(attachmentKey) === attachment) {
                pendingLeaseAttachments.delete(attachmentKey)
              }
            }).catch(() => {})
          }
          const acquireAttachment = phase === 'cleanup'
            ? acquireCleanupResource
            : acquireOwnedResource
          await acquireAttachment<PortLease>(
            'Runtime lease attachment',
            attachment,
            (attachedLease) => { lease = attachedLease },
            async (attachedLease) => { lease = attachedLease },
          )
        }
      }
      return observed
    }

    const snapshot = async (
      cancellable = false,
    ): Promise<ProcessIdentity[]> => {
      if (!supervisor || !ownerToken) return []
      const observed = cancellable
        ? await checked(supervisor.snapshot(ownerToken))
        : await awaitCleanupOutcome(
          'Owned cleanup snapshot',
          supervisor.snapshot(ownerToken),
        )
      return rememberIdentities(observed, cancellable ? 'startup' : 'cleanup')
    }

    const cleanup = async (): Promise<void> => {
      const failures: unknown[] = []
      let ownedTreeStopped = true
      let listenerClosed = true
      let artifactsRestored = true

      if (nextServer) {
        if (attachedToSupervisor && supervisor && ownerToken) {
          try {
            await awaitCleanupOutcome(
              'Owned cleanup stop',
              supervisor.stop(ownerToken, await snapshot()),
            )
            if ((await snapshot()).length > 0) {
              throw new Error('Owned Next descendants remain; lease retained')
            }
          } catch (error) {
            ownedTreeStopped = false
            failures.push(error)
          }
        } else if (!gateReleased && !finished(nextServer)) {
          // The target has not executed and cannot have descendants before the
          // one-shot gate opens. The ChildProcess handle is therefore the only
          // safe fallback when native Job attachment itself did not complete.
          try {
            nextServer.kill()
            await Promise.race([
              completion?.catch(() => 1) ?? Promise.resolve(1),
              delay(5_000).then(() => {
                if (!finished(nextServer!)) {
                  throw new Error('Unreleased gated Next child did not stop; lease retained')
                }
                return 1
              }),
            ])
            if (!finished(nextServer)) {
              throw new Error('Unreleased gated Next child did not stop; lease retained')
            }
          } catch (error) {
            ownedTreeStopped = false
            failures.push(error)
          }
        } else if (!attachedToSupervisor && gateReleased) {
          ownedTreeStopped = false
          failures.push(new Error('Next target ran without verified Job ownership; lease retained'))
        }
      }

      if (lease && port !== undefined) {
        try {
          const listenerOwners = await supervisor?.listenerOwners(port)
          if (!listenerOwners || listenerOwners.length > 0) {
            throw new Error(
              `Port ${port} still has a listening owner; lease retained`,
            )
          }
        } catch (error) {
          listenerClosed = false
          failures.push(error)
        }
      }

      if (ownedTreeStopped && listenerClosed) {
        try {
          restoreOwnedTsconfig(tsconfigPath, originalTsconfig, ownedIncludes)
          rmSync(nextDistPath, {force: true, recursive: true})
        } catch (error) {
          artifactsRestored = false
          failures.push(error)
        }
      }

      if (supervisor) {
        try {
          await supervisor.close()
        } catch (error) {
          failures.push(error)
        }
      }

      if (unresolvedAcquisitions.size > 0) {
        failures.push(new Error(
          'Resource acquisition cancellation handoff is uncertain; lease and locks retained',
        ))
      }

      if (
        lease &&
        ownedTreeStopped &&
        listenerClosed &&
        artifactsRestored &&
        failures.length === 0
      ) {
        try {
          await releaseLease({
            leaseRoot,
            leaseId: lease.leaseId,
            expectedProcessIds: lease.processIds,
          })
        } catch (error) {
          failures.push(error)
        }
      }

      if (
        ownedTreeStopped &&
        listenerClosed &&
        artifactsRestored &&
        failures.length === 0
      ) {
        releaseRuntimeLock()
        releaseGlobalLifecycleLock()
        localStateReleased = true
      }

      for (const [signal, handler] of signalHandlers) {
        signals.off(signal, handler)
      }

      if (failures.length > 0) {
        const details = failures.map((error) =>
          error instanceof Error ? error.message : String(error),
        ).join('; ')
        throw new AggregateError(
          failures,
          `Owned Next runtime cleanup failed: ${details}`,
        )
      }
    }

    const stopRuntime = (): Promise<void> => stopping ??= cleanup()
    const interrupt = (signal: InterruptSignal): void => {
      controller.abort(new Error(`Owned Next dev interrupted: ${signal}`))
      if (runtimeReady) void stopRuntime().catch(() => {})
    }
    const signalHandlers = new Map<InterruptSignal, () => void>([
      ['SIGINT', () => interrupt('SIGINT')],
      ['SIGTERM', () => interrupt('SIGTERM')],
    ])

    try {
      for (const [signal, handler] of signalHandlers) signals.on(signal, handler)
      const sourceCommit = await checked(readSourceCommit(repositoryRoot))
      if (!/^[0-9a-f]{40}$/iu.test(sourceCommit)) {
        throw new Error('Owned Next source commit must be a 40-character Git SHA')
      }
      await acquireOwnedResource<ProcessSupervisor>(
        'Process supervisor creation',
        supervisorFactory(),
        (createdSupervisor) => { supervisor = createdSupervisor },
        async (createdSupervisor) => createdSupervisor.close(),
      )
      port = await checked(findFreePort())
      baseUrl = `http://127.0.0.1:${port}`
      assertExplicitLocalHttpUrl(baseUrl)
      await acquireOwnedResource<PortLease>(
        'Runtime port lease reservation',
        reserveLease({
          leaseRoot,
          runId: runtimeId,
          purpose: 'test-next',
          siteId,
          worktree: repositoryRoot,
          commit: sourceCommit,
          pool: {start: port, end: port},
        }),
        (reservedLease) => { lease = reservedLease },
        async (reservedLease) => {
          if (reservedLease.ports.length !== 1) {
            throw new Error('Late runtime lease did not retain exactly one port')
          }
          let inspector: ProcessSupervisor | undefined
          try {
            inspector = await acquireCleanupResource<ProcessSupervisor>(
              'Late runtime lease listener inspector',
              supervisorFactory(),
              () => {},
              async (lateInspector) => lateInspector.close(),
            )
            const listenerOwners = await inspector.listenerOwners(reservedLease.ports[0])
            if (listenerOwners.length > 0) {
              throw new Error('Late runtime lease port still has a listener; lease retained')
            }
            await releaseLease({
              leaseRoot,
              leaseId: reservedLease.leaseId,
              expectedProcessIds: reservedLease.processIds,
            })
          } finally {
            await inspector?.close()
          }
        },
      )
      if (lease!.ports.length !== 1 || lease!.ports[0] !== port) {
        throw new Error('Owned Next lease did not retain the OS-selected port')
      }

      ownerToken = randomOwnerToken()
      const gate = new URL(
        '../../../scripts/runtime-ports/owned-entry-gate.mjs',
        import.meta.url,
      )
      gate.searchParams.set('owner', ownerToken)
      nextServer = spawnProcess(
        process.execPath,
        [
          '--import',
          gate.href,
          resolve(repositoryRoot, 'node_modules/next/dist/bin/next'),
          'dev',
          '--webpack',
          '--hostname',
          '127.0.0.1',
          '--port',
          String(port),
        ],
        {
          cwd: repositoryRoot,
          env: {
            ...process.env,
            ...environment,
            NEXT_DIST_DIR: nextDistDirectory,
            NEXT_TELEMETRY_DISABLED: '1',
          },
          stdio: ['pipe', 'pipe', 'pipe', 'ipc'],
          windowsHide: true,
        },
      )
      nextServer.once('error', (error) => {
        serverStartupError = error
      })
      nextServer.stdout?.on('data', (chunk: Buffer) => {
        serverLogs += sanitizeServerLogChunk(chunk.toString())
      })
      nextServer.stderr?.on('data', (chunk: Buffer) => {
        serverLogs += sanitizeServerLogChunk(chunk.toString())
      })
      completion = new Promise<number>((resolveExit, rejectExit) => {
        nextServer!.once('error', rejectExit)
        nextServer!.once('exit', (code) => resolveExit(code ?? 1))
      })
      completion.catch(() => {})
      completion.then(
        (code) => {
          if (!stopping) {
            controller.abort(new Error(`Next dev exited unexpectedly (${code})\n${serverLogs}`))
            if (runtimeReady) void stopRuntime().catch(() => {})
          }
        },
        (error: Error) => {
          if (!stopping) {
            controller.abort(error)
            if (runtimeReady) void stopRuntime().catch(() => {})
          }
        },
      )

      if (!nextServer.pid) throw new Error('Next dev did not expose a process ID')
      const gateReady = new Promise<void>((resolveGate, rejectGate) => {
        const timeout = setTimeout(
          () => rejectGate(new Error('Next dev entry gate timed out')),
          15_000,
        )
        const onMessage = (message: unknown) => {
          const candidate = message as Record<string, unknown> | null
          if (
            candidate?.owner === ownerToken &&
            candidate?.action === 'gated' &&
            candidate?.pid === nextServer!.pid
          ) {
            clearTimeout(timeout)
            nextServer!.off('message', onMessage)
            resolveGate()
          }
        }
        nextServer!.on('message', onMessage)
        completion!.then(
          () => {
            clearTimeout(timeout)
            rejectGate(new Error('Next dev exited before ownership attachment'))
          },
          (error) => {
            clearTimeout(timeout)
            rejectGate(error)
          },
        )
      })
      await checked(gateReady)
      const initialIdentity = await checked(supervisor!.attach(
        nextServer.pid,
        ownerToken,
        gate.href,
        process.execPath,
      ))
      attachedToSupervisor = true
      await rememberIdentities([initialIdentity], 'startup')
      controller.signal.throwIfAborted()
      gateReleased = true
      nextServer.send?.({owner: ownerToken, action: 'run'})

      const deadline = now() + startupTimeoutMs
      while (now() < deadline) {
        controller.signal.throwIfAborted()
        if (serverStartupError) throw serverStartupError
        if (finished(nextServer)) {
          throw new Error(`Next dev exited during startup\n${serverLogs}`)
        }
        const listenerOwners = await checked(supervisor!.listenerOwners(port))
        if (listenerOwners.length > 0) {
          const members = await snapshot(true)
          if (listenerOwners.some((pid) => !members.some((member) => member.pid === pid))) {
            throw new Error(`Refused foreign listening owner at ${baseUrl}`)
          }
          try {
            const response = await checked(fetchIdentity(`${baseUrl}/robots.txt`, {
              cache: 'no-store',
              redirect: 'manual',
              signal: AbortSignal.timeout(5_000),
            }))
            const identityResponse = await checked(response.text())
            if (response.ok && robotsIdentityMatches(identityResponse, siteOrigin)) {
              const finalOwners = await checked(supervisor!.listenerOwners(port))
              const finalMembers = await snapshot(true)
              if (
                finalOwners.length === 0 ||
                finalOwners.some((pid) => !finalMembers.some((member) => member.pid === pid))
              ) {
                throw new Error(`Refused foreign listening owner at ${baseUrl}`)
              }
              break
            }
            if (response.ok && /^(?:Host|Sitemap):/mu.test(identityResponse)) {
              throw new Error(`Wrong site identity at ${baseUrl}`)
            }
          } catch (error) {
            if (
              error instanceof Error &&
              !['TypeError', 'TimeoutError'].includes(error.name)
            ) {
              throw error
            }
          }
        }
        await checked(delay(pollIntervalMs))
      }
      if (now() >= deadline) {
        throw new Error(`Timed out waiting for ${siteId} identity at ${baseUrl}\n${serverLogs}`)
      }
      controller.signal.throwIfAborted()
      runtimeReady = true

      return {
        baseUrl,
        leaseId: lease!.leaseId,
        port,
        serverErrorsSince(offset: number): string[] {
          if (!Number.isSafeInteger(offset) || offset < 0) {
            throw new Error('Server log offset must be a non-negative integer')
          }
          return serverLogs
            .slice(offset)
            .split(/\r?\n/u)
            .filter((line) =>
              /(?:⨯|Error:|TypeError:|ReferenceError:|Unhandled|Failed to compile)/u.test(
                line,
              ),
            )
        },
        serverLogOffset(): number {
          return serverLogs.length
        },
        stop: stopRuntime,
        url(path: string): string {
          if (!/^\/[A-Za-z0-9/_-]*$/u.test(path)) {
            throw new Error('Runtime URLs require a literal local path')
          }
          const url = new URL(path, baseUrl)
          assertExplicitLocalHttpUrl(url.href, path)
          return url.href
        },
      }
    } catch (error) {
      try {
        await stopRuntime()
      } catch (cleanupError) {
        const startupMessage = error instanceof Error ? error.message : String(error)
        const cleanupMessage = cleanupError instanceof Error
          ? cleanupError.message
          : String(cleanupError)
        throw new AggregateError(
          [error, cleanupError],
          `Next dev startup and owned cleanup both failed: ${startupMessage}; ${cleanupMessage}`,
        )
      }
      throw error
    } finally {
      if (!runtimeReady && !localStateReleased && !stopping) {
        releaseRuntimeLock()
        releaseGlobalLifecycleLock()
      }
    }
  }
}

const launchOwnedNextDev = createOwnedNextDevLauncher()

export async function startOwnedNextDev(
  options: OwnedNextDevOptions,
): Promise<OwnedNextDevRuntime> {
  return launchOwnedNextDev(options)
}
