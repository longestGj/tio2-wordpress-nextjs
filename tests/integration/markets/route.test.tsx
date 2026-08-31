import {renderToStaticMarkup} from 'react-dom/server'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {toMalaysiaMarketHubDto} from '@/lib/wordpress/market-hub-v01-dto'
import {getSiteConfig} from '@/sites'
import approvedContract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-market-hub.json'

const routeMocks = vi.hoisted(() => ({
  getCurrentSite: vi.fn(),
  getMalaysiaMarketHub: vi.fn(),
}))

vi.mock('@/lib/sites/current-site', () => ({getCurrentSite: routeMocks.getCurrentSite}))
vi.mock('@/lib/wordpress/market-hub-v01-queries', () => ({
  getMalaysiaMarketHub: routeMocks.getMalaysiaMarketHub,
}))

function marketHub() {
  return toMalaysiaMarketHubDto({
    id: 'market-hub-my-1', modifiedGmt: '2026-08-31T01:02:03', status: 'publish',
    siteScopes: {nodes: [{slug: 'tio2-my'}]}, publishingFields: {publicPath: '/markets'},
    malaysiaMarketHubContractJson: JSON.stringify(approvedContract),
  })
}

beforeEach(() => {
  routeMocks.getCurrentSite.mockReturnValue(getSiteConfig('tio2-my'))
  routeMocks.getMalaysiaMarketHub.mockResolvedValue(marketHub())
})

afterEach(() => {
  vi.clearAllMocks()
  vi.resetModules()
})

describe('MARKET-000 route integration', () => {
  it('renders the scoped template and one three-node JSON-LD graph', async () => {
    const route = await import('@/app/markets/page')
    const markup = renderToStaticMarkup(await route.default())

    expect(routeMocks.getMalaysiaMarketHub).toHaveBeenCalledOnce()
    expect(markup).toContain('data-site-scope="tio2-my"')
    expect(markup.match(/<h1/gu)).toHaveLength(1)
    expect(markup).toContain('Choose Your Destination Market')
    expect(markup.match(/data-market-action=/gu)).toHaveLength(10)
    expect(markup.match(/<script type="application\/ld\+json">/gu)).toHaveLength(1)
    expect(markup).not.toMatch(/FAQPage|QAPage|MARKET-BR-PT|RES-TRADE/iu)
  })

  it('emits one normalized Malaysia canonical through Next Metadata', async () => {
    const route = await import('@/app/markets/page')
    const metadata = await route.generateMetadata()
    const canonical = metadata.alternates?.canonical
    expect(typeof canonical).toBe('string')
    expect([canonical].filter(Boolean)).toHaveLength(1)
    const url = new URL(String(canonical))
    expect(url.href).toBe('https://tio2malaysia.com/markets/')
    expect(url.protocol).toBe('https:')
    expect(url.hostname).toBe('tio2malaysia.com')
    expect(url.pathname).toBe('/markets/')
    expect(url.search + url.hash).toBe('')
  })

  it('returns not-found for every non-Malaysia scope without querying a fallback', async () => {
    routeMocks.getCurrentSite.mockReturnValue(getSiteConfig('tio2-a'))
    const route = await import('@/app/markets/page')
    await expect(route.default()).rejects.toMatchObject({
      digest: 'NEXT_HTTP_ERROR_FALLBACK;404',
    })
    expect(routeMocks.getMalaysiaMarketHub).not.toHaveBeenCalled()
  })
})
