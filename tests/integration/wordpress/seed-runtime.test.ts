import {spawnSync} from 'node:child_process'
import {fileURLToPath} from 'node:url'

import {afterAll, describe, expect, it} from 'vitest'

import {runUnconditionalRestore} from './live-seed-lifecycle'

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
  postType: 'page'
  slug: string
  status: string
  publicPath: string
  siteScopes: string[]
  uriResolvable: boolean | null
  uriResolutionSource: string | null
  seoTitle: string
  seoDescription: string
  previousRootStatus: string
  previousRootSiteScopes: string[]
  supersededSeedSnapshot: string
}

interface RuntimeSharedFixture {
  id: number
  fixtureId: string
  slug: string
  status: string
  postType: string
  siteScopes: string[]
}

interface RuntimeHomepage {
  id: number
  siteId: string
  slug: string
  status: string
  publicPath: string
  schemaVersion: string
  seedMarker: string
}

interface RuntimeSnapshot {
  routes: RuntimePage[]
  sharedFixtures: RuntimeSharedFixture[]
  homepages: RuntimeHomepage[]
  publicUrls: Array<{ownerId: number; siteId: string; path: string; ownerType: string}>
}

function execute(command: string, arguments_: string[], timeout = 180_000) {
  return spawnSync(command, arguments_, {
    cwd: repositoryRoot,
    encoding: 'utf8',
    timeout,
    maxBuffer: 10 * 1024 * 1024,
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
  let duplicatePageId: number | undefined
  let duplicateEntityId: number | undefined
  let ambiguousPageId: number | undefined

  function deleteAndVerifyAbsent(postId: number) {
    const before = wp(['post', 'get', String(postId), '--field=ID'])
    if (before.status === 0) {
      const deletion = wp(['post', 'delete', String(postId), '--force'])
      expect(deletion.status, `${deletion.stdout}\n${deletion.stderr}`).toBe(0)
    }

    const after = wp(['post', 'get', String(postId), '--field=ID'])
    expect(after.status, `Post ${postId} still exists after forced cleanup.`).not.toBe(0)
  }

  afterAll(() => {
    runUnconditionalRestore({
      cleanup: [
        () => {
          if (duplicatePageId !== undefined) deleteAndVerifyAbsent(duplicatePageId)
        },
        () => {
          if (duplicateEntityId !== undefined) deleteAndVerifyAbsent(duplicateEntityId)
        },
        () => {
          if (ambiguousPageId !== undefined) deleteAndVerifyAbsent(ambiguousPageId)
        },
        () => {
          if (unrelatedPageId !== undefined) deleteAndVerifyAbsent(unrelatedPageId)
        },
      ],
      restore: () => {
        const restore = seedFullScale()
        expect(restore.status, `${restore.stdout}\n${restore.stderr}`).toBe(0)
      },
      audit: () => {
        const audit = auditFullScale()
        expect(audit.status, `${audit.stdout}\n${audit.stderr}`).toBe(0)
      },
    })
  }, 360_000)

  it('cleans proven collisions, revives the canonical record, and remains idempotent', () => {
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
    const targetBefore = initialSnapshot.routes.find(
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
    expect(
      initialSnapshot.routes.filter(
        ({status, supersededSeedSnapshot}) =>
          status !== 'trash' && supersededSeedSnapshot === '',
      ),
    ).toHaveLength(1010)
    expect(initialSnapshot.homepages).toHaveLength(2)
    expect(initialSnapshot.publicUrls).toHaveLength(1010)
    for (const siteId of ['tio2-a', 'tio2-b']) {
      expect(
        initialSnapshot.publicUrls.filter((entry) => entry.siteId === siteId),
      ).toHaveLength(505)
      expect(initialSnapshot.homepages.find((entry) => entry.siteId === siteId)).toMatchObject({
        status: 'publish',
        publicPath: '/',
        schemaVersion: 'homepage-v0.1',
        seedMarker: siteId,
      })
    }
    expect(initialSnapshot.sharedFixtures).toHaveLength(5)
    for (const fixture of initialSnapshot.sharedFixtures) {
      expect(fixture).toMatchObject({
        slug: fixture.fixtureId,
        status: 'publish',
        siteScopes: [],
      })
    }
    const productBefore = initialSnapshot.sharedFixtures.find(
      ({fixtureId}) => fixtureId === 'test-product-reference',
    )!

    for (const siteId of ['tio2-a', 'tio2-b']) {
      const homepage = initialSnapshot.homepages.find((entry) => entry.siteId === siteId)!
      const rootPage = initialSnapshot.routes.find(
        ({publicPath, previousRootSiteScopes}) =>
          publicPath === '/' && previousRootSiteScopes.includes(siteId),
      )!
      expect(rootPage).toMatchObject({
        status: 'draft',
        siteScopes: [],
        previousRootStatus: 'publish',
        previousRootSiteScopes: [siteId],
      })
      const previousStatus = wp([
        'post',
        'meta',
        'get',
        String(rootPage.id),
        '_tio2_previous_root_status',
      ])
      expect(previousStatus.status, previousStatus.stderr).toBe(0)
      expect(previousStatus.stdout.trim().split(/\s+/).at(-1)).toBe('publish')
      const previousScope = wp([
        'post',
        'meta',
        'get',
        String(rootPage.id),
        '_tio2_previous_root_site_scope',
      ])
      expect(previousScope.status, previousScope.stderr).toBe(0)
      expect(previousScope.stdout).toContain(siteId)

      const draftHomepage = wp([
        'post',
        'update',
        String(homepage.id),
        '--post_status=draft',
      ])
      expect(draftHomepage.status, draftHomepage.stderr).toBe(0)
      const restoreScope = wp([
        'post',
        'term',
        'set',
        String(rootPage.id),
        'site_scope',
        siteId,
        '--by=slug',
      ])
      expect(restoreScope.status, restoreScope.stderr).toBe(0)
      const restoreStatus = wp([
        'post',
        'update',
        String(rootPage.id),
        '--post_status=publish',
      ])
      expect(restoreStatus.status, restoreStatus.stderr).toBe(0)
    }
    const rolledBackSnapshot = exportSnapshot()
    expect(rolledBackSnapshot.homepages.every(({status}) => status === 'draft')).toBe(true)
    expect(
      rolledBackSnapshot.routes.filter(
        ({publicPath, status, siteScopes}) =>
          publicPath === '/' && status === 'publish' && siteScopes.length === 1,
      ),
    ).toHaveLength(2)
    const reapplyMigration = seedFullScale()
    expect(reapplyMigration.status, `${reapplyMigration.stdout}\n${reapplyMigration.stderr}`).toBe(0)
    expect(readSeedSummary(reapplyMigration.stdout)).toMatchObject({
      homepages_created: 0,
      homepages_updated: 2,
      root_pages_drafted: 2,
    })
    expect(auditFullScale().status).toBe(0)

    const trash = wp(['post', 'delete', String(targetBefore!.id)])
    expect(trash.status, `${trash.stdout}\n${trash.stderr}`).toBe(0)

    const duplicatePageCreate = wp([
      'post',
      'create',
      '--post_type=page',
      '--post_status=publish',
      '--post_title=SYNTHETIC TEST CONTENT runtime managed page duplicate',
      '--post_content=SYNTHETIC TEST CONTENT controlled collision fixture',
      '--post_name=runtime-managed-page-duplicate',
      '--porcelain',
    ])
    expect(duplicatePageCreate.status, duplicatePageCreate.stderr).toBe(0)
    duplicatePageId = Number(duplicatePageCreate.stdout.trim().split(/\s+/).at(-1))
    for (const [metaKey, metaValue] of [
      ['_tio2_seed_internal_slug', 'tio2-a--test-content--long-tail-500'],
      ['public_path', '/test-content/long-tail-500'],
      ['seo_title', 'Synthetic collision SEO title'],
      ['seo_description', 'SYNTHETIC TEST CONTENT collision SEO description'],
    ]) {
      const metaUpdate = wp([
        'post',
        'meta',
        'update',
        String(duplicatePageId),
        metaKey,
        metaValue,
      ])
      expect(metaUpdate.status, `${metaUpdate.stdout}\n${metaUpdate.stderr}`).toBe(0)
    }
    const duplicatePageScope = wp([
      'post',
      'term',
      'set',
      String(duplicatePageId),
      'site_scope',
      'tio2-a',
      '--by=slug',
    ])
    expect(
      duplicatePageScope.status,
      `${duplicatePageScope.stdout}\n${duplicatePageScope.stderr}`,
    ).toBe(0)

    const duplicateEntityCreate = wp([
      'post',
      'create',
      '--post_type=tio2_product',
      '--post_status=publish',
      '--post_title=SYNTHETIC TEST CONTENT runtime shared duplicate',
      '--post_content=SYNTHETIC TEST CONTENT controlled shared collision fixture',
      '--post_name=runtime-managed-entity-duplicate',
      '--porcelain',
    ])
    expect(duplicateEntityCreate.status, duplicateEntityCreate.stderr).toBe(0)
    duplicateEntityId = Number(
      duplicateEntityCreate.stdout.trim().split(/\s+/).at(-1),
    )
    const duplicateEntityMarker = wp([
      'post',
      'meta',
      'update',
      String(duplicateEntityId),
      '_tio2_seed_fixture_id',
      'test-product-reference',
    ])
    expect(
      duplicateEntityMarker.status,
      `${duplicateEntityMarker.stdout}\n${duplicateEntityMarker.stderr}`,
    ).toBe(0)

    const revivalSeed = seedFullScale()
    expect(revivalSeed.status, `${revivalSeed.stdout}\n${revivalSeed.stderr}`).toBe(0)
    expect(readSeedSummary(revivalSeed.stdout)).toMatchObject({
      entities_created: 0,
      pages_created: 0,
      pages_updated: 1010,
      pages_revived: 1,
      pages_duplicates_deleted: 1,
      entities_duplicates_deleted: 1,
    })
    const revivedSnapshot = exportSnapshot()
    const matchingTargets = revivedSnapshot.routes.filter(
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
    expect(
      revivedSnapshot.routes.some(
        ({publicPath, status, siteScopes}) =>
          publicPath === '/test-content/long-tail-500' &&
          siteScopes[0] === 'tio2-a' &&
          status === 'trash',
      ),
    ).toBe(false)
    expect(
      revivedSnapshot.sharedFixtures.find(
        ({fixtureId}) => fixtureId === 'test-product-reference',
      ),
    ).toMatchObject({id: productBefore.id})
    expect(wp(['post', 'get', String(duplicatePageId), '--field=ID']).status).not.toBe(0)
    expect(wp(['post', 'get', String(duplicateEntityId), '--field=ID']).status).not.toBe(0)

    const ambiguousCreate = wp([
      'post',
      'create',
      '--post_type=page',
      '--post_status=publish',
      '--post_title=Unrelated ambiguous collision probe',
      '--post_content=This record is deliberately not marked as managed seed content.',
      '--post_name=unrelated-ambiguous-collision',
      '--porcelain',
    ])
    expect(ambiguousCreate.status, ambiguousCreate.stderr).toBe(0)
    ambiguousPageId = Number(ambiguousCreate.stdout.trim().split(/\s+/).at(-1))
    const ambiguousPath = wp([
      'post',
      'meta',
      'update',
      String(ambiguousPageId),
      'public_path',
      '/test-content/long-tail-500',
    ])
    expect(ambiguousPath.status, `${ambiguousPath.stdout}\n${ambiguousPath.stderr}`).toBe(0)
    const ambiguousScope = wp([
      'post',
      'term',
      'set',
      String(ambiguousPageId),
      'site_scope',
      'tio2-a',
      '--by=slug',
    ])
    expect(
      ambiguousScope.status,
      `${ambiguousScope.stdout}\n${ambiguousScope.stderr}`,
    ).toBe(0)

    const ambiguousSeed = seedFullScale()
    expect(ambiguousSeed.status).not.toBe(0)
    expect(`${ambiguousSeed.stdout}\n${ambiguousSeed.stderr}`).toContain(
      'Cannot safely reconcile unproven managed collision',
    )
    expect(wp(['post', 'get', String(ambiguousPageId), '--field=ID']).status).toBe(0)
    deleteAndVerifyAbsent(ambiguousPageId)
    ambiguousPageId = undefined

    const secondSeed = seedFullScale()
    expect(secondSeed.status, `${secondSeed.stdout}\n${secondSeed.stderr}`).toBe(0)
    expect(readSeedSummary(secondSeed.stdout)).toMatchObject({
      entities_created: 0,
      pages_created: 0,
      pages_updated: 1010,
      pages_duplicates_deleted: 0,
      entities_duplicates_deleted: 0,
    })
    const secondSnapshot = exportSnapshot()
    expect(secondSnapshot.routes.map(({id}) => id).sort((a, b) => a - b)).toEqual(
      revivedSnapshot.routes.map(({id}) => id).sort((a, b) => a - b),
    )

    const audit = auditFullScale()
    expect(audit.status, `${audit.stdout}\n${audit.stderr}`).toBe(0)
  }, 360_000)
})
