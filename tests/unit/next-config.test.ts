import {afterEach, describe, expect, it, vi} from 'vitest'

afterEach(() => {
  vi.resetModules()
  vi.unstubAllEnvs()
})

describe('Next.js configuration', () => {
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
