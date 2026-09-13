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

  it('returns changed CMS copy and rejects malformed resolver JSON without a fallback', async () => {
    const changed = source().map((record, index) => index === 0 ? {
      ...record,
      malaysiaLegalPageContractJson: JSON.stringify({
        ...approved.pages[0],
        buyerVisibleMarkdown: approved.pages[0]!.buyerVisibleMarkdown.replace('# Privacy Policy', '# Updated policy'),
        seo: {...approved.pages[0]!.seo, title: 'Updated privacy SEO', description: 'Published CMS description.'},
      }),
    } : record)
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      data: {malaysiaLegalPagesRecordJson: JSON.stringify(changed)},
    }), {status: 200, headers: {'content-type': 'application/json'}}))
    vi.stubGlobal('fetch', fetchMock)
    vi.stubEnv('WORDPRESS_GRAPHQL_URL', 'https://cms.example.test/graphql')

    const pages = await getMalaysiaLegalPages()
    expect(pages[0]?.buyerVisibleMarkdown).toContain('# Updated policy')
    expect(pages[0]?.seo).toMatchObject({title: 'Updated privacy SEO', description: 'Published CMS description.'})

    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({
      data: {malaysiaLegalPagesRecordJson: '{not-json'},
    }), {status: 200, headers: {'content-type': 'application/json'}}))
    await expect(getMalaysiaLegalPages()).rejects.toThrow()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
