import {renderToStaticMarkup} from 'react-dom/server'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {GraphQLResponseError} from '@/lib/wordpress/client'
import {toMalaysiaEuMarketPageDto} from '@/lib/wordpress/market-page-v01-dto'
import {getSiteConfig} from '@/sites'
import approvedContract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-market-eu-001.json'

const routeMocks = vi.hoisted(() => ({
  getCurrentSite: vi.fn(),
  getMalaysiaEuMarketPage: vi.fn(),
}))

vi.mock('@/lib/sites/current-site', () => ({getCurrentSite: routeMocks.getCurrentSite}))
vi.mock('@/lib/wordpress/market-page-v01-queries', () => ({
  getMalaysiaEuMarketPage: routeMocks.getMalaysiaEuMarketPage,
}))

function marketPage() {
  return toMalaysiaEuMarketPageDto({
    id: 'market-eu-001-my-1', modifiedGmt: '2026-09-04T01:02:03', status: 'publish',
    siteScopes: {nodes: [{slug: 'tio2-my'}]},
    publishingFields: {publicPath: '/markets/european-union'},
    malaysiaEuMarketContractJson: JSON.stringify(approvedContract),
  })
}

beforeEach(() => {
  routeMocks.getCurrentSite.mockReturnValue(getSiteConfig('tio2-my'))
  routeMocks.getMalaysiaEuMarketPage.mockResolvedValue(marketPage())
})

afterEach(() => {
  vi.clearAllMocks()
  vi.resetModules()
})

describe('MARKET-EU-001 route integration', () => {
  it('renders the scoped server template and one two-node JSON-LD graph', async () => {
    const route = await import('@/app/markets/european-union/page')
    const markup = renderToStaticMarkup(await route.default())
    expect(routeMocks.getMalaysiaEuMarketPage).toHaveBeenCalledOnce()
    expect(markup).toContain('data-site-scope="tio2-my"')
    expect(markup.match(/<h1/gu)).toHaveLength(1)
    expect(markup).toContain(approvedContract.hero.h1)
    expect(markup.match(/<script type="application\/ld\+json">/gu)).toHaveLength(1)
    expect(markup).not.toMatch(/FAQPage|QAPage|ProductGroup|Offer|tio2-a|tio2-b/iu)
  })

  it('emits one normalized Malaysia canonical through Next Metadata', async () => {
    const route = await import('@/app/markets/european-union/page')
    const metadata = await route.generateMetadata()
    const canonical = metadata.alternates?.canonical
    expect(typeof canonical).toBe('string')
    const url = new URL(String(canonical))
    expect(url.href).toBe(approvedContract.seo.canonical)
    expect(url.protocol).toBe('https:')
    expect(url.hostname).toBe('tio2malaysia.com')
    expect(url.pathname).toBe('/markets/european-union/')
    expect(url.search + url.hash).toBe('')
  })

  it('returns not-found for non-Malaysia scope before any CMS query', async () => {
    routeMocks.getCurrentSite.mockReturnValue(getSiteConfig('tio2-a'))
    const route = await import('@/app/markets/european-union/page')
    await expect(route.default()).rejects.toMatchObject({digest: 'NEXT_HTTP_ERROR_FALLBACK;404'})
    expect(routeMocks.getMalaysiaEuMarketPage).not.toHaveBeenCalled()
  })

  it('propagates a missing Malaysia record as a server error', async () => {
    const sourceError = new GraphQLResponseError([{message: 'Malaysia EU Market record is unavailable.'}])
    routeMocks.getMalaysiaEuMarketPage.mockRejectedValue(sourceError)
    const route = await import('@/app/markets/european-union/page')
    await expect(route.default()).rejects.toBe(sourceError)
  })
})
