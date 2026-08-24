import {renderToStaticMarkup} from 'react-dom/server'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {toHomepageDto} from '@/lib/wordpress/homepage-dto'
import {getHomepageLinkPolicy} from '@/lib/wordpress/homepage-link-policy'
import type {HomepageDto} from '@/lib/wordpress/homepage-types'
import {getSiteConfig} from '@/sites'
import {makeHomepageNode} from '@/tests/mocks/handlers'

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

function homepageFixture(siteId: 'tio2-a' | 'tio2-b'): HomepageDto {
  const node = makeHomepageNode(siteId)
  node.id = siteId === 'tio2-a' ? 'aG9tZXBhZ2U6MTAx' : 'aG9tZXBhZ2U6MjAy'
  node.databaseId = siteId === 'tio2-a' ? 101 : 202
  node.homepageFields.heroHeading =
    siteId === 'tio2-a'
      ? 'Site A titanium dioxide supply'
      : 'Site B independent buyer discovery'

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
  it('uses the formal published homepage lookup and renders one SiteShell main', async () => {
    const {default: HomePage} = await import('@/app/page')

    const markup = renderToStaticMarkup(await HomePage())

    expect(routeMocks.getHomepage).toHaveBeenCalledWith('tio2-a')
    expect(routeMocks.getPreviewHomepage).not.toHaveBeenCalled()
    expect(routeMocks.getContentByPath).not.toHaveBeenCalled()
    expect(markup.match(/<main(?:\s|>)/gu)).toHaveLength(1)
    expect(markup).toContain('data-site-id="tio2-a"')
    expect(markup).toContain('Site A titanium dioxide supply')
  })

  it('uses only the exact scoped homepage preview for the root path', async () => {
    const preview = homepageFixture('tio2-a')
    routeMocks.hasScopedPreviewSession.mockResolvedValue(true)
    routeMocks.getPreviewHomepage.mockResolvedValue({
      ...preview,
      identity: {...preview.identity, status: 'draft'},
      hero: {...preview.hero, heading: 'Scoped homepage draft'},
    })
    const {default: HomePage} = await import('@/app/page')

    const markup = renderToStaticMarkup(await HomePage())

    expect(routeMocks.hasScopedPreviewSession).toHaveBeenCalledWith(
      'tio2-a',
      '/',
    )
    expect(routeMocks.getPreviewHomepage).toHaveBeenCalledWith('tio2-a')
    expect(routeMocks.getHomepage).not.toHaveBeenCalled()
    expect(markup).toContain('Scoped homepage draft')
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
    expect(markup).toContain('Site B independent buyer discovery')
    expect(markup).not.toContain('Site A titanium dioxide supply')
  })
})
