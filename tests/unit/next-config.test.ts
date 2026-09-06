import {afterEach, describe, expect, it, vi} from 'vitest'
import {hasRemoteMatch} from 'next/dist/shared/lib/match-remote-pattern'

function permitsRemoteImage(
  images: Awaited<ReturnType<typeof loadConfig>>['images'],
  src: string,
): boolean {
  return hasRemoteMatch(
    [...(images?.domains ?? [])],
    [...(images?.remotePatterns ?? [])],
    new URL(src),
  )
}

async function loadConfig() {
  const {default: config} = await import('../../next.config')
  return config
}

afterEach(() => {
  vi.resetModules()
  vi.unstubAllEnvs()
})

describe('Next.js configuration', () => {
  it('delegates page-only slash normalization without redirecting API routes', async () => {
    const config = await loadConfig()

    expect(config.skipTrailingSlashRedirect).toBe(true)
    expect(config.trailingSlash).toBeUndefined()
  })

  it('permits only local WordPress uploads through the real Next image matcher by default', async () => {
    vi.stubEnv('WORDPRESS_MEDIA_ORIGIN', undefined)
    const config = await loadConfig()

    expect(
      permitsRemoteImage(
        config.images,
        'http://localhost:8080/wp-content/uploads/editorial-hero.webp',
      ),
    ).toBe(true)
    expect(
      permitsRemoteImage(
        config.images,
        'http://localhost:8080/synthetic.png',
      ),
    ).toBe(false)
  })

  it.each([
    ['HTTPS instead of HTTP', 'https://localhost:8080/wp-content/uploads/hero.webp'],
    ['a different hostname', 'http://127.0.0.1:8080/wp-content/uploads/hero.webp'],
    ['a different port', 'http://localhost:8081/wp-content/uploads/hero.webp'],
    ['a non-upload path', 'http://localhost:8080/wp-content/plugins/hero.webp'],
  ])('does not broaden Site A media access to %s', async (_label, src) => {
    vi.stubEnv('WORDPRESS_MEDIA_ORIGIN', undefined)
    const config = await loadConfig()

    expect(permitsRemoteImage(config.images, src)).toBe(false)
  })

  it('uses the explicitly configured production WordPress origin without a hostname wildcard', async () => {
    vi.stubEnv('WORDPRESS_MEDIA_ORIGIN', 'https://cms.example.test:8443')
    const config = await loadConfig()

    expect(
      permitsRemoteImage(
        config.images,
        'https://cms.example.test:8443/wp-content/uploads/2026/08/hero.webp',
      ),
    ).toBe(true)
    expect(
      permitsRemoteImage(
        config.images,
        'https://media.cms.example.test:8443/wp-content/uploads/hero.webp',
      ),
    ).toBe(false)
    expect(
      permitsRemoteImage(
        config.images,
        'https://cms.example.test:8443/assets/hero.webp',
      ),
    ).toBe(false)
  })

  it('rejects a configured WordPress media origin containing an empty userinfo marker', async () => {
    vi.stubEnv('WORDPRESS_MEDIA_ORIGIN', 'https://@cms.example.test')

    await expect(loadConfig()).rejects.toThrow(
      'WORDPRESS_MEDIA_ORIGIN must be an HTTP(S) origin without credentials, path, query, or fragment',
    )
  })

  it('uses NEXT_DIST_DIR for a local build directory', async () => {
    vi.stubEnv('NEXT_DIST_DIR', '.next-tio2-a')

    const {default: config} = await import('../../next.config')

    expect(config.distDir).toBe('.next-tio2-a')
  })

  it('uses the default build directory when NEXT_DIST_DIR is absent', async () => {
    vi.stubEnv('NEXT_DIST_DIR', undefined)

    const {default: config} = await import('../../next.config')

    expect(config.distDir).toBe('.next')
  })

  it.each([
    ['parent traversal', '../shared-build'],
    ['a drive prefix', 'C:\\shared-build'],
    ['a leading slash', '/shared-build'],
  ])('rejects a build directory with %s', async (_, distDir) => {
    vi.stubEnv('NEXT_DIST_DIR', distDir)

    await expect(import('../../next.config')).rejects.toThrow(
      'NEXT_DIST_DIR must be a relative path without parent traversal',
    )
  })
})
