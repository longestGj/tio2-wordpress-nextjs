import {wordpressComposeArgs} from '../../helpers/wordpress-compose'
import {spawnSync} from 'node:child_process'
import {existsSync} from 'node:fs'
import {fileURLToPath} from 'node:url'
import {beforeAll, describe, expect, it} from 'vitest'

const repositoryRoot = fileURLToPath(new URL('../../../', import.meta.url))
const wordpressEnvironmentPath = `${repositoryRoot}wordpress/.env`
const runLiveWordPress =
  process.env.WORDPRESS_SITE_A_EDITORIAL_PHASE1_PREVIEW_RUNTIME === '1'

export const WORDPRESS_RUNTIME_MODE = {dataMode: 'shared-read-only', hostHttp: false} as const
const marker = 'TIO2_SITE_A_EDITORIAL_PHASE1_PREVIEW'

interface PreviewTarget {
  readonly field: 'applicationFields' | 'resourceFields'
  readonly id: string
  readonly idField: 'applicationId' | 'resourceId'
  readonly path: string
  readonly relationships: Readonly<Record<string, 'application' | 'resource'>>
  readonly slug: string
}

const targets: readonly PreviewTarget[] = [
  {
    field: 'applicationFields',
    id: 'applications-hub',
    idField: 'applicationId',
    path: '/applications',
    relationships: {
      childApplications: 'application',
      relatedApplications: 'application',
      relatedResources: 'resource',
    },
    slug: 'applications',
  },
  {
    field: 'applicationFields',
    id: 'coatings',
    idField: 'applicationId',
    path: '/applications/coatings',
    relationships: {
      childApplications: 'application',
      relatedApplications: 'application',
      relatedResources: 'resource',
    },
    slug: 'coatings',
  },
  {
    field: 'applicationFields',
    id: 'water-based-paint',
    idField: 'applicationId',
    path: '/applications/titanium-dioxide-for-water-based-paint',
    relationships: {
      childApplications: 'application',
      relatedApplications: 'application',
      relatedResources: 'resource',
    },
    slug: 'titanium-dioxide-for-water-based-paint',
  },
  {
    field: 'resourceFields',
    id: 'resources-hub',
    idField: 'resourceId',
    path: '/resources',
    relationships: {
      childResources: 'resource',
      relatedApplications: 'application',
      relatedResources: 'resource',
    },
    slug: 'resources',
  },
  {
    field: 'resourceFields',
    id: 'article-06',
    idField: 'resourceId',
    path: '/resources/titanium-dioxide-surface-treatment',
    relationships: {
      childResources: 'resource',
      relatedApplications: 'application',
      relatedResources: 'resource',
    },
    slug: 'titanium-dioxide-surface-treatment',
  },
] as const

interface SnapshotResponse {
  readonly data: Record<string, unknown>
  readonly headers: Record<string, string>
  readonly status: number
}

interface Snapshot {
  readonly closed: readonly SnapshotResponse[]
  readonly targets: Readonly<Record<string, SnapshotResponse>>
}

function collectSnapshot(): Snapshot {
  const result = spawnSync(
    'docker',
    [
      ...wordpressComposeArgs({...WORDPRESS_RUNTIME_MODE, runId: 'site-a-editorial-phase1-preview-runtime'}),
      'run',
      '--rm',
      '--no-deps',
      '--no-TTY',
      '--user',
      '33:33',
      'wpcli',
      'wp',
      'eval-file',
      '/workspace/tests/infrastructure/php/site-a-editorial-phase1-preview.php',
    ],
    {
      cwd: repositoryRoot,
      encoding: 'utf8',
      maxBuffer: 5 * 1024 * 1024,
      timeout: 180_000,
    },
  )
  expect(result.error).toBeUndefined()
  expect(result.status, `${result.stdout}\n${result.stderr}`).toBe(0)
  const match = result.stdout.match(
    new RegExp(`${marker} (\\{.*\\})`, 'u'),
  )
  expect(match, result.stdout).not.toBeNull()
  return JSON.parse(match![1]) as Snapshot
}

describe.runIf(
  runLiveWordPress && existsSync(wordpressEnvironmentPath),
)('real Phase 1 Site A editorial protected previews', () => {
  let snapshot: Snapshot

  beforeAll(() => {
    snapshot = collectSnapshot()
  }, 180_000)

  it.each(targets)(
    'serializes $id through the signed read-only WordPress preview boundary',
    (target) => {
      const response = snapshot.targets[target.path]

      expect(response?.status, JSON.stringify(response?.data)).toBe(200)
      const cacheControl = Object.entries(response.headers).find(
        ([name]) => name.toLowerCase() === 'cache-control',
      )?.[1]
      expect(
        (cacheControl ?? '')
          .split(',')
          .map((directive) => directive.trim().toLowerCase()),
      ).toContain('no-store')

      const payload = response.data
      expect(payload).toMatchObject({
        path: target.path,
        siteId: 'tio2-a',
        slug: target.slug,
        status: 'draft',
      })
      const fields = payload[target.field] as Record<string, unknown>
      expect(fields[target.idField]).toBe(target.id)
      expect(fields.relatedProducts).toEqual([])

      for (const [field, targetType] of Object.entries(target.relationships)) {
        const links = fields[field] as Array<Record<string, unknown>>
        expect(Array.isArray(links)).toBe(true)
        for (const link of links) {
          expect(link).toMatchObject({href: null, targetType})
          expect(link.targetKey).toEqual(expect.any(String))
          expect(link.path).toMatch(/^\/(?:applications|resources)(?:\/|$)/u)
        }
      }

      expect(JSON.stringify(payload)).not.toMatch(
        /(?:rawAcf|sourcePath|evidenceUrl|tdsUrl|attachmentId)/u,
      )
    },
  )

  it('keeps Site B on its generic preview contract and unknown Site A inventory requests closed', () => {
    const [siteB, unknownPath] = snapshot.closed

    expect(siteB?.status).toBe(200)
    expect(siteB?.data).toMatchObject({siteId: 'tio2-b'})
    expect(siteB?.data).not.toHaveProperty('applicationFields')
    expect(siteB?.data).not.toHaveProperty('resourceFields')
    expect(unknownPath?.status).toBe(404)
  })
})
