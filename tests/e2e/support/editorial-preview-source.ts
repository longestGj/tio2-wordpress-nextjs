import {spawnSync} from 'node:child_process'
import {createHmac} from 'node:crypto'
import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'

import {
  assertExplicitLocalHttpUrl,
  startOwnedNextDev,
} from './owned-next-dev'

const repositoryRoot = resolve('.')
const wordpressEnvironmentPath = resolve('wordpress/.env')
const wordpressComposePath = resolve('wordpress/docker-compose.yml')
const wordpressPreviewUrl =
  'http://127.0.0.1:8080/wp-json/tio2/v1/preview'
const wordpressGraphqlUrl = 'http://127.0.0.1:8080/graphql'

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

function isExactSiteACanonicalPreviewPath(path: string): boolean {
  return (
    /^\/(?:applications|resources)(?:\/[a-z0-9-]+)?$/u.test(path) ||
    /^\/products\/tp-[a-z]{1,2}[0-9]{3}$/u.test(path)
  )
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

  const containerId = wordpressContainerId()
  const wordpressLogStart = new Date(Date.now() - 1_000).toISOString()
  const nextRuntime = await startOwnedNextDev({
    environment: {
      PREVIEW_SECRET: previewSecret,
      REVALIDATION_SECRET: revalidationSecret,
      SITE_ID: 'tio2-a',
      WORDPRESS_GRAPHQL_URL: wordpressGraphqlUrl,
      WORDPRESS_PREVIEW_SECRET: previewSecret,
      WORDPRESS_PREVIEW_URL: wordpressPreviewUrl,
    },
    runtimeId: 'editorial',
  })
  return {
    baseUrl: nextRuntime.baseUrl,
    port: nextRuntime.port,
    previewSecret,
    serverErrorsSince(offset: number): string[] {
      return nextRuntime.serverErrorsSince(offset)
    },
    serverLogOffset(): number {
      return nextRuntime.serverLogOffset()
    },
    signedPreviewUrl(canonicalPath: string): string {
      if (!isExactSiteACanonicalPreviewPath(canonicalPath)) {
        throw new Error('Site A preview signing requires an exact local canonical path')
      }
      const expires = Math.floor(Date.now() / 1000) + 300
      const signature = createHmac('sha256', previewSecret)
        .update(`${expires}\ntio2-a\n${canonicalPath}`)
        .digest('hex')
      const url = new URL('/api/preview', nextRuntime.baseUrl)
      url.search = new URLSearchParams({
        expires: String(expires),
        path: canonicalPath,
        signature,
        siteId: 'tio2-a',
      }).toString()
      return url.href
    },
    async stop(): Promise<void> {
      await nextRuntime.stop()
    },
    url(path: string): string {
      return nextRuntime.url(path)
    },
    async wordpressPreviewCacheControl(canonicalPath: string): Promise<string> {
      if (!isExactSiteACanonicalPreviewPath(canonicalPath)) {
        throw new Error('WordPress preview probing requires an exact Site A canonical path')
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
