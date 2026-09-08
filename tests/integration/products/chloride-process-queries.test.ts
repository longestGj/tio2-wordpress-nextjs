import {afterEach, expect, it, vi} from 'vitest'
import contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-product-process-chloride.json'
import {getMalaysiaChlorideProcessPage} from '@/lib/wordpress/product-process-chloride-v01-queries'

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

it('requests only the scoped Chloride Process singleton with contract-compatible tags', async () => {
  vi.stubEnv('WORDPRESS_GRAPHQL_URL', 'https://cms.example.test/graphql')
  const fetchMock = vi.fn(async (_url: unknown, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body))
    expect(body.query).toContain('malaysiaChlorideProcessRecordJson')
    expect(body.variables).toEqual({})
    return Response.json({data: {malaysiaChlorideProcessRecordJson: JSON.stringify({
      id: 'chloride-process-1', modifiedGmt: '2026-09-08T01:02:03', status: 'publish',
      siteScopes: {nodes: [{slug: 'tio2-my'}]},
      publishingFields: {publicPath: '/products/chloride-process-titanium-dioxide'},
      malaysiaChlorideProcessContractJson: JSON.stringify(contract),
    })}})
  })
  vi.stubGlobal('fetch', fetchMock)
  expect((await getMalaysiaChlorideProcessPage()).identity.pageId).toBe('PRODUCT-PROC-CL')
  expect((fetchMock.mock.calls[0]![1] as RequestInit & {next: {tags: string[]}}).next.tags).toEqual([
    'site:tio2-my',
    'route:tio2-my:/products/chloride-process-titanium-dioxide',
    'content:tio2-my--product-process--PRODUCT-PROC-CL--en--product-process-chloride-v0.1',
  ])
})

it.each([
  {data: null, errors: [{message: 'missing Chloride Process record'}]},
  {data: {malaysiaChlorideProcessRecordJson: null}},
  {data: {malaysiaChlorideProcessRecordJson: '{}'}},
])('never substitutes initial JSON when the CMS response is $data', async result => {
  vi.stubEnv('WORDPRESS_GRAPHQL_URL', 'https://cms.example.test/graphql')
  const fetchMock = vi.fn(async () => Response.json(result))
  vi.stubGlobal('fetch', fetchMock)
  await expect(getMalaysiaChlorideProcessPage()).rejects.toThrow()
  expect(fetchMock).toHaveBeenCalledOnce()
})
