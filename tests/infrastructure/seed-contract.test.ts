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
  sharedEntityIds: string[]
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

  it('uses the same shared records from both sites without duplicating them', () => {
    const manifest = readManifest()
    const knownEntityIds = new Set(manifest.sharedEntities.map(({id}) => id))
    const [siteA, siteB] = manifest.sites

    expect(new Set(siteA.sharedEntityIds)).toEqual(new Set(siteB.sharedEntityIds))
    expect(new Set(siteA.sharedEntityIds)).toEqual(knownEntityIds)
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
  it('builds exact deterministic page upserts for each site', () => {
    const result = runPowerShell(seedScriptPath, ['-ScalePages', '3', '-PlanOnly'])

    expect(result.status, result.stderr).toBe(0)
    const plan = JSON.parse(result.stdout) as {
      entities: Array<{id: string; postType: string; slug: string}>
      pages: Array<{
        siteId: string
        publicPath: string
        internalSlug: string
        postStatus: string
        siteScopes: string[]
        meta: Record<string, string>
      }>
    }

    expect(plan.entities).toHaveLength(5)
    expect(new Set(plan.entities.map(({slug}) => slug)).size).toBe(5)
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
        },
      })
      expect(
        sitePages.find(({publicPath}) => publicPath === '/test-content/long-tail-003'),
      ).toMatchObject({
        internalSlug: `${siteId}--test-content--long-tail-003`,
        siteScopes: [siteId],
      })
    }
  })
})

interface AuditPage {
  id: number
  slug: string
  status: string
  publicPath: string
  siteScopes: string[]
  uriResolvable: boolean
}

interface AuditSnapshot {
  pages: AuditPage[]
  sharedEntityCounts: Record<string, number>
}

const completeEntityCounts = {
  tio2_product: 1,
  tio2_grade: 1,
  tio2_application: 1,
  tio2_document: 1,
  tio2_faq: 1,
}

function validAuditSnapshot(): AuditSnapshot {
  return {
    pages: [
      {
        id: 1,
        slug: 'tio2-a--home',
        status: 'publish',
        publicPath: '/',
        siteScopes: ['tio2-a'],
        uriResolvable: true,
      },
      {
        id: 2,
        slug: 'tio2-a--products',
        status: 'publish',
        publicPath: '/products',
        siteScopes: ['tio2-a'],
        uriResolvable: true,
      },
      {
        id: 3,
        slug: 'tio2-b--home',
        status: 'publish',
        publicPath: '/',
        siteScopes: ['tio2-b'],
        uriResolvable: true,
      },
      {
        id: 4,
        slug: 'tio2-b--products',
        status: 'publish',
        publicPath: '/products',
        siteScopes: ['tio2-b'],
        uriResolvable: true,
      },
    ],
    sharedEntityCounts: {...completeEntityCounts},
  }
}

function runSnapshotAudit(snapshot: AuditSnapshot) {
  const temporaryDirectory = mkdtempSync(join(tmpdir(), 'tio2-seed-audit-'))
  const snapshotPath = join(temporaryDirectory, 'snapshot.json')
  writeFileSync(snapshotPath, JSON.stringify(snapshot))

  try {
    return runPowerShell(auditScriptPath, [
      '-ExpectedPerSite',
      '2',
      '-SnapshotPath',
      snapshotPath,
    ])
  } finally {
    rmSync(temporaryDirectory, {recursive: true, force: true})
  }
}

describe('seed audit validation', () => {
  it('accepts exact counts, unique paths, exact scopes, and every shared CPT', () => {
    const result = runSnapshotAudit(validAuditSnapshot())

    expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0)
    expect(result.stdout).toContain('tio2-a: 2 published pages')
    expect(result.stdout).toContain('tio2-b: 2 published pages')
    expect(result.stdout).toContain('Seed audit passed.')
  })

  it.each([
    {
      name: 'a duplicate site path',
      expectedMessage: 'Duplicate public path',
      mutate(snapshot: AuditSnapshot) {
        snapshot.pages[1].publicPath = '/'
        snapshot.pages[1].slug = 'tio2-a--home-copy'
      },
    },
    {
      name: 'a page with the wrong site scope',
      expectedMessage: 'scope does not match slug',
      mutate(snapshot: AuditSnapshot) {
        snapshot.pages[0].siteScopes = ['tio2-b']
      },
    },
    {
      name: 'an incorrect page count',
      expectedMessage: 'Expected 2 published pages for tio2-a, found 1',
      mutate(snapshot: AuditSnapshot) {
        snapshot.pages = snapshot.pages.filter(({id}) => id !== 2)
      },
    },
    {
      name: 'a missing shared CPT record',
      expectedMessage: 'Missing shared entity records for tio2_faq',
      mutate(snapshot: AuditSnapshot) {
        snapshot.sharedEntityCounts.tio2_faq = 0
      },
    },
    {
      name: 'an internal slug WordPress cannot resolve',
      expectedMessage: 'is not resolvable by its internal URI',
      mutate(snapshot: AuditSnapshot) {
        snapshot.pages[0].uriResolvable = false
      },
    },
  ])('rejects $name', ({mutate, expectedMessage}) => {
    const snapshot = validAuditSnapshot()
    mutate(snapshot)

    const result = runSnapshotAudit(snapshot)

    expect(result.status).not.toBe(0)
    expect(`${result.stdout}\n${result.stderr}`).toContain(expectedMessage)
  })
})
