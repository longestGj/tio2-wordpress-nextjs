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
const legacyMigrationCommit = '5a79bbb99771fdb44d227de7515b13d4e05da555'
const sha256GitBlob = (path: string) => createHash('sha256')
  .update(execFileSync('git', ['show', `${legacyMigrationCommit}:${path}`]))
  .digest('hex')

describe('tio2-my production release contracts', () => {
  it('keeps the root documentation navigation compatible with the development-release split', () => {
    const rootRules = readFileSync('AGENTS.md', 'utf8')
    const developmentWorkflow = readFileSync('docs/development-workflow.md', 'utf8')
    const developmentExecution = readFileSync('docs/development-execution.md', 'utf8')

    expect(rootRules).toContain('docs/development-workflow.md#0-按任务阅读与文档职责')
    expect(rootRules).toContain('CI/CD及两套本地环境读其中第10–13节')
    expect(rootRules).toContain('发布读开发交付流程第7节')
    expect(developmentWorkflow).toContain('## 0. 按任务阅读与文档职责')
    expect(developmentWorkflow).toMatch(/## 7\. 发布[^\n]*\n[\s\S]*独立发布指令/u)
    expect(developmentWorkflow).toContain('MERGED_TO_DEVELOP')
    expect(developmentWorkflow).not.toContain('Gate9')
    for (const heading of [
      '## 10. 两套本地环境', '## 11. CI/CD如何接入',
      '## 12. 现有能力与自动化缺口', '## 13. 制品、数据与恢复',
    ]) expect(developmentExecution).toContain(heading)
    expect(developmentExecution).toContain('开发侧不修改 `main`')
    expect(developmentExecution).toContain('独立发布指令')
  })

  it('documents the phase-one controller, package types, actions, and installed capability', () => {
    const architecture = readFileSync('docs/release-architecture.md', 'utf8')
    const registry = readFileSync('docs/site-registry.md', 'utf8')

    for (const component of [
      '候选合同与分类器', '主体登记与资源所有权', '状态、锁与审计回执',
      '发布控制器', '类型适配器', '固定特权入口',
    ]) expect(architecture).toContain(component)
    for (const releaseType of [
      'frontend-only', 'content-only', 'combined', 'cms-platform', 'host-infrastructure',
    ]) expect(architecture).toContain(releaseType)
    for (const action of ['status', 'prepare', 'backup', 'stage', 'activate', 'verify', 'rollback']) {
      expect(architecture).toContain(`\`${action}\``)
    }
    expect(registry).toContain('`frontend-only` | `installed`')
    for (const releaseType of ['content-only', 'combined', 'cms-platform', 'host-infrastructure']) {
      expect(registry).toContain(`\`${releaseType}\` | \`not-installed\``)
    }
  })

  it('freezes the Malaysia release surface, identity, ports, and ordered 59 objects', () => {
    const surface = readJson<Surface>(productionPath('release-surface.json'))
    const prereleaseScope = readJson<{pages: SurfaceObject[]}>('tests/fixtures/prerelease/scope-59.json')

    expect(surface).toMatchObject({
      schemaVersion: 'tio2-my-production-surface-v1',
      siteId: 'tio2-my',
      website: 'https://tio2malaysia.com',
    })
    expect(surface.objects).toHaveLength(59)
    expect(surface.objects.filter(item => item.expectedStatus === 200)).toHaveLength(58)
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

  it('preserves the frozen legacy migration contract and its original Git-hashed seeds', () => {
    const manifest = readJson<MigrationManifest>(productionPath('migration-manifest.json'))
    const prereleaseManifest = JSON.parse(execFileSync('git', ['show', `${legacyMigrationCommit}:ops/prerelease/seed-manifest.json`], {encoding: 'utf8'})) as {seeds: Array<{path: string}>}
    const frozenManifest = execFileSync('git', ['show', `${legacyMigrationCommit}:ops/production/migration-manifest.json`])
    expect(createHash('sha256').update(frozenManifest).digest('hex')).toBe('8bc0db54ef1efe5ceff3474e0efc29d0696e6256ed1b9d59d141aed7ce3c1004')
    expect(readFileSync(productionPath('migration-manifest.json'), 'utf8').replace(/\r\n/gu, '\n')).toBe(frozenManifest.toString('utf8'))
    expect(JSON.parse(frozenManifest.toString('utf8'))).toEqual(manifest)
    // Current HOME/APP seeds require independent approval; this legacy archive
    // test does not certify current HEAD for the old bootstrap procedure.
    const excludedPaths = new Set([
      'ops/prerelease/bootstrap-wordpress.sh',
      'wordpress/seed/apply-tio2-my-prerelease-public-paths.php',
      'wordpress/seed/refresh-tio2-my-resource-candidate.php',
      'wordpress/seed/refresh-tio2-my-trade-candidate.php',
    ])

    expect(manifest).toMatchObject({
      schemaVersion: 'tio2-my-production-migration-v1',
      siteId: 'tio2-my',
    })
    expect(manifest.seeds).toHaveLength(40)
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
  }, 30_000)

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
      'NEXT_PUBLIC_TIO2_MY_GTM_CONTAINER_ID=REQUIRED_APPROVED_GTM_ID',
      'NEXT_PUBLIC_TIO2_MY_GA4_MEASUREMENT_ID=REQUIRED_APPROVED_GA4_ID',
      'TIO2_MY_RFQ_INDEXING_RELEASE_AUTHORIZED=false',
    ])
  })
})
