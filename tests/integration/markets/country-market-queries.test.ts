import {afterEach, expect, it, vi} from 'vitest'

import {getMalaysiaCountryMarketContract} from '@/lib/markets/malaysia-country-market-contracts'
import {getMalaysiaCountryMarketPage} from '@/lib/wordpress/market-country-v01-queries'

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

function responseFor(pageId: 'MARKET-EU-ES' | 'MARKET-IN-001' | 'MARKET-EU-NL' | 'MARKET-EU-BE') {
  const contract = getMalaysiaCountryMarketContract(pageId)
  return JSON.stringify({
    id: `country-${pageId}`, modifiedGmt: '2026-09-08T01:02:03', status: 'publish',
    recordPageId: pageId, siteScopes: {nodes: [{slug: 'tio2-my'}]},
    publishingFields: {publicPath: contract.identity.path.replace(/\/$/u, '')},
    malaysiaCountryMarketContractJson: JSON.stringify(contract),
  })
}

it.each([
  ['MARKET-EU-ES', '/markets/spain'],
  ['MARKET-IN-001', '/markets/india'],
  ['MARKET-EU-NL', '/markets/netherlands'],
  ['MARKET-EU-BE', '/markets/belgium'],
] as const)('queries only %s and uses scope-local cache tags', async (pageId, path) => {
  vi.stubEnv('WORDPRESS_GRAPHQL_URL', 'https://cms.example.test/graphql')
  const fetchMock = vi.fn(async (_url: unknown, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body))
    expect(body.query).toContain('malaysiaCountryMarketRecordJson')
    expect(body.variables).toEqual({pageId})
    return Response.json({data: {malaysiaCountryMarketRecordJson: responseFor(pageId)}})
  })
  vi.stubGlobal('fetch', fetchMock)
  expect((await getMalaysiaCountryMarketPage(pageId)).identity.pageId).toBe(pageId)
  expect((fetchMock.mock.calls[0]![1] as RequestInit & {next: {tags: string[]}}).next.tags).toEqual([
    'site:tio2-my', `route:tio2-my:${path}`, `content:tio2-my--market--${pageId}--en`,
  ])
})

it.each([
  {data: null, errors: [{message: 'missing record'}]},
  {data: {malaysiaCountryMarketRecordJson: null}},
  {data: {malaysiaCountryMarketRecordJson: '{}'}},
])('never falls back when the country Market CMS returns %j', async (result) => {
  vi.stubEnv('WORDPRESS_GRAPHQL_URL', 'https://cms.example.test/graphql')
  const fetchMock = vi.fn(async () => Response.json(result))
  vi.stubGlobal('fetch', fetchMock)
  await expect(getMalaysiaCountryMarketPage('MARKET-EU-ES')).rejects.toThrow()
  expect(fetchMock).toHaveBeenCalledOnce()
})
