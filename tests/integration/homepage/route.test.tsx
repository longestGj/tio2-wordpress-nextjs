import {renderToStaticMarkup} from 'react-dom/server'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {toHomepageDto} from '@/lib/wordpress/homepage-dto'
import {getHomepageLinkPolicy} from '@/lib/wordpress/homepage-link-policy'
import type {AnyHomepageDto} from '@/lib/wordpress/homepage-types'
import {toMalaysiaHomepageDto} from '@/lib/wordpress/homepage-v04-dto'
import {toSiteAEditorialHomepageDto} from '@/lib/wordpress/homepage-v02-dto'
import {getSiteConfig} from '@/sites'
import {
  makeHomepageNode,
  makeSiteAEditorialHomepageNode,
} from '@/tests/mocks/handlers'
import approvedMalaysiaContract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-homepage.json'

const routeMocks = vi.hoisted(() => ({
  getCurrentSite: vi.fn(),
  getHomepage: vi.fn(),
  getPreviewHomepage: vi.fn(),
  getContentByPath: vi.fn(),
  hasScopedPreviewSession: vi.fn(),
}))

vi.mock('next/font/google', () => ({
  Inter: () => ({variable: 'inter-font'}),
  Source_Serif_4: () => ({variable: 'source-serif-font'}),
  Source_Sans_3: () => ({variable: 'source-sans-font'}),
  Space_Grotesk: () => ({variable: 'space-grotesk-font'}),
}))
vi.mock('@/lib/sites/current-site', () => ({
  getCurrentSite: routeMocks.getCurrentSite,
}))
vi.mock('@/lib/wordpress/homepage-queries', () => ({
  getHomepage: routeMocks.getHomepage,
}))
vi.mock('@/lib/wordpress/homepage-preview', () => ({
  getPreviewHomepage: routeMocks.getPreviewHomepage,
}))
vi.mock('@/lib/wordpress/preview-session', () => ({
  hasScopedPreviewSession: routeMocks.hasScopedPreviewSession,
}))
vi.mock('@/lib/wordpress/queries', () => ({
  getContentByPath: routeMocks.getContentByPath,
}))

function homepageFixture(siteId: 'tio2-a' | 'tio2-b'): AnyHomepageDto {
  if (siteId === 'tio2-a') {
    const node = makeSiteAEditorialHomepageNode()
    Reflect.set(
      node.homepageFields!,
      'heroHeading',
      'Site A titanium dioxide supply',
    )
    return toSiteAEditorialHomepageDto(node, {
      rfqHref: getSiteConfig(siteId).rfqHref,
    })
  }

  const node = makeHomepageNode(siteId)
  node.id = 'aG9tZXBhZ2U6MjAy'
  node.databaseId = 202
  node.homepageFields.heroHeading = 'Site B independent buyer discovery'

  return toHomepageDto(node, siteId, {
    linkPolicy: getHomepageLinkPolicy(siteId),
  })
}

beforeEach(() => {
  routeMocks.getCurrentSite.mockReturnValue(getSiteConfig('tio2-a'))
  routeMocks.hasScopedPreviewSession.mockResolvedValue(false)
  routeMocks.getHomepage.mockResolvedValue(homepageFixture('tio2-a'))
  routeMocks.getPreviewHomepage.mockResolvedValue(null)
  routeMocks.getContentByPath.mockResolvedValue({
    title: 'Legacy generic root must not render',
  })
})

afterEach(() => {
  vi.clearAllMocks()
  vi.resetModules()
})

describe('homepage root route', () => {
  it('uses the formal published lookup and renders one Site A editorial main', async () => {
    const {default: HomePage} = await import('@/app/page')

    const markup = renderToStaticMarkup(await HomePage())

    expect(routeMocks.getHomepage).toHaveBeenCalledWith('tio2-a')
    expect(routeMocks.getPreviewHomepage).not.toHaveBeenCalled()
    expect(routeMocks.getContentByPath).not.toHaveBeenCalled()
    expect(markup.match(/<main(?:\s|>)/gu)).toHaveLength(1)
    expect(markup).toContain('data-site-id="tio2-a"')
    expect(markup).toContain('Site A titanium dioxide supply')
    expect(markup.match(/<header(?:\s|>)/gu)).toHaveLength(1)
    expect(markup).not.toContain('<form')
    expect(markup).not.toMatch(/href="\/products|href="\/applications/u)

    const headerEnd = markup.indexOf('</header>')
    const mainStart = markup.indexOf('<main')
    const jsonLd = markup.indexOf('<script type="application/ld+json">')
    const hero = markup.indexOf('Site A titanium dioxide supply')
    const mainEnd = markup.indexOf('</main>')
    expect(headerEnd).toBeLessThan(mainStart)
    expect(mainStart).toBeLessThan(jsonLd)
    expect(jsonLd).toBeLessThan(hero)
    expect(hero).toBeLessThan(mainEnd)
  })

  it('uses only the exact scoped homepage preview for the root path', async () => {
    const preview = homepageFixture('tio2-a')
    if (preview.identity.schemaVersion !== 'homepage-v0.2-editorial-geo') {
      throw new Error('Expected Site A editorial fixture')
    }
    routeMocks.hasScopedPreviewSession.mockResolvedValue(true)
    routeMocks.getPreviewHomepage.mockResolvedValue({
      ...preview,
      identity: {...preview.identity, status: 'draft'},
      hero: {...preview.hero, heading: 'Scoped editorial homepage draft'},
    })
    const {default: HomePage} = await import('@/app/page')

    const markup = renderToStaticMarkup(await HomePage())

    expect(routeMocks.hasScopedPreviewSession).toHaveBeenCalledWith(
      'tio2-a',
      '/',
    )
    expect(routeMocks.getPreviewHomepage).toHaveBeenCalledWith('tio2-a')
    expect(routeMocks.getHomepage).not.toHaveBeenCalled()
    expect(markup).toContain('Scoped editorial homepage draft')
  })

  it('returns not-found for a missing homepage without falling back to the old root Page', async () => {
    routeMocks.getHomepage.mockResolvedValue(null)
    const {default: HomePage} = await import('@/app/page')

    await expect(HomePage()).rejects.toMatchObject({
      digest: 'NEXT_HTTP_ERROR_FALLBACK;404',
    })
    expect(routeMocks.getContentByPath).not.toHaveBeenCalled()
  })

  it('keeps Site A and Site B homepage content isolated', async () => {
    routeMocks.getCurrentSite.mockReturnValue(getSiteConfig('tio2-b'))
    routeMocks.getHomepage.mockResolvedValue(homepageFixture('tio2-b'))
    const {default: HomePage} = await import('@/app/page')

    const markup = renderToStaticMarkup(await HomePage())

    expect(routeMocks.getHomepage).toHaveBeenCalledWith('tio2-b')
    expect(markup).toContain('data-site-id="tio2-b"')
    expect(markup).toContain('<p>TiO2 B</p>')
    expect(markup).toContain('Site B independent buyer discovery')
    expect(markup).not.toContain('Site A titanium dioxide supply')

    const mainStart = markup.indexOf('<main data-site-id="tio2-b">')
    const branding = markup.indexOf('<p>TiO2 B</p>')
    const jsonLd = markup.indexOf('<script type="application/ld+json">')
    const hero = markup.indexOf('Site B independent buyer discovery')
    const mainEnd = markup.indexOf('</main>')
    expect(mainStart).toBeLessThan(branding)
    expect(branding).toBeLessThan(jsonLd)
    expect(jsonLd).toBeLessThan(hero)
    expect(hero).toBeLessThan(mainEnd)
  })

  it('renders the Malaysia homepage without reading a preview cookie', async () => {
    routeMocks.getCurrentSite.mockReturnValue(getSiteConfig('tio2-my'))
    routeMocks.hasScopedPreviewSession.mockResolvedValue(true)
    routeMocks.getPreviewHomepage.mockRejectedValue(
      new Error('Malaysia public route must not enter preview mode'),
    )
    routeMocks.getHomepage.mockResolvedValue(toMalaysiaHomepageDto({
      id: 'homepage-my-1',
      modifiedGmt: '2026-09-06T01:02:03',
      status: 'publish',
      siteScopes: {nodes: [{slug: 'tio2-my'}]},
      homepageFields: {homepageSchemaVersion: 'homepage-v0.4-malaysia'},
      malaysiaHomepageContractJson: JSON.stringify(approvedMalaysiaContract),
    }))
    const {default: HomePage} = await import('@/app/page')

    const markup = renderToStaticMarkup(await HomePage())

    expect(routeMocks.getHomepage).toHaveBeenCalledWith('tio2-my')
    expect(routeMocks.hasScopedPreviewSession).not.toHaveBeenCalled()
    expect(routeMocks.getPreviewHomepage).not.toHaveBeenCalled()
    expect(markup).toContain('data-site-id="tio2-my"')
    expect(markup).toContain('data-site-scope="tio2-my"')
  })
})
