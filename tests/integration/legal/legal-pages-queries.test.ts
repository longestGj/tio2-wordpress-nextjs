import {afterEach, describe, expect, it, vi} from 'vitest'

import {GraphQLResponseError} from '@/lib/wordpress/client'
import {getMalaysiaLegalPages} from '@/lib/wordpress/legal-pages-v01-queries'
import approved from '@/wordpress/plugins/tio2-site-model/config/tio2-my-legal-pages.json'

const source = (scope = 'tio2-my') => approved.pages.map((page, index) => ({
  id: `legal-${index + 1}`, modifiedGmt: '2026-09-02T08:00:00', status: 'publish',
  siteScopes: {nodes: [{slug: scope}]}, publishingFields: {publicPath: page.path.replace(/\/$/, '')},
  malaysiaLegalPageContractJson: JSON.stringify(page),
}))

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

describe('Legal/Privacy GraphQL query isolation', () => {
  it('uses one non-null query and exact scope-local cache tags', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as {query: string; variables: Record<string, unknown>}
      expect(body.query).toContain('malaysiaLegalPagesRecordJson')
      expect(body.variables).toEqual({})
      return new Response(JSON.stringify({data: {malaysiaLegalPagesRecordJson: JSON.stringify(source())}}), {status: 200, headers: {'content-type': 'application/json'}})
    })
    vi.stubGlobal('fetch', fetchMock)
    vi.stubEnv('WORDPRESS_GRAPHQL_URL', 'https://cms.example.test/graphql')
    await expect(getMalaysiaLegalPages()).resolves.toHaveLength(3)
    const next = (fetchMock.mock.calls[0]?.[1] as RequestInit & {next?: {tags?: string[]}}).next
    expect(next?.tags).toEqual([
      'site:tio2-my', 'content:tio2-my--legal-pages', 'route:tio2-my:/privacy-policy',
      'route:tio2-my:/ms/privacy-policy', 'route:tio2-my:/cookie-policy',
    ])
    expect(JSON.stringify(fetchMock.mock.calls)).not.toMatch(/tio2-a|tio2-b|TIOVAR/iu)
  })

  it('fails closed for CMS errors and foreign scope with no fallback request', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({data: {malaysiaLegalPagesRecordJson: JSON.stringify(source('tio2-a'))}}), {status: 200, headers: {'content-type': 'application/json'}}))
    vi.stubGlobal('fetch', fetchMock); vi.stubEnv('WORDPRESS_GRAPHQL_URL', 'https://cms.example.test/graphql')
    await expect(getMalaysiaLegalPages()).rejects.toThrow(/site_scope=tio2-my/)
    expect(fetchMock).toHaveBeenCalledOnce()
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({data: null, errors: [{message: 'Legal pages missing'}]}), {status: 200, headers: {'content-type': 'application/json'}}))
    await expect(getMalaysiaLegalPages()).rejects.toBeInstanceOf(GraphQLResponseError)
  })
})
