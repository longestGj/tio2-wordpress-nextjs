import {spawnSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'

import {afterAll, describe, expect, it} from 'vitest'

const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url))
const seedScript = fileURLToPath(
  new URL('../../../scripts/seed-local-wordpress.ps1', import.meta.url),
)
const auditScript = fileURLToPath(
  new URL('../../../scripts/audit-seed.ps1', import.meta.url),
)
const runLiveWordPress = process.env.WORDPRESS_SEED_RUNTIME === '1'

interface RuntimePage {
  id: number
  slug: string
  status: string
  publicPath: string
  siteScopes: string[]
  uriResolvable: boolean | null
  uriResolutionSource: string | null
  seoTitle: string
  seoDescription: string
}

interface RuntimeSharedFixture {
  id: number
  fixtureId: string
  slug: string
  status: string
  postType: string
  siteScopes: string[]
}

interface RuntimeSnapshot {
  pages: RuntimePage[]
  sharedFixtures: RuntimeSharedFixture[]
}

function execute(command: string, arguments_: string[], timeout = 180_000) {
  return spawnSync(command, arguments_, {
    cwd: repositoryRoot,
    encoding: 'utf8',
    timeout,
  })
}

function powershell(script: string, arguments_: string[] = []) {
  return execute('powershell.exe', [
    '-NoProfile',
    '-ExecutionPolicy',
    'Bypass',
    '-File',
    script,
    ...arguments_,
  ])
}

function wp(arguments_: string[]) {
  return execute('docker', [
    'compose',
    '--env-file',
    'wordpress/.env',
    '-f',
    'wordpress/docker-compose.yml',
    'run',
    '--rm',
    '--no-TTY',
    '--user',
    '33:33',
    'wpcli',
    'wp',
    ...arguments_,
  ])
}

function seedFullScale() {
  return powershell(seedScript, ['-ScalePages', '500'])
}

function auditFullScale() {
  return powershell(auditScript, ['-ExpectedPerSite', '505'])
}

function exportSnapshot(): RuntimeSnapshot {
  const result = wp(['eval-file', '/workspace/wordpress/seed/export-audit.php'])
  expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0)
  const match = result.stdout.match(
    /TIO2_AUDIT_JSON_BEGIN\s*([\s\S]*?)\s*TIO2_AUDIT_JSON_END/,
  )
  expect(match, result.stdout).not.toBeNull()
  return JSON.parse(match![1]) as RuntimeSnapshot
}

function readSeedSummary(stdout: string) {
  const match = stdout.match(/TIO2_SEED_SUMMARY\s+(\{.*\})/)
  expect(match, stdout).not.toBeNull()
  return JSON.parse(match![1]) as Record<string, number>
}

describe.runIf(runLiveWordPress)('WordPress seed PHP runtime', () => {
  let unrelatedPageId: number | undefined

  afterAll(() => {
    if (unrelatedPageId !== undefined) {
      wp(['post', 'delete', String(unrelatedPageId), '--force'])
    }

    const restore = seedFullScale()
    expect(restore.status, `${restore.stdout}\n${restore.stderr}`).toBe(0)
    const audit = auditFullScale()
    expect(audit.status, `${audit.stdout}\n${audit.stderr}`).toBe(0)
  }, 240_000)

  it('preserves exact managed slugs, revives trash, and remains idempotent', () => {
    const unrelatedCreate = wp([
      'post',
      'create',
      '--post_type=page',
      '--post_status=draft',
      '--post_title=Runtime unrelated slug probe',
      '--post_name=tio2-a--runtime-unrelated',
      '--porcelain',
    ])
    expect(unrelatedCreate.status, unrelatedCreate.stderr).toBe(0)
    unrelatedPageId = Number(unrelatedCreate.stdout.trim().split(/\s+/).at(-1))
    const unrelatedSlug = wp([
      'post',
      'get',
      String(unrelatedPageId),
      '--field=post_name',
    ])
    expect(unrelatedSlug.status, unrelatedSlug.stderr).toBe(0)
    expect(unrelatedSlug.stdout.trim().split(/\s+/).at(-1)).toBe(
      'tio2-a-runtime-unrelated',
    )

    const initialSeed = seedFullScale()
    expect(initialSeed.status, `${initialSeed.stdout}\n${initialSeed.stderr}`).toBe(0)
    const initialSnapshot = exportSnapshot()
    const targetBefore = initialSnapshot.pages.find(
      ({publicPath, siteScopes}) =>
        publicPath === '/test-content/long-tail-500' && siteScopes[0] === 'tio2-a',
    )
    expect(targetBefore).toMatchObject({
      slug: 'tio2-a--test-content--long-tail-500',
      status: 'publish',
      uriResolvable: true,
      uriResolutionSource: 'wpgraphql',
      seoTitle: expect.any(String),
      seoDescription: expect.stringContaining('SYNTHETIC TEST CONTENT'),
    })
    expect(initialSnapshot.pages).toHaveLength(1010)
    expect(initialSnapshot.sharedFixtures).toHaveLength(5)
    for (const fixture of initialSnapshot.sharedFixtures) {
      expect(fixture).toMatchObject({
        slug: fixture.fixtureId,
        status: 'publish',
        siteScopes: [],
      })
    }

    const trash = wp(['post', 'delete', String(targetBefore!.id)])
    expect(trash.status, `${trash.stdout}\n${trash.stderr}`).toBe(0)

    const revivalSeed = seedFullScale()
    expect(revivalSeed.status, `${revivalSeed.stdout}\n${revivalSeed.stderr}`).toBe(0)
    expect(readSeedSummary(revivalSeed.stdout)).toMatchObject({
      entities_created: 0,
      pages_created: 0,
      pages_updated: 1010,
    })
    const revivedSnapshot = exportSnapshot()
    const matchingTargets = revivedSnapshot.pages.filter(
      ({publicPath, siteScopes}) =>
        publicPath === '/test-content/long-tail-500' && siteScopes[0] === 'tio2-a',
    )
    expect(matchingTargets).toHaveLength(1)
    expect(matchingTargets[0]).toMatchObject({
      id: targetBefore!.id,
      slug: 'tio2-a--test-content--long-tail-500',
      status: 'publish',
      uriResolvable: true,
      uriResolutionSource: 'wpgraphql',
    })
    expect(revivedSnapshot.pages.some(({status}) => status === 'trash')).toBe(false)

    const secondSeed = seedFullScale()
    expect(secondSeed.status, `${secondSeed.stdout}\n${secondSeed.stderr}`).toBe(0)
    expect(readSeedSummary(secondSeed.stdout)).toMatchObject({
      entities_created: 0,
      pages_created: 0,
      pages_updated: 1010,
    })
    const secondSnapshot = exportSnapshot()
    expect(secondSnapshot.pages.map(({id}) => id).sort((a, b) => a - b)).toEqual(
      revivedSnapshot.pages.map(({id}) => id).sort((a, b) => a - b),
    )

    const audit = auditFullScale()
    expect(audit.status, `${audit.stdout}\n${audit.stderr}`).toBe(0)
  }, 240_000)
})
