import {execFileSync} from 'node:child_process'
import {createHash} from 'node:crypto'
import {readFileSync} from 'node:fs'

import {describe, expect, it} from 'vitest'

type SurfaceObject = {
  id: string
  name: string
  path: string
  expectedStatus: number
}

type Surface = {
  schemaVersion: string
  siteId: string
  website: string
  cms: string
  ports: Record<string, string>
  objects: SurfaceObject[]
}

type MigrationManifest = {
  schemaVersion: string
  siteId: string
  seeds: Array<{path: string; sha256: string}>
}

const productionPath = (name: string) => `ops/production/${name}`
const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T
const sha256GitBlob = (path: string) => createHash('sha256')
  .update(execFileSync('git', ['show', `HEAD:${path}`]))
  .digest('hex')

describe('tio2-my production release contracts', () => {
  it('freezes the Malaysia release surface, identity, ports, and ordered 58 objects', () => {
    const surface = readJson<Surface>(productionPath('release-surface.json'))
    const prereleaseScope = readJson<{pages: SurfaceObject[]}>('tests/fixtures/prerelease/scope-58.json')

    expect(surface).toMatchObject({
      schemaVersion: 'tio2-my-production-surface-v1',
      siteId: 'tio2-my',
      website: 'https://tio2malaysia.com',
    })
    expect(surface.objects).toHaveLength(58)
    expect(surface.objects.filter(item => item.expectedStatus === 200)).toHaveLength(57)
    expect(surface.objects.find(item => item.id === 'SYS-404')).toMatchObject({path: '/404/', expectedStatus: 404})
    expect(surface.cms).toBe('https://cms.tio2malaysia.com')
    expect(surface.ports).toEqual({
      wordpress: '127.0.0.1:8080',
      web: '127.0.0.1:3000',
      candidate: '127.0.0.1:3001',
    })
    expect(surface.objects).toEqual(prereleaseScope.pages)
  })

  it('defines a closed package schema for one hashed tio2-my release', () => {
    const schema = readJson<Record<string, unknown>>(productionPath('release-package.schema.json'))
    const properties = schema.properties as Record<string, Record<string, unknown>>

    expect(schema).toMatchObject({
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      title: 'TiO2 Malaysia production release package',
      additionalProperties: false,
      required: ['schemaVersion', 'siteId', 'commit', 'archiveSha256', 'files', 'migrationManifestSha256', 'releaseSurfaceSha256'],
    })
    expect(properties.schemaVersion).toMatchObject({const: 'tio2-production-release-v1'})
    expect(properties.siteId).toMatchObject({const: 'tio2-my'})
    expect(properties.commit).toMatchObject({pattern: '^[a-f0-9]{40}$'})
    for (const field of ['archiveSha256', 'migrationManifestSha256', 'releaseSurfaceSha256']) {
      expect(properties[field]).toMatchObject({pattern: '^[a-f0-9]{64}$'})
    }
    expect(properties.files).toMatchObject({type: 'array'})
    expect((properties.files.items as Record<string, unknown>).additionalProperties).toBe(false)
  })

  it('allowlists only Git-hashed production migration seeds', () => {
    const manifest = readJson<MigrationManifest>(productionPath('migration-manifest.json'))
    const prereleaseManifest = readJson<{seeds: Array<{path: string}>}>('ops/prerelease/seed-manifest.json')
    const excludedPaths = new Set([
      'ops/prerelease/bootstrap-wordpress.sh',
      'wordpress/seed/apply-tio2-my-prerelease-public-paths.php',
      'wordpress/seed/refresh-tio2-my-resource-candidate.php',
    ])

    expect(manifest).toMatchObject({
      schemaVersion: 'tio2-my-production-migration-v1',
      siteId: 'tio2-my',
    })
    expect(manifest.seeds).toHaveLength(39)
    expect(manifest.seeds.map(seed => seed.path)).toEqual(
      prereleaseManifest.seeds
        .map(seed => seed.path)
        .filter(path => !excludedPaths.has(path)),
    )
    expect(manifest.seeds.map(seed => seed.path)).not.toEqual(
      expect.arrayContaining([...excludedPaths]),
    )
    for (const seed of manifest.seeds) {
      expect(seed.path).toMatch(/^wordpress\/seed\//u)
      expect(excludedPaths.has(seed.path)).toBe(false)
      expect(seed.sha256).toMatch(/^[a-f0-9]{64}$/u)
      expect(sha256GitBlob(seed.path)).toBe(seed.sha256)
    }
  })

  it('documents the complete production environment without credential values', () => {
    const environment = readFileSync(productionPath('.env.example'), 'utf8')
    expect(environment.trim().split(/\r?\n/u)).toEqual([
      'SITE_ID=tio2-my',
      'NODE_ENV=production',
      'VERCEL_ENV=production',
      'NEXT_PUBLIC_SITE_URL=https://tio2malaysia.com',
      'NEXT_PUBLIC_TIO2_RUNTIME_ENVIRONMENT=production',
      'WORDPRESS_GRAPHQL_URL=http://wordpress/graphql',
      'WORDPRESS_MEDIA_ORIGIN=https://cms.tio2malaysia.com',
      'WORDPRESS_PREVIEW_URL=http://wordpress/wp-json/tio2/v1/preview',
      'NEXTJS_REVALIDATION_URL_TIO2_MY=http://web:3000/api/revalidate',
      'NEXTJS_REVALIDATION_SECRET_TIO2_MY=REQUIRED_ROOT_ONLY_VALUE',
      'NEXTJS_PREVIEW_SECRET_TIO2_MY=REQUIRED_ROOT_ONLY_VALUE',
      'WORDPRESS_EDITORIAL_API_TOKEN=REQUIRED_ROOT_ONLY_VALUE',
      'NEXT_PUBLIC_TIO2_MY_WEB3FORMS_ACCESS_KEY=REQUIRED_APPROVED_UUID',
      'TIO2_MY_RFQ_INDEXING_RELEASE_AUTHORIZED=false',
    ])
  })
})
