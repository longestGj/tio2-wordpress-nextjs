import {afterEach, expect, it, vi} from 'vitest'
import contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-market-brazil-pt.json'
import {getMalaysiaBrazilPtMarketPage} from '@/lib/wordpress/market-page-brazil-pt-v02-queries'

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

it('requests only the Brazil PT singleton with exact site, route, page and locale tags', async () => {
  vi.stubEnv('WORDPRESS_GRAPHQL_URL', 'https://cms.example.test/graphql')
  const fetchMock = vi.fn(async (_url: unknown, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body))
    expect(body.query).toContain('malaysiaBrazilPtMarketRecordJson')
    expect(body.variables).toEqual({})
    return Response.json({data: {malaysiaBrazilPtMarketRecordJson: JSON.stringify({
      id: 'brazil-pt-1', modifiedGmt: '2026-09-08T01:02:03', status: 'publish',
      siteScopes: {nodes: [{slug: 'tio2-my'}]}, publishingFields: {publicPath: '/pt-br/markets/brazil'},
      malaysiaBrazilPtMarketContractJson: JSON.stringify(contract),
    })}})
  })
  vi.stubGlobal('fetch', fetchMock)
  expect((await getMalaysiaBrazilPtMarketPage()).identity.pageId).toBe('MARKET-BR-PT')
  expect((fetchMock.mock.calls[0]![1] as RequestInit & {next: {tags: string[]}}).next.tags).toEqual([
    'site:tio2-my', 'route:tio2-my:/pt-br/markets/brazil', 'content:tio2-my--market--MARKET-BR-PT--pt-BR',
  ])
})

it.each([
  {data: null, errors: [{message: 'missing Brazil PT record'}]},
  {data: {malaysiaBrazilPtMarketRecordJson: null}},
  {data: {malaysiaBrazilPtMarketRecordJson: '{}'}},
])('never substitutes checked-in JSON when the PT CMS response is $data', async result => {
  vi.stubEnv('WORDPRESS_GRAPHQL_URL', 'https://cms.example.test/graphql')
  const fetchMock = vi.fn(async () => Response.json(result))
  vi.stubGlobal('fetch', fetchMock)
  await expect(getMalaysiaBrazilPtMarketPage()).rejects.toThrow()
  expect(fetchMock).toHaveBeenCalledOnce()
})

it('rejects foreign site, wrong page or wrong locale before creating a cache identity', async () => {
  const {marketPageContentTag} = await import('@/lib/wordpress/cache-tags')
  expect(() => marketPageContentTag('tio2-a', 'MARKET-BR-PT', 'pt-BR')).toThrow()
  expect(() => marketPageContentTag('tio2-my', 'MARKET-BR-PT', 'en')).toThrow()
  expect(() => marketPageContentTag('tio2-my', 'MARKET-BR-EN', 'pt-BR')).toThrow()
})
