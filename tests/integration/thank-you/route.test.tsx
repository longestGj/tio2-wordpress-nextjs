import {renderToStaticMarkup} from 'react-dom/server'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {getSiteConfig} from '@/sites'

const routeMocks = vi.hoisted(() => ({getCurrentSite: vi.fn()}))
vi.mock('@/lib/sites/current-site', () => ({getCurrentSite: routeMocks.getCurrentSite}))

beforeEach(() => { routeMocks.getCurrentSite.mockReturnValue(getSiteConfig('tio2-my')) })
afterEach(() => { vi.clearAllMocks(); vi.resetModules() })

describe('CONV-THANK route', () => {
  it('server-renders a neutral 200-safe Direct shell with no result schema', async () => {
    const route = await import('@/app/thank-you/page')
    const markup = renderToStaticMarkup(route.default())
    expect(markup).toContain('data-site-scope="tio2-my"')
    expect(markup).toContain('How can we help?')
    expect(markup).not.toContain('REQUEST RECEIVED')
    expect(markup).not.toContain('application/ld+json')
  })

  it('returns exact stable noindex metadata for every state query', async () => {
    const route = await import('@/app/thank-you/page')
    expect(route.generateMetadata()).toEqual({
      title: 'Thank You | TiO2 Malaysia',
      description: 'View confirmation and next steps for a TiO2 Malaysia quotation, document or sample request, or choose the request you would like to make.',
      alternates: {canonical: 'https://tio2malaysia.com/thank-you/'},
      robots: {index: false, follow: false},
    })
  })

  it('rejects foreign site scope before rendering a plausible result', async () => {
    routeMocks.getCurrentSite.mockReturnValue(getSiteConfig('tio2-b'))
    const route = await import('@/app/thank-you/page')
    expect(() => route.default()).toThrow(expect.objectContaining({digest: 'NEXT_HTTP_ERROR_FALLBACK;404'}))
    expect(() => route.generateMetadata()).toThrow(expect.objectContaining({digest: 'NEXT_HTTP_ERROR_FALLBACK;404'}))
  })
})

