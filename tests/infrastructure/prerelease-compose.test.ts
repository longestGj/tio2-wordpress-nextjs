import {createHash} from 'node:crypto'
import {execFileSync} from 'node:child_process'
import {existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync} from 'node:fs'
import {devNull, tmpdir} from 'node:os'
import {dirname, join, relative, resolve} from 'node:path'
import {parse} from 'yaml'
import {describe, expect, it} from 'vitest'

const composePath = 'ops/prerelease/docker-compose.yml'
const environmentExamplePath = 'ops/prerelease/.env.example'
const seedManifestPath = 'ops/prerelease/seed-manifest.json'

interface ComposeContract {
  services: Record<string, {
    user?: string
    ports?: string[]
    environment?: Record<string, string>
    volumes?: string[]
    healthcheck?: {test: string[]}
  }>
  volumes: Record<string, unknown>
}

function readCompose(): ComposeContract | null {
  return existsSync(composePath) ? parse(readFileSync(composePath, 'utf8')) as ComposeContract : null
}

describe('tio2-my local prerelease Compose contract', () => {
  it('shares a private editorial credential only between the isolated CMS and Next server', () => {
    const compose = readCompose()
    expect(compose?.services.wordpress.environment?.EDITORIAL_API_TOKEN).toBe('${WORDPRESS_EDITORIAL_API_TOKEN}')
    for (const service of ['builder', 'web']) {
      expect(compose?.services[service].environment?.WORDPRESS_EDITORIAL_API_TOKEN).toBe('${WORDPRESS_EDITORIAL_API_TOKEN}')
      expect(Object.keys(compose?.services[service].environment ?? {}).filter(key => key.startsWith('NEXT_PUBLIC_') && key.includes('EDITORIAL'))).toEqual([])
    }
  })
  it('provides the committed configuration inputs', () => {
    expect(existsSync(composePath)).toBe(true)
    expect(existsSync(environmentExamplePath)).toBe(true)
    expect(existsSync(seedManifestPath)).toBe(true)
  })

  it('exports Linux entrypoints and the hash-bound public-paths seed with LF line endings', () => {
    for (const path of [
      'ops/prerelease/bootstrap-wordpress.sh',
      'ops/prerelease/collect-cms-identity.sh',
      'wordpress/seed/apply-tio2-my-prerelease-public-paths.php',
    ]) {
      const attribute = execFileSync('git', ['check-attr', 'eol', '--', path], {encoding: 'utf8'})
      expect(attribute.trim()).toBe(`${path}: eol: lf`)
    }
  })

  it('preserves the approved public-paths seed hash through a Windows-style fresh Git checkout', () => {
    const seedPath = 'wordpress/seed/apply-tio2-my-prerelease-public-paths.php'
    const manifest = JSON.parse(readFileSync(seedManifestPath, 'utf8')) as {
      seeds: Array<{path: string; sha256: string}>
    }
    const expected = manifest.seeds.find(seed => seed.path === seedPath)?.sha256
    const blob = execFileSync('git', ['show', `HEAD:${seedPath}`])
    const sha256 = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex')
    expect(sha256(blob)).toBe(expected)
    const temporaryRoot = resolve(tmpdir())
    const checkout = mkdtempSync(join(temporaryRoot, 'prerelease-seed-lf-'))
    const git = (...args: string[]) => execFileSync('git', [
      '-c', `core.attributesFile=${devNull}`, '-c', 'core.safecrlf=false', ...args,
    ], {cwd: checkout, stdio: ['pipe', 'pipe', 'pipe']})
    try {
      git('init', '--quiet')
      writeFileSync(join(checkout, '.gitattributes'), readFileSync('.gitattributes'))
      mkdirSync(dirname(join(checkout, seedPath)), {recursive: true})
      writeFileSync(join(checkout, seedPath), blob)
      git('-c', 'core.autocrlf=false', 'add', '--', '.gitattributes', seedPath)
      unlinkSync(join(checkout, seedPath))
      git('-c', 'core.autocrlf=true', 'checkout-index', '--force', '--', seedPath)
      const exported = readFileSync(join(checkout, seedPath))
      expect(sha256(exported)).toBe(expected)
      expect(exported.equals(blob)).toBe(true)
    } finally {
      const ownedPath = relative(temporaryRoot, resolve(checkout))
      if (!ownedPath.startsWith('prerelease-seed-lf-') || ownedPath.includes('..')) {
        throw new Error('Refusing cleanup outside the owned seed checkout')
      }
      rmSync(checkout, {recursive: true, force: true})
    }
  })

  it('exposes only the website and WordPress admin on loopback', () => {
    const compose = readCompose()
    expect(compose).not.toBeNull()
    expect(Object.keys(compose?.services ?? {})).toEqual(['db', 'wordpress', 'wpcli', 'builder', 'web'])
    expect(compose?.services.db).not.toHaveProperty('ports')
    expect(compose?.services.wordpress.ports).toEqual(['127.0.0.1:8180:80'])
    expect(compose?.services.web.ports).toEqual(['127.0.0.1:3100:3000'])
  })

  it('accepts the WordPress canonical redirect without following it outside the container', () => {
    const command = readCompose()?.services.wordpress.healthcheck?.test.join(' ') ?? ''
    expect(command).toContain('curl')
    expect(command).toContain('--fail')
    expect(command).not.toContain('--location')
    expect(command).not.toContain('file_get_contents')
  })

  it('binds the web and CMS services to tio2-my prerelease identity', () => {
    const compose = readCompose()
    expect(compose?.services.web.environment).toMatchObject({
      SITE_ID: 'tio2-my',
      NEXT_DIST_DIR: '.next-prerelease',
      WORDPRESS_GRAPHQL_URL: 'http://wordpress/graphql',
      NEXT_PUBLIC_TIO2_RUNTIME_ENVIRONMENT: 'local-prerelease',
    })
    expect(compose?.services.wpcli.environment).toMatchObject({
      WORDPRESS_CONFIG_EXTRA: "define('WP_ENVIRONMENT_TYPE', 'local');",
    })
    expect(compose?.services.wordpress.volumes).toContain(
      '${PRERELEASE_SOURCE_DIR}/wordpress/plugins/tio2-site-model:/var/www/html/wp-content/plugins/tio2-site-model:ro',
    )
    expect(compose?.services.wpcli.volumes).toContain(
      '${PRERELEASE_SOURCE_DIR}/wordpress/seed:/workspace/wordpress/seed:ro',
    )
    expect(compose?.services.wpcli.volumes).toContain(
      '${PRERELEASE_SOURCE_DIR}/wordpress/plugins/tio2-site-model:/workspace/wordpress/plugins/tio2-site-model:ro',
    )
    expect(compose?.services.wpcli.user).toBe('33:33')
  })

  it('uses project-owned persistent volumes and no literal credentials', () => {
    const source = existsSync(composePath) ? readFileSync(composePath, 'utf8') : ''
    const compose = readCompose()
    expect(Object.keys(compose?.volumes ?? {})).toEqual([
      'prerelease_db',
      'prerelease_wp',
      'prerelease_npm_cache',
      'prerelease_sample_receipts',
    ])
    expect(source).not.toMatch(/local-dev-password|GENERATE_WITH|gmail\.com/iu)
    expect(source).toContain('${WORDPRESS_DB_PASSWORD}')
    expect(source).toContain('${NEXT_PUBLIC_TIO2_MY_WEB3FORMS_ACCESS_KEY}')
  })

  it('keeps Sample receipts persistent across candidate container replacement and binds server inputs', () => {
    const compose = readCompose()
    expect(compose?.services.web.environment).toMatchObject({
      TIO2_MY_SAMPLE_RECEIVER_BINDING: '${TIO2_MY_SAMPLE_RECEIVER_BINDING}',
      TIO2_MY_SAMPLE_RECEIPT_DIRECTORY: '/var/lib/tio2-sample-receipts',
      TIO2_MY_RFQ_ATTRIBUTION_SECRET: '${TIO2_MY_RFQ_ATTRIBUTION_SECRET}',
    })
    expect(compose?.services.web.volumes).toContain('prerelease_sample_receipts:/var/lib/tio2-sample-receipts')
  })

  it('lists every tio2-my apply seed and the approved candidate refresh with current SHA-256', () => {
    expect(existsSync(seedManifestPath)).toBe(true)
    if (!existsSync(seedManifestPath)) return
    const manifest = JSON.parse(readFileSync(seedManifestPath, 'utf8')) as {
      schemaVersion: number
      siteScope: string
      seeds: Array<{path: string; sha256: string}>
    }
    const expectedPaths = execFileSync(
      'git',
      ['ls-files', 'wordpress/seed/apply-tio2-my-*.php', 'wordpress/seed/refresh-tio2-my-resource-candidate.php'],
      {encoding: 'utf8'},
    ).trim().split(/\r?\n/u).filter(Boolean).sort()
    expect(manifest.schemaVersion).toBe(1)
    expect(manifest.siteScope).toBe('tio2-my')
    expect(manifest.seeds.map(({path}) => path).sort()).toEqual(expectedPaths)
    for (const seed of manifest.seeds) {
      expect(seed.sha256).toMatch(/^[a-f0-9]{64}$/u)
      expect(createHash('sha256').update(readFileSync(seed.path)).digest('hex')).toBe(seed.sha256)
    }
  })
})
