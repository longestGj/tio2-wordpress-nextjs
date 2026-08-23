import {spawnSync} from 'node:child_process'
import {mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'

import {describe, expect, it} from 'vitest'

import {buildInternalSlug} from '@/lib/wordpress/dto'

const manifestPath = fileURLToPath(
  new URL('../../wordpress/seed/representative-content.json', import.meta.url),
)
const seedScriptPath = fileURLToPath(
  new URL('../../scripts/seed-local-wordpress.ps1', import.meta.url),
)
const auditScriptPath = fileURLToPath(
  new URL('../../scripts/audit-seed.ps1', import.meta.url),
)
const exportAuditPath = fileURLToPath(
  new URL('../../wordpress/seed/export-audit.php', import.meta.url),
)

interface SharedEntity {
  id: string
  postType: string
  title: string
  content: string
  technicalSummary: string
  evidenceSourceUrl: string
}

interface RepresentativePage {
  publicPath: string
  title: string
  content: string
  seoTitle: string
  seoDescription: string
}

interface SiteSeed {
  siteId: string
  pages: RepresentativePage[]
}

interface SeedManifest {
  contentNotice: string
  sharedEntities: SharedEntity[]
  sites: SiteSeed[]
}

function readManifest(): SeedManifest {
  return JSON.parse(readFileSync(manifestPath, 'utf8')) as SeedManifest
}

function runPowerShell(scriptPath: string, arguments_: string[]) {
  return spawnSync(
    'powershell.exe',
    ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', scriptPath, ...arguments_],
    {encoding: 'utf8'},
  )
}

describe('representative WordPress seed manifest', () => {
  it('contains every shared entity type exactly once by stable ID', () => {
    const manifest = readManifest()
    const requiredPostTypes = [
      'tio2_product',
      'tio2_grade',
      'tio2_application',
      'tio2_document',
      'tio2_faq',
    ]

    expect(new Set(manifest.sharedEntities.map(({id}) => id)).size).toBe(
      manifest.sharedEntities.length,
    )
    expect(new Set(manifest.sharedEntities.map(({postType}) => postType))).toEqual(
      new Set(requiredPostTypes),
    )
  })

  it('contains both sites with all five core public paths and no duplicate path', () => {
    const manifest = readManifest()
    const requiredPaths = ['/', '/products', '/applications', '/about', '/contact']
    const pageKeys = manifest.sites.flatMap(({siteId, pages}) =>
      pages.map(({publicPath}) => `${siteId}:${publicPath}`),
    )

    expect(new Set(manifest.sites.map(({siteId}) => siteId))).toEqual(
      new Set(['tio2-a', 'tio2-b']),
    )
    expect(new Set(pageKeys).size).toBe(pageKeys.length)

    for (const site of manifest.sites) {
      expect(new Set(site.pages.map(({publicPath}) => publicPath))).toEqual(
        new Set(requiredPaths),
      )
    }
  })

  it('keeps optional CPT fixtures independent from both site page sets', () => {
    const manifest = readManifest()

    for (const site of manifest.sites) {
      expect(site).not.toHaveProperty('sharedEntityIds')
      expect(site.pages.map(({content}) => content).join(' ')).not.toContain(
        'shared test entities',
      )
    }
  })

  it('labels all facts and publishing copy as synthetic test content', () => {
    const manifest = readManifest()

    expect(manifest.contentNotice).toContain('SYNTHETIC TEST CONTENT')
    for (const entity of manifest.sharedEntities) {
      expect(`${entity.content} ${entity.technicalSummary}`).toContain(
        'SYNTHETIC TEST CONTENT',
      )
      expect(entity.evidenceSourceUrl).toBe('https://example.test/synthetic-only')
    }
    for (const site of manifest.sites) {
      for (const page of site.pages) {
        expect(`${page.content} ${page.seoDescription}`).toContain(
          'SYNTHETIC TEST CONTENT',
        )
      }
    }
  })

  it('derives Task 4-compatible deterministic internal slugs for every page', () => {
    const manifest = readManifest()

    expect(buildInternalSlug('tio2-a', '/')).toBe('tio2-a--home')
    for (const site of manifest.sites) {
      for (const page of site.pages) {
        const expectedPathSlug =
          page.publicPath === '/'
            ? 'home'
            : page.publicPath.slice(1).replaceAll('/', '--')
        expect(buildInternalSlug(site.siteId, page.publicPath)).toBe(
          `${site.siteId}--${expectedPathSlug}`,
        )
      }
    }
  })
})

describe('seed execution plan', () => {
  it('supports bounded migration failure injection for rollback verification', () => {
    for (const failurePoint of [
      'begin-failure',
      'before-homepage-write',
      'root-metadata-readback-failure',
      'after-root-release',
      'commit-failure',
    ]) {
      const result = runPowerShell(seedScriptPath, [
        '-ScalePages',
        '3',
        '-PlanOnly',
        '-FailurePoint',
        failurePoint,
      ])
      expect(result.status, result.stderr).toBe(0)
      expect(JSON.parse(result.stdout)).toMatchObject({failurePoint})
    }
  })

  it('builds exact deterministic page upserts for each site', () => {
    const result = runPowerShell(seedScriptPath, ['-ScalePages', '3', '-PlanOnly'])

    expect(result.status, result.stderr).toBe(0)
    const plan = JSON.parse(result.stdout) as {
      entities: Array<{
        id: string
        postType: string
        slug: string
        meta: Record<string, string>
      }>
      pages: Array<{
        siteId: string
        publicPath: string
        internalSlug: string
        postStatus: string
        title: string
        content: string
        siteScopes: string[]
        meta: Record<string, string>
      }>
    }

    expect(plan.entities).toHaveLength(5)
    expect(new Set(plan.entities.map(({slug}) => slug)).size).toBe(5)
    for (const entity of plan.entities) {
      expect(entity.meta._tio2_seed_fixture_id).toBe(entity.id)
    }
    expect(plan.pages).toHaveLength(16)

    for (const siteId of ['tio2-a', 'tio2-b']) {
      const sitePages = plan.pages.filter((page) => page.siteId === siteId)
      expect(sitePages).toHaveLength(8)
      expect(sitePages.filter(({publicPath}) => publicPath.startsWith('/test-content/')))
        .toHaveLength(3)
      expect(sitePages.find(({publicPath}) => publicPath === '/')).toMatchObject({
        internalSlug: `${siteId}--home`,
        postStatus: 'publish',
        siteScopes: [siteId],
        meta: {
          public_path: '/',
          seo_title: expect.any(String),
          seo_description: expect.stringContaining('SYNTHETIC TEST CONTENT'),
          _tio2_seed_internal_slug: `${siteId}--home`,
        },
      })
      expect(
        sitePages.find(({publicPath}) => publicPath === '/test-content/long-tail-003'),
      ).toMatchObject({
        internalSlug: `${siteId}--test-content--long-tail-003`,
        title: 'Masterbatch',
        content: expect.stringContaining('masterbatch'),
        siteScopes: [siteId],
      })
      expect(sitePages.find(({publicPath}) => publicPath === '/test-content/long-tail-001'))
        .toMatchObject({title: siteId === 'tio2-a' ? 'Formulator route' : 'Site B buyer route'})
      expect(sitePages.find(({publicPath}) => publicPath === '/test-content/long-tail-002'))
        .toMatchObject({title: 'Plastics'})
    }
  })
})

interface AuditPage {
  id: number
  postType: 'page' | 'post'
  slug: string
  status: string
  publicPath: string
  siteScopes: string[]
  uriResolvable: boolean | null
  uriResolutionSource: 'wpgraphql' | null
  previousRootStatus: string
  previousRootSiteScopes: string[]
  seedMarker: string
  supersededSeedSnapshot: string
}

interface AuditHomepage {
  id: number
  siteId: string | null
  slug: string
  status: string
  publicPath: '/'
  schemaVersion: string
  seedMarker: string
  siteScopes: string[]
  error: string
  uriResolvable: boolean
  uriResolutionSource: 'wpgraphql'
}

interface AuditPublicUrl {
  ownerId: number
  ownerType: 'page' | 'post' | 'homepage'
  siteId: string
  path: string
  slug: string
  siteScopes: string[]
  uriResolvable: boolean
  uriResolutionSource: 'wpgraphql'
}

interface AuditSharedFixture {
  id: number
  fixtureId: string
  slug: string
  status: string
  postType: string
  siteScopes: string[]
}

interface AuditSnapshot {
  routes: AuditPage[]
  homepages: AuditHomepage[]
  publicUrls: AuditPublicUrl[]
  sharedFixtures: AuditSharedFixture[]
}

const sharedFixtureTypes = {
  'test-product-reference': 'tio2_product',
  'test-grade-reference': 'tio2_grade',
  'test-application-reference': 'tio2_application',
  'test-document-reference': 'tio2_document',
  'test-faq-reference': 'tio2_faq',
} as const

const corePaths = ['/', '/products', '/applications', '/about', '/contact']

function validAuditSnapshot(scalePages = 0): AuditSnapshot {
  let pageId = 1
  const pages = ['tio2-a', 'tio2-b'].flatMap((siteId) => {
    const scalePaths = Array.from(
      {length: scalePages},
      (_, index) => `/test-content/long-tail-${String(index + 1).padStart(3, '0')}`,
    )

    return [...corePaths, ...scalePaths].map((publicPath) => ({
      id: pageId++,
      postType: 'page' as const,
      slug: buildInternalSlug(siteId, publicPath),
      status: publicPath === '/' ? 'draft' : 'publish',
      publicPath,
      siteScopes: publicPath === '/' ? [] : [siteId],
      uriResolvable: publicPath === '/' ? null : true,
      uriResolutionSource: publicPath === '/' ? null : 'wpgraphql' as const,
      previousRootStatus: publicPath === '/' ? 'publish' : '',
      previousRootSiteScopes: publicPath === '/' ? [siteId] : [],
      seedMarker: buildInternalSlug(siteId, publicPath),
      supersededSeedSnapshot: '',
    }))
  })

  const homepages = ['tio2-a', 'tio2-b'].map((siteId, index) => ({
    id: 1000 + index,
    siteId,
    slug: `${siteId}--homepage`,
    status: 'publish',
    publicPath: '/' as const,
    schemaVersion: 'homepage-v0.1' as const,
    seedMarker: siteId,
    siteScopes: [siteId],
    error: '',
    uriResolvable: true,
    uriResolutionSource: 'wpgraphql' as const,
  }))
  const publicUrls: AuditPublicUrl[] = [
    ...pages.filter(({status}) => status === 'publish').map((page) => ({
      ownerId: page.id,
      ownerType: page.postType,
      siteId: page.siteScopes[0],
      path: page.publicPath,
      slug: page.slug,
      siteScopes: page.siteScopes,
      uriResolvable: true,
      uriResolutionSource: 'wpgraphql' as const,
    })),
    ...homepages.map((homepage) => ({
      ownerId: homepage.id,
      ownerType: 'homepage' as const,
      siteId: homepage.siteId,
      path: '/',
      slug: homepage.slug,
      siteScopes: [homepage.siteId],
      uriResolvable: true,
      uriResolutionSource: 'wpgraphql' as const,
    })),
  ]

  return {
    routes: pages.map((route) => ({
      ...route,
      siteScopes: [...route.siteScopes],
      previousRootSiteScopes: [...route.previousRootSiteScopes],
    })),
    homepages,
    publicUrls,
    sharedFixtures: Object.entries(sharedFixtureTypes).map(
      ([fixtureId, postType], index) => ({
        id: 100 + index,
        fixtureId,
        slug: fixtureId,
        status: 'publish',
        postType,
        siteScopes: [],
      }),
    ),
  }
}

function runSnapshotAudit(snapshot: AuditSnapshot, expectedPerSite = 5) {
  const temporaryDirectory = mkdtempSync(join(tmpdir(), 'tio2-seed-audit-'))
  const snapshotPath = join(temporaryDirectory, 'snapshot.json')
  writeFileSync(snapshotPath, JSON.stringify(snapshot))

  try {
    return runPowerShell(auditScriptPath, [
      '-ExpectedPerSite',
      String(expectedPerSite),
      '-SnapshotPath',
      snapshotPath,
    ])
  } finally {
    rmSync(temporaryDirectory, {recursive: true, force: true})
  }
}

describe('seed audit validation', () => {
  it('exports every homepage record without a status-filtered WordPress query', () => {
    const source = readFileSync(exportAuditPath, 'utf8')

    expect(source).toMatch(
      /\$wpdb->get_col\(\s*"SELECT ID FROM \{\$wpdb->posts\} WHERE post_type = 'tio2_homepage' ORDER BY ID ASC"/,
    )
  })

  it('accepts the exact five core paths and intended shared fixtures', () => {
    const result = runSnapshotAudit(validAuditSnapshot())

    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0)
    expect(result.stdout).toContain('tio2-a: 5 public URLs')
    expect(result.stdout).toContain('tio2-b: 5 public URLs')
    expect(result.stdout).toContain('Seed audit passed.')
  })

  it('accepts only the exact generalized deterministic scale path set', () => {
    const result = runSnapshotAudit(validAuditSnapshot(2), 7)

    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0)
    expect(result.stdout).toContain('tio2-a: 7 public URLs')
    expect(result.stdout).toContain('tio2-b: 7 public URLs')
  })

  it('accepts an exact released duplicate homepage record', () => {
    const snapshot = validAuditSnapshot()
    snapshot.homepages.push({
      id: 2000,
      siteId: null,
      slug: 'homepage-duplicate-2000',
      status: 'draft',
      publicPath: '/',
      schemaVersion: 'homepage-v0.1',
      seedMarker: '',
      siteScopes: [],
      error: 'tio2_homepage_duplicate',
      uriResolvable: false,
      uriResolutionSource: 'wpgraphql',
    })

    const result = runSnapshotAudit(snapshot)

    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0)
  })

  it.each([
    {
      name: 'a retained root Page with a changed slug',
      expectedMessage: 'Invalid retained root Page migration snapshot',
      mutate(snapshot: AuditSnapshot) {
        snapshot.routes[0].slug = 'tio2-a-home'
      },
    },
    {
      name: 'a Post substituted for a required non-root Page owner',
      expectedMessage: 'must be owned by a Page',
      mutate(snapshot: AuditSnapshot) {
        snapshot.routes[1].postType = 'post'
        snapshot.publicUrls.find(({ownerId}) => ownerId === snapshot.routes[1].id)!.ownerType = 'post'
      },
    },
    {
      name: 'an invalid extra homepage identity',
      expectedMessage: 'Invalid homepage inventory record',
      mutate(snapshot: AuditSnapshot) {
        snapshot.homepages.push({
          id: 2001,
          siteId: null,
          slug: 'unclaimed-homepage',
          status: 'auto-draft',
          publicPath: '/',
          schemaVersion: '',
          seedMarker: '',
          siteScopes: [],
          error: '',
          uriResolvable: false,
          uriResolutionSource: 'wpgraphql',
        })
      },
    },
    {
      name: 'a homepage whose GraphQL contract does not resolve',
      expectedMessage: 'Homepage GraphQL contract did not resolve',
      mutate(snapshot: AuditSnapshot) {
        snapshot.homepages[0].uriResolvable = false
      },
    },
    {
      name: 'an arbitrary nonempty superseded snapshot',
      expectedMessage: 'Invalid superseded seed snapshot',
      mutate(snapshot: AuditSnapshot) {
        snapshot.routes.push({
          ...snapshot.routes[1],
          id: 2999,
          status: 'draft',
          slug: 'tio2-a--obsolete',
          publicPath: '/obsolete',
          seedMarker: 'tio2-a--obsolete',
          uriResolvable: null,
          uriResolutionSource: null,
          supersededSeedSnapshot: '{}',
        })
      },
    },
    {
      name: 'a duplicate site path',
      expectedMessage: 'Duplicate public path',
      mutate(snapshot: AuditSnapshot) {
        const duplicate = {...snapshot.routes[1], id: 999}
        snapshot.routes.push(duplicate)
        snapshot.publicUrls.push({...snapshot.publicUrls.find(({ownerId}) => ownerId === snapshot.routes[1].id)!, ownerId: 999})
      },
    },
    {
      name: 'a page with the wrong site scope',
      expectedMessage: 'scope/path/slug does not match',
      mutate(snapshot: AuditSnapshot) {
        snapshot.routes[1].siteScopes = ['tio2-b']
        snapshot.publicUrls.find(({ownerId}) => ownerId === snapshot.routes[1].id)!.siteScopes = ['tio2-b']
      },
    },
    {
      name: 'an incorrect page count',
      expectedMessage: 'Expected 5 public URLs for tio2-a, found 4',
      mutate(snapshot: AuditSnapshot) {
        snapshot.publicUrls = snapshot.publicUrls.filter(({ownerId}) => ownerId !== 2)
      },
    },
    {
      name: 'a missing intended shared fixture',
      expectedMessage: 'Expected exactly one shared fixture test-faq-reference, found 0',
      mutate(snapshot: AuditSnapshot) {
        snapshot.sharedFixtures = snapshot.sharedFixtures.filter(
          ({fixtureId}) => fixtureId !== 'test-faq-reference',
        )
        snapshot.sharedFixtures.push({
          id: 999,
          fixtureId: 'unrelated-faq',
          slug: 'unrelated-faq',
          status: 'publish',
          postType: 'tio2_faq',
          siteScopes: [],
        })
      },
    },
    {
      name: 'a shared fixture assigned to a site',
      expectedMessage: 'Shared fixture test-product-reference must have no site_scope',
      mutate(snapshot: AuditSnapshot) {
        snapshot.sharedFixtures[0].siteScopes = ['tio2-a']
      },
    },
    {
      name: 'a shared fixture with the wrong CPT',
      expectedMessage: 'Shared fixture test-product-reference has post type tio2_faq',
      mutate(snapshot: AuditSnapshot) {
        snapshot.sharedFixtures[0].postType = 'tio2_faq'
      },
    },
    {
      name: 'an internal slug WPGraphQL cannot resolve',
      expectedMessage: 'is not resolvable through WPGraphQL URI',
      mutate(snapshot: AuditSnapshot) {
        snapshot.routes[1].uriResolvable = false
        snapshot.publicUrls.find(({ownerId}) => ownerId === snapshot.routes[1].id)!.uriResolvable = false
      },
    },
    {
      name: 'a trashed managed fixture',
      expectedMessage: 'Managed route 2 must be published; found trash',
      mutate(snapshot: AuditSnapshot) {
        snapshot.routes[1].status = 'trash'
        snapshot.routes[1].uriResolvable = null
        snapshot.routes[1].uriResolutionSource = null
      },
    },
    {
      name: 'an arbitrary substitute for a core path',
      expectedMessage: 'Unexpected published path for tio2-a: /arbitrary',
      mutate(snapshot: AuditSnapshot) {
        snapshot.routes[4].publicPath = '/arbitrary'
        snapshot.routes[4].slug = 'tio2-a--arbitrary'
        const publicUrl = snapshot.publicUrls.find(({ownerId}) => ownerId === snapshot.routes[4].id)!
        publicUrl.path = '/arbitrary'
        publicUrl.slug = 'tio2-a--arbitrary'
      },
    },
  ])('rejects $name', ({mutate, expectedMessage}) => {
    const snapshot = validAuditSnapshot()
    mutate(snapshot)

    const result = runSnapshotAudit(snapshot)

    expect(result.status).not.toBe(0)
    expect(`${result.stdout}\n${result.stderr}`).toContain(expectedMessage)
  })

  it('rejects an arbitrary substitute for a deterministic scale path', () => {
    const snapshot = validAuditSnapshot(2)
    const scalePage = snapshot.routes.find(
      ({publicPath, siteScopes}) =>
        publicPath === '/test-content/long-tail-002' && siteScopes[0] === 'tio2-a',
    )!
    scalePage.publicPath = '/test-content/arbitrary'
    scalePage.slug = 'tio2-a--test-content--arbitrary'
    const scalePublicUrl = snapshot.publicUrls.find(({ownerId}) => ownerId === scalePage.id)!
    scalePublicUrl.path = scalePage.publicPath
    scalePublicUrl.slug = scalePage.slug

    const result = runSnapshotAudit(snapshot, 7)

    expect(result.status).not.toBe(0)
    expect(`${result.stdout}\n${result.stderr}`).toContain(
      'Missing expected published path for tio2-a: /test-content/long-tail-002',
    )
    expect(`${result.stdout}\n${result.stderr}`).toContain(
      'Unexpected published path for tio2-a: /test-content/arbitrary',
    )
  })
})
