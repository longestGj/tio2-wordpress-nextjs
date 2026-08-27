import {spawn, type ChildProcessWithoutNullStreams} from 'node:child_process'
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

type Task9RuntimeId = 'editorial' | 'product'

interface OwnedNextDevOptions {
  readonly environment: Readonly<Record<string, string | undefined>>
  readonly runtimeId: Task9RuntimeId
}

export interface OwnedNextDevRuntime {
  readonly baseUrl: string
  readonly port: number
  serverErrorsSince(offset: number): string[]
  serverLogOffset(): number
  stop(): Promise<void>
  url(path: string): string
}

const repositoryRoot = resolve('.')
const tsconfigPath = resolve('tsconfig.json')
const globalLifecycleLockPath = resolve(
  '.tmp/task-9-next-dev-lifecycle.lock',
)

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
  mkdirSync(resolve('.tmp'), {recursive: true})
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

async function stopProcessTree(
  server: ChildProcessWithoutNullStreams,
): Promise<void> {
  if (server.exitCode !== null || !server.pid) return
  const exited = new Promise<boolean>((resolveExit) => {
    server.once('exit', () => resolveExit(true))
  })
  const awaitExit = async (): Promise<boolean> => {
    if (server.exitCode !== null) return true
    return Promise.race([
      exited,
      new Promise<boolean>((resolveWait) =>
        setTimeout(() => resolveWait(false), 5_000),
      ),
    ])
  }
  if (process.platform === 'win32') {
    const killer = spawn('taskkill', ['/PID', String(server.pid), '/T', '/F'], {
      stdio: 'pipe',
      windowsHide: true,
    })
    const killerResult = await new Promise<{code: number | null; error?: Error}>(
      (resolveKiller) => {
        killer.once('error', (error) => resolveKiller({code: null, error}))
        killer.once('exit', (code) => resolveKiller({code}))
      },
    )
    const stopped = await awaitExit()
    if (!stopped) {
      throw new Error(
        `taskkill did not stop the Task 9 Next process (exit ${killerResult.code ?? 'unavailable'})`,
        {cause: killerResult.error},
      )
    }
    if (killerResult.error || (killerResult.code !== 0 && server.exitCode === null)) {
      throw new Error('taskkill could not verify Task 9 process cleanup', {
        cause: killerResult.error,
      })
    }
    return
  }

  server.kill('SIGTERM')
  if (!(await awaitExit())) {
    server.kill('SIGKILL')
    if (!(await awaitExit())) {
      throw new Error('SIGKILL did not stop the Task 9 Next process')
    }
  }
}

async function waitForNextServer(
  server: ChildProcessWithoutNullStreams,
  baseUrl: string,
  logs: () => string,
  startupError: () => Error | undefined,
): Promise<void> {
  const deadline = Date.now() + 90_000
  while (Date.now() < deadline) {
    if (startupError()) throw startupError()
    if (server.exitCode !== null) {
      throw new Error(`Next dev exited during startup\n${logs()}`)
    }
    try {
      const response = await fetch(`${baseUrl}/robots.txt`, {cache: 'no-store'})
      if (response.ok) return
    } catch {
      // The fresh development server has not started listening yet.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 250))
  }
  throw new Error(`Next dev did not become ready\n${logs()}`)
}

export async function startOwnedNextDev({
  environment,
  runtimeId,
}: OwnedNextDevOptions): Promise<OwnedNextDevRuntime> {
  const nextDistDirectory = `.next-task-9-${runtimeId}`
  const runtimeLockPath = resolve(`.tmp/task-9-${runtimeId}-preview.lock`)
  const ownedIncludes = new Set([
    `${nextDistDirectory}/types/**/*.ts`,
    `${nextDistDirectory}/dev/types/**/*.ts`,
  ])
  const port = await reserveFreeLocalPort()
  const baseUrl = `http://127.0.0.1:${port}`
  assertExplicitLocalHttpUrl(baseUrl)
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

  let serverLogs = ''
  let serverStartupError: Error | undefined
  const nextServer = spawn(
    process.execPath,
    [
      resolve('node_modules/next/dist/bin/next'),
      'dev',
      '--hostname',
      '127.0.0.1',
      '--port',
      String(port),
    ],
    {
      cwd: repositoryRoot,
      env: {...process.env, ...environment, NEXT_DIST_DIR: nextDistDirectory},
      stdio: 'pipe',
      windowsHide: true,
    },
  )
  nextServer.once('error', (error) => {
    serverStartupError = error
  })
  nextServer.stdout.on('data', (chunk: Buffer) => {
    serverLogs += sanitizeServerLogChunk(chunk.toString())
  })
  nextServer.stderr.on('data', (chunk: Buffer) => {
    serverLogs += sanitizeServerLogChunk(chunk.toString())
  })

  const cleanup = async (): Promise<void> => {
    await stopProcessTree(nextServer)
    const failures: unknown[] = []
    try {
      restoreOwnedTsconfig(originalTsconfig, ownedIncludes)
    } catch (error) {
      failures.push(error)
    }
    try {
      rmSync(resolve(nextDistDirectory), {force: true, recursive: true})
    } catch (error) {
      failures.push(error)
    }
    if (failures.length > 0) {
      throw new AggregateError(failures, 'Task 9 runtime cleanup failed')
    }
    releaseRuntimeLock()
    releaseGlobalLifecycleLock()
  }

  try {
    await waitForNextServer(
      nextServer,
      baseUrl,
      () => serverLogs,
      () => serverStartupError,
    )
  } catch (error) {
    try {
      await cleanup()
    } catch (cleanupError) {
      throw new AggregateError(
        [error, cleanupError],
        'Next dev startup and Task 9 cleanup both failed',
      )
    }
    throw error
  }

  let stopped = false
  return {
    baseUrl,
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
    async stop(): Promise<void> {
      if (stopped) return
      stopped = true
      await cleanup()
    },
    url(path: string): string {
      if (!/^\/[A-Za-z0-9/_-]*$/u.test(path)) {
        throw new Error('Runtime URLs require a literal local path')
      }
      const url = new URL(path, baseUrl)
      assertExplicitLocalHttpUrl(url.href, path)
      return url.href
    },
  }
}
