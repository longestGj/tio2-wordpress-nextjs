import {afterEach, expect, it, vi} from 'vitest'
import contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-market-brazil-en.json'
import {getMalaysiaBrazilEnMarketPage} from '@/lib/wordpress/market-page-brazil-en-v01-queries'

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

it('requests only the Brazil EN singleton with site, route and exact page cache tags', async () => {
  vi.stubEnv('WORDPRESS_GRAPHQL_URL', 'https://cms.example.test/graphql')
  const fetchMock = vi.fn(async (_url: unknown, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body))
    expect(body.query).toContain('malaysiaBrazilEnMarketRecordJson')
    expect(body.variables).toEqual({})
    return Response.json({data: {malaysiaBrazilEnMarketRecordJson: JSON.stringify({
      id: 'brazil-en-1', modifiedGmt: '2026-09-08T01:02:03', status: 'publish',
      siteScopes: {nodes: [{slug: 'tio2-my'}]}, publishingFields: {publicPath: '/markets/brazil'},
      malaysiaBrazilEnMarketContractJson: JSON.stringify(contract),
    })}})
  })
  vi.stubGlobal('fetch', fetchMock)
  expect((await getMalaysiaBrazilEnMarketPage()).identity.pageId).toBe('MARKET-BR-EN')
  expect((fetchMock.mock.calls[0]![1] as RequestInit & {next: {tags: string[]}}).next.tags).toEqual([
    'site:tio2-my', 'route:tio2-my:/markets/brazil', 'content:tio2-my--market--MARKET-BR-EN--en',
  ])
})

it.each([
  {data: null, errors: [{message: 'missing Brazil record'}]},
  {data: {malaysiaBrazilEnMarketRecordJson: null}},
  {data: {malaysiaBrazilEnMarketRecordJson: '{}'}},
])('never substitutes initial JSON when the Brazil CMS response is $data', async result => {
  vi.stubEnv('WORDPRESS_GRAPHQL_URL', 'https://cms.example.test/graphql')
  const fetchMock = vi.fn(async () => Response.json(result))
  vi.stubGlobal('fetch', fetchMock)
  await expect(getMalaysiaBrazilEnMarketPage()).rejects.toThrow()
  expect(fetchMock).toHaveBeenCalledOnce()
})

it('rejects another site or language before creating a Brazil cache identity', async () => {
  const {marketPageContentTag} = await import('@/lib/wordpress/cache-tags')
  expect(() => marketPageContentTag('tio2-a', 'MARKET-BR-EN', 'en')).toThrow()
  expect(() => marketPageContentTag('tio2-my', 'MARKET-BR-EN', 'pt-BR')).toThrow()
})
