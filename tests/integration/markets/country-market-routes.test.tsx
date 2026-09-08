import {afterEach, expect, it, vi} from 'vitest'

import {getSiteConfig} from '@/sites'
import {getMalaysiaCountryMarketContract, type MalaysiaCountryMarketPageId} from '@/lib/markets/malaysia-country-market-contracts'
import {toMalaysiaCountryMarketPageDto} from '@/lib/wordpress/market-country-v01-dto'

const boundary = vi.hoisted(() => ({site: vi.fn(), query: vi.fn()}))
vi.mock('next/font/google', () => ({Inter: () => ({variable: 'test-country-market-font'})}))
vi.mock('@/lib/sites/current-site', () => ({getCurrentSite: boundary.site}))
vi.mock('@/lib/wordpress/market-country-v01-queries', () => ({getMalaysiaCountryMarketPage: boundary.query}))

afterEach(() => { vi.clearAllMocks(); vi.resetModules() })

const routes = {
  'MARKET-EU-ES': () => import('@/app/markets/spain/page'),
  'MARKET-IN-001': () => import('@/app/markets/india/page'),
  'MARKET-EU-NL': () => import('@/app/markets/netherlands/page'),
  'MARKET-EU-BE': () => import('@/app/markets/belgium/page'),
} as const

function dto(pageId: MalaysiaCountryMarketPageId) {
  const contract = getMalaysiaCountryMarketContract(pageId)
  return toMalaysiaCountryMarketPageDto(pageId, {
    id: `market-${pageId}`, modifiedGmt: '2026-09-08T01:02:03', status: 'publish', recordPageId: pageId,
    siteScopes: {nodes: [{slug: 'tio2-my'}]}, publishingFields: {publicPath: contract.identity.path.replace(/\/$/u, '')},
    malaysiaCountryMarketContractJson: JSON.stringify(contract),
  })
}

it.each(Object.keys(routes) as MalaysiaCountryMarketPageId[])('%s rejects another site before querying body or metadata', async (pageId) => {
  boundary.site.mockReturnValue(getSiteConfig('tio2-a'))
  const route = await routes[pageId]()
  await expect(route.default()).rejects.toMatchObject({digest: 'NEXT_HTTP_ERROR_FALLBACK;404'})
  await expect(route.generateMetadata()).rejects.toMatchObject({digest: 'NEXT_HTTP_ERROR_FALLBACK;404'})
  expect(boundary.query).not.toHaveBeenCalled()
})

it.each(Object.keys(routes) as MalaysiaCountryMarketPageId[])('%s requests only its own CMS record and produces metadata', async (pageId) => {
  boundary.site.mockReturnValue(getSiteConfig('tio2-my'))
  boundary.query.mockResolvedValue(dto(pageId))
  const route = await routes[pageId]()
  const page = await route.default()
  expect(page.props.marketPage.identity.pageId).toBe(pageId)
  expect(boundary.query).toHaveBeenCalledWith(pageId)
  expect((await route.generateMetadata()).alternates).toEqual({canonical: getMalaysiaCountryMarketContract(pageId).seo.canonical})
})

it('propagates a missing CMS error with no null or fallback page', async () => {
  boundary.site.mockReturnValue(getSiteConfig('tio2-my'))
  const error = new Error('Controlled missing Malaysia record')
  boundary.query.mockRejectedValue(error)
  const route = await routes['MARKET-EU-ES']()
  await expect(route.default()).rejects.toBe(error)
  await expect(route.generateMetadata()).rejects.toBe(error)
})
