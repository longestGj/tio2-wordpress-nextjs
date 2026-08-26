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
  it('permits approved Site A HTTPS media through the real Next image matcher', async () => {
    const config = await loadConfig()

    expect(
      permitsRemoteImage(
        config.images,
        'https://tio2products.com/wp-content/uploads/editorial-hero.webp',
      ),
    ).toBe(true)
    expect(
      permitsRemoteImage(
        config.images,
        'https://tio2products.com/synthetic.png',
      ),
    ).toBe(true)
  })

  it.each([
    ['HTTP', 'http://tio2products.com/wp-content/uploads/hero.webp'],
    ['a sibling subdomain', 'https://media.tio2products.com/hero.webp'],
    ['an unrelated host', 'https://example.test/hero.webp'],
  ])('does not broaden Site A media access to %s', async (_label, src) => {
    const config = await loadConfig()

    expect(permitsRemoteImage(config.images, src)).toBe(false)
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
