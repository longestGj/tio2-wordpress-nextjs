import {
  spawn,
  spawnSync,
  type ChildProcessWithoutNullStreams,
} from 'node:child_process'
import {createHmac} from 'node:crypto'
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

const repositoryRoot = resolve('.')
const wordpressEnvironmentPath = resolve('wordpress/.env')
const wordpressComposePath = resolve('wordpress/docker-compose.yml')
const wordpressPreviewUrl =
  'http://127.0.0.1:8080/wp-json/tio2/v1/preview'
const wordpressGraphqlUrl = 'http://127.0.0.1:8080/graphql'
const nextDistDirectory = '.next-task-9-editorial'
const runtimeLockPath = resolve('.tmp/task-9-editorial-preview.lock')
const tsconfigPath = resolve('tsconfig.json')
const task9TsconfigIncludes = new Set([
  `${nextDistDirectory}/types/**/*.ts`,
  `${nextDistDirectory}/dev/types/**/*.ts`,
])

export interface EditorialPreviewRuntime {
  readonly baseUrl: string
  readonly port: number
  readonly previewSecret: string
  serverErrorsSince(offset: number): string[]
  serverLogOffset(): number
  signedPreviewUrl(canonicalPath: string): string
  stop(): Promise<void>
  url(path: string): string
  wordpressPreviewCacheControl(canonicalPath: string): Promise<string>
  wordpressPreviewRequestCount(): number
}

function parseLocalWordpressEnvironment(): Readonly<Record<string, string>> {
  const values: Record<string, string> = {}
  for (const [index, rawLine] of readFileSync(
    wordpressEnvironmentPath,
    'utf8',
  )
    .split(/\r?\n/u)
    .entries()) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const separator = line.indexOf('=')
    if (separator <= 0) {
      throw new Error(`Malformed local WordPress environment line ${index + 1}`)
    }
    const key = line.slice(0, separator).trim()
    const value = line.slice(separator + 1)
    if (!/^[A-Z][A-Z0-9_]*$/u.test(key) || Object.hasOwn(values, key)) {
      throw new Error(`Unsafe or duplicate local WordPress environment key: ${key}`)
    }
    values[key] = value
  }
  return Object.freeze(values)
}

function assertExplicitLocalHttpUrl(
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

function acquireRuntimeLock(): () => void {
  mkdirSync(resolve('.tmp'), {recursive: true})
  let descriptor: number
  try {
    descriptor = openSync(runtimeLockPath, 'wx')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
      throw new Error('A Task 9 editorial preview runtime is already active')
    }
    throw error
  }
  try {
    writeFileSync(descriptor, String(process.pid))
  } catch (error) {
    try {
      closeSync(descriptor)
    } finally {
      rmSync(runtimeLockPath, {force: true})
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
      rmSync(runtimeLockPath, {force: true})
    }
  }
}

function restoreOwnedTsconfig(originalText: string): void {
  const currentText = readFileSync(tsconfigPath, 'utf8')
  const original = JSON.parse(originalText) as Record<string, unknown>
  const current = JSON.parse(currentText) as Record<string, unknown>
  if (!Array.isArray(current.include)) {
    throw new Error('Next dev removed the tracked TypeScript include list')
  }
  const withoutOwnedIncludes = {
    ...current,
    include: current.include.filter(
      (value) => typeof value !== 'string' || !task9TsconfigIncludes.has(value),
    ),
  }
  if (JSON.stringify(withoutOwnedIncludes) !== JSON.stringify(original)) {
    throw new Error('Tracked tsconfig.json changed beyond Task 9 Next dev additions')
  }
  writeFileSync(tsconfigPath, originalText)
}

async function cleanupOwnedRuntime(
  server: ChildProcessWithoutNullStreams,
  originalTsconfig: string,
  releaseRuntimeLock: () => void,
): Promise<void> {
  // Never restore/delete/release ownership while the server might still be
  // using the dist directory.
  await stopProcessTree(server)

  const failures: unknown[] = []
  try {
    restoreOwnedTsconfig(originalTsconfig)
  } catch (error) {
    failures.push(error)
  }
  try {
    rmSync(resolve(nextDistDirectory), {force: true, recursive: true})
  } catch (error) {
    failures.push(error)
  }
  try {
    releaseRuntimeLock()
  } catch (error) {
    failures.push(error)
  }
  if (failures.length > 0) {
    throw new AggregateError(failures, 'Task 9 runtime cleanup failed')
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
      const response = await fetch(`${baseUrl}/robots.txt`, {
        cache: 'no-store',
      })
      if (response.ok) return
    } catch {
      // The fresh development server has not started listening yet.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 250))
  }
  throw new Error(`Next dev did not become ready\n${logs()}`)
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

function wordpressContainerId(): string {
  const result = spawnSync(
    'docker',
    [
      'compose',
      '--env-file',
      wordpressEnvironmentPath,
      '-f',
      wordpressComposePath,
      'ps',
      '-q',
      'wordpress',
    ],
    {cwd: repositoryRoot, encoding: 'utf8', windowsHide: true},
  )
  if (result.status !== 0) {
    throw new Error('Could not identify the asserted local WordPress container')
  }
  const ids = result.stdout
    .split(/\r?\n/u)
    .map((value) => value.trim())
    .filter(Boolean)
  if (ids.length !== 1) {
    throw new Error('Expected exactly one running local WordPress container')
  }
  return ids[0] as string
}

function wordpressPreviewLogLines(
  containerId: string,
  since: string,
): string[] {
  const result = spawnSync('docker', ['logs', '--since', since, containerId], {
    cwd: repositoryRoot,
    encoding: 'utf8',
    windowsHide: true,
  })
  if (result.status !== 0) {
    throw new Error('Could not read the local WordPress preview access log')
  }
  return `${result.stdout}${result.stderr}`
    .split(/\r?\n/u)
    .filter((line) => line.includes('/wp-json/tio2/v1/preview'))
}

async function assertWordpressEndpoint(): Promise<void> {
  assertExplicitLocalHttpUrl(
    wordpressPreviewUrl,
    '/wp-json/tio2/v1/preview',
  )
  const response = await fetch('http://127.0.0.1:8080/wp-json/', {
    cache: 'no-store',
  })
  if (!response.ok) {
    throw new Error(`Local WordPress REST index returned ${response.status}`)
  }
}

export async function startEditorialPreviewRuntime(): Promise<EditorialPreviewRuntime> {
  const localEnvironment = parseLocalWordpressEnvironment()
  const previewSecret = localEnvironment.NEXTJS_PREVIEW_SECRET_TIO2_A
  const revalidationSecret =
    localEnvironment.NEXTJS_REVALIDATION_SECRET_TIO2_A
  if (!previewSecret || !revalidationSecret) {
    throw new Error('Missing local Site A preview or revalidation secret')
  }
  await assertWordpressEndpoint()

  const port = await reserveFreeLocalPort()
  const baseUrl = `http://127.0.0.1:${port}`
  assertExplicitLocalHttpUrl(baseUrl)
  const containerId = wordpressContainerId()
  const wordpressLogStart = new Date(Date.now() - 1_000).toISOString()
  const releaseRuntimeLock = acquireRuntimeLock()
  let originalTsconfig: string
  try {
    originalTsconfig = readFileSync(tsconfigPath, 'utf8')
  } catch (error) {
    releaseRuntimeLock()
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
      env: {
        ...process.env,
        NEXT_DIST_DIR: nextDistDirectory,
        PREVIEW_SECRET: previewSecret,
        REVALIDATION_SECRET: revalidationSecret,
        SITE_ID: 'tio2-a',
        WORDPRESS_GRAPHQL_URL: wordpressGraphqlUrl,
        WORDPRESS_PREVIEW_SECRET: previewSecret,
        WORDPRESS_PREVIEW_URL: wordpressPreviewUrl,
      },
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

  try {
    await waitForNextServer(
      nextServer,
      baseUrl,
      () => serverLogs,
      () => serverStartupError,
    )
  } catch (error) {
    try {
      await cleanupOwnedRuntime(
        nextServer,
        originalTsconfig,
        releaseRuntimeLock,
      )
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
    previewSecret,
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
    signedPreviewUrl(canonicalPath: string): string {
      if (!/^\/(?:applications|resources)(?:\/[a-z0-9-]+)?$/u.test(canonicalPath)) {
        throw new Error('Editorial preview signing requires an exact local canonical path')
      }
      const expires = Math.floor(Date.now() / 1000) + 300
      const signature = createHmac('sha256', previewSecret)
        .update(`${expires}\ntio2-a\n${canonicalPath}`)
        .digest('hex')
      const url = new URL('/api/preview', baseUrl)
      url.search = new URLSearchParams({
        expires: String(expires),
        path: canonicalPath,
        signature,
        siteId: 'tio2-a',
      }).toString()
      return url.href
    },
    async stop(): Promise<void> {
      if (stopped) return
      stopped = true
      await cleanupOwnedRuntime(
        nextServer,
        originalTsconfig,
        releaseRuntimeLock,
      )
    },
    url(path: string): string {
      if (!/^\/[A-Za-z0-9/_-]*$/u.test(path)) {
        throw new Error('Runtime URLs require a literal local path')
      }
      const url = new URL(path, baseUrl)
      assertExplicitLocalHttpUrl(url.href, path)
      return url.href
    },
    async wordpressPreviewCacheControl(canonicalPath: string): Promise<string> {
      if (!/^\/(?:applications|resources)(?:\/[a-z0-9-]+)?$/u.test(canonicalPath)) {
        throw new Error('WordPress preview probing requires an exact canonical path')
      }
      const timestamp = String(Math.floor(Date.now() / 1000))
      const signature = createHmac('sha256', previewSecret)
        .update(`${timestamp}\ntio2-a\n${canonicalPath}`)
        .digest('hex')
      const url = new URL(wordpressPreviewUrl)
      url.search = new URLSearchParams({
        path: canonicalPath,
        siteId: 'tio2-a',
      }).toString()
      const response = await fetch(url, {
        cache: 'no-store',
        headers: {
          'x-tio2-preview-signature': signature,
          'x-tio2-preview-timestamp': timestamp,
        },
      })
      if (!response.ok) {
        throw new Error(`Real local WordPress preview returned ${response.status}`)
      }
      await response.body?.cancel()
      return response.headers.get('cache-control') ?? ''
    },
    wordpressPreviewRequestCount(): number {
      return wordpressPreviewLogLines(containerId, wordpressLogStart).length
    },
  }
}
