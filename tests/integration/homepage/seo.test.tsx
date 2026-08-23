import {renderToStaticMarkup} from 'react-dom/server'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {toHomepageDto} from '@/lib/wordpress/homepage-dto'
import type {HomepageDto} from '@/lib/wordpress/homepage-types'
import {getSiteConfig} from '@/sites'
import {makeHomepageNode} from '@/tests/mocks/handlers'

const seoMocks = vi.hoisted(() => ({
  getCurrentSite: vi.fn(),
  getHomepage: vi.fn(),
  getPreviewHomepage: vi.fn(),
  hasScopedPreviewSession: vi.fn(),
}))

vi.mock('next/font/google', () => ({
  Inter: () => ({variable: 'inter-font'}),
  Source_Serif_4: () => ({variable: 'source-serif-font'}),
}))
vi.mock('@/lib/sites/current-site', () => ({
  getCurrentSite: seoMocks.getCurrentSite,
}))
vi.mock('@/lib/wordpress/homepage-queries', () => ({
  getHomepage: seoMocks.getHomepage,
}))
vi.mock('@/lib/wordpress/homepage-preview', () => ({
  getPreviewHomepage: seoMocks.getPreviewHomepage,
}))
vi.mock('@/lib/wordpress/preview-session', () => ({
  hasScopedPreviewSession: seoMocks.hasScopedPreviewSession,
}))

function homepageFixture(siteId: 'tio2-a' | 'tio2-b'): HomepageDto {
  const node = makeHomepageNode()
  node.siteScopes.nodes[0].slug = siteId
  node.homepageFields.heroHeading = `${siteId} visible homepage heading`
  node.homepageFields.seoTitle = `${siteId} homepage SEO title`
  return toHomepageDto(node, siteId)
}

beforeEach(() => {
  seoMocks.getCurrentSite.mockReturnValue(getSiteConfig('tio2-a'))
  seoMocks.getHomepage.mockResolvedValue(homepageFixture('tio2-a'))
  seoMocks.getPreviewHomepage.mockResolvedValue(null)
  seoMocks.hasScopedPreviewSession.mockResolvedValue(false)
  vi.stubEnv('VERCEL_ENV', 'development')
})

afterEach(() => {
  vi.clearAllMocks()
  vi.resetModules()
  vi.unstubAllEnvs()
})

describe('homepage SEO route integration', () => {
  it.each([
    ['tio2-a', 'https://tio2products.com/'],
    ['tio2-b', 'https://tio2hub.com/'],
  ] as const)('keeps %s canonical and structured data site-local', async (siteId, canonical) => {
    seoMocks.getCurrentSite.mockReturnValue(getSiteConfig(siteId))
    seoMocks.getHomepage.mockResolvedValue(homepageFixture(siteId))
    const route = await import('@/app/page')

    const metadata = await route.generateMetadata()
    const markup = renderToStaticMarkup(await route.default())
    const scripts = Array.from(
      markup.matchAll(
        /<script type="application\/ld\+json">([\s\S]*?)<\/script>/gu,
      ),
    )

    expect(metadata.alternates?.canonical).toBe(canonical)
    expect(metadata.robots).toEqual({index: false, follow: false})
    expect(metadata).not.toHaveProperty('keywords')
    expect(scripts).toHaveLength(1)
    const jsonLd = JSON.parse(scripts[0]?.[1] ?? 'null') as Array<
      Record<string, unknown>
    >
    expect(jsonLd.map((value) => value['@type'])).toEqual([
      'Organization',
      'WebSite',
      'WebPage',
      'FAQPage',
    ])
    const serialized = JSON.stringify({metadata, jsonLd})
    expect(serialized).not.toContain('localhost')
    expect(serialized).not.toContain(
      siteId === 'tio2-a' ? 'tio2hub.com' : 'tio2products.com',
    )
  })

  it('always disables indexing for the scoped homepage preview', async () => {
    const draft = homepageFixture('tio2-a')
    seoMocks.hasScopedPreviewSession.mockResolvedValue(true)
    seoMocks.getPreviewHomepage.mockResolvedValue({
      ...draft,
      identity: {...draft.identity, status: 'draft'},
    })
    const route = await import('@/app/page')

    const metadata = await route.generateMetadata()

    expect(seoMocks.getPreviewHomepage).toHaveBeenCalledWith('tio2-a')
    expect(metadata.robots).toEqual({index: false, follow: false})
  })
})
