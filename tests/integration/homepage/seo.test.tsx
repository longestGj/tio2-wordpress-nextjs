import {renderToStaticMarkup} from 'react-dom/server'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {toHomepageDto} from '@/lib/wordpress/homepage-dto'
import {getHomepageLinkPolicy} from '@/lib/wordpress/homepage-link-policy'
import type {AnyHomepageDto} from '@/lib/wordpress/homepage-types'
import {toSiteAEditorialHomepageDto} from '@/lib/wordpress/homepage-v02-dto'
import {toMalaysiaHomepageDto} from '@/lib/wordpress/homepage-v04-dto'
import {getSiteConfig} from '@/sites'
import {
  makeHomepageNode,
  makeSiteAEditorialHomepageNode,
} from '@/tests/mocks/handlers'
import approvedMalaysiaContract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-homepage.json'

const seoMocks = vi.hoisted(() => ({
  getCurrentSite: vi.fn(),
  getHomepage: vi.fn(),
  getPreviewHomepage: vi.fn(),
  hasScopedPreviewSession: vi.fn(),
}))

vi.mock('next/font/google', () => ({
  Inter: () => ({variable: 'inter-font'}),
  Source_Serif_4: () => ({variable: 'source-serif-font'}),
  Source_Sans_3: () => ({variable: 'source-sans-font'}),
  Space_Grotesk: () => ({variable: 'space-grotesk-font'}),
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

function homepageFixture(siteId: 'tio2-a' | 'tio2-b'): AnyHomepageDto {
  if (siteId === 'tio2-a') {
    const node = makeSiteAEditorialHomepageNode()
    Reflect.set(
      node.homepageFields!,
      'heroHeading',
      `${siteId} visible homepage heading`,
    )
    return toSiteAEditorialHomepageDto(node, {
      rfqHref: getSiteConfig(siteId).rfqHref,
    })
  }

  const node = makeHomepageNode(siteId)
  node.homepageFields.heroHeading = `${siteId} visible homepage heading`
  node.homepageFields.seoTitle = `${siteId} homepage SEO title`
  return toHomepageDto(node, siteId, {
    linkPolicy: getHomepageLinkPolicy(siteId),
  })
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
  it('emits one scope-local canonical equivalent to the approved Malaysia root URL', async () => {
    const homepage = toMalaysiaHomepageDto({
      id: 'homepage-my-1',
      modifiedGmt: '2026-08-31T01:02:03',
      status: 'publish',
      siteScopes: {nodes: [{slug: 'tio2-my'}]},
      homepageFields: {homepageSchemaVersion: 'homepage-v0.4-malaysia'},
      malaysiaHomepageContractJson: JSON.stringify(approvedMalaysiaContract),
    })
    seoMocks.getCurrentSite.mockReturnValue(getSiteConfig('tio2-my'))
    seoMocks.getHomepage.mockResolvedValue(homepage)
    const route = await import('@/app/page')

    const metadata = await route.generateMetadata()
    const canonical = metadata.alternates?.canonical

    expect(typeof canonical).toBe('string')
    expect([canonical].filter(Boolean)).toHaveLength(1)
    const canonicalUrl = new URL(String(canonical))
    expect(canonicalUrl.href).toBe('https://tio2malaysia.com/')
    expect(new URL('https://tio2malaysia.com').href).toBe(
      new URL('https://tio2malaysia.com/').href,
    )
    expect(canonicalUrl.protocol).toBe('https:')
    expect(canonicalUrl.hostname).toBe('tio2malaysia.com')
    expect(canonicalUrl.pathname).toBe('/')
    expect(canonicalUrl.search).toBe('')
    expect(canonicalUrl.hash).toBe('')
    expect(canonicalUrl.username).toBe('')
    expect(canonicalUrl.password).toBe('')
    expect(canonicalUrl.port).toBe('')
    expect(JSON.stringify(metadata)).not.toMatch(
      /tio2products\.com|tio2hub\.com|tiovar/iu,
    )
  })

  it.each([
    [
      'tio2-a',
      'https://tio2products.com/',
      ['Organization', 'WebSite', 'WebPage'],
    ],
    [
      'tio2-b',
      'https://tio2hub.com/',
      ['Organization', 'WebSite', 'WebPage', 'FAQPage'],
    ],
  ] as const)('keeps %s canonical and structured data site-local', async (siteId, canonical, expectedTypes) => {
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
    expect(jsonLd.map((value) => value['@type'])).toEqual(expectedTypes)
    const serialized = JSON.stringify({metadata, jsonLd})
    if (siteId === 'tio2-a') {
      expect(serialized).not.toMatch(/FAQPage|GEO|llms\.txt/i)
    }
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
