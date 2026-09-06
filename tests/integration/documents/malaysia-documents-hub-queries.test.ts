import {afterEach, describe, expect, it, vi} from 'vitest'

import {GraphQLResponseError} from '@/lib/wordpress/client'
import {getMalaysiaDocumentsHub} from '@/lib/wordpress/documents-hub-v01-queries'
import contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-documents-hub.json'

const source = (scope = 'tio2-my') => ({
  id: 'documents-hub-1', modifiedGmt: '2026-09-02T01:02:03', status: 'publish',
  siteScopes: {nodes: [{slug: scope}]}, publishingFields: {publicPath: '/documents'},
  malaysiaDocumentsHubContractJson: JSON.stringify(contract),
})

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

describe('DOC-000 GraphQL query isolation', () => {
  it('uses one non-null Malaysia query and only scope-local cache tags', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as {query: string; variables: Record<string, unknown>}
      expect(body.query).toContain('malaysiaDocumentsHubRecordJson')
      expect(body.variables).toEqual({})
      return new Response(JSON.stringify({data: {malaysiaDocumentsHubRecordJson: JSON.stringify(source())}}), {status: 200, headers: {'content-type': 'application/json'}})
    })
    vi.stubGlobal('fetch', fetchMock)
    vi.stubEnv('WORDPRESS_GRAPHQL_URL', 'https://cms.example.test/graphql')
    await expect(getMalaysiaDocumentsHub()).resolves.toMatchObject({identity: {siteId: 'tio2-my', path: '/documents'}})
    const next = (fetchMock.mock.calls[0]?.[1] as RequestInit & {next?: {tags?: string[]}}).next
    expect(next?.tags).toEqual(['site:tio2-my', 'route:tio2-my:/documents', 'content:tio2-my--documents'])
    expect(JSON.stringify(fetchMock.mock.calls)).not.toMatch(/tio2-a|tio2-b/iu)
  })

  it('surfaces missing CMS data as an error with one request and no fallback', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({data: null, errors: [{message: 'The Malaysia Documents Hub record is missing.'}]}), {status: 200, headers: {'content-type': 'application/json'}}))
    vi.stubGlobal('fetch', fetchMock)
    vi.stubEnv('WORDPRESS_GRAPHQL_URL', 'https://cms.example.test/graphql')
    await expect(getMalaysiaDocumentsHub()).rejects.toBeInstanceOf(GraphQLResponseError)
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('rejects a cross-scope record without another query', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({data: {malaysiaDocumentsHubRecordJson: JSON.stringify(source('tio2-a'))}}), {status: 200, headers: {'content-type': 'application/json'}}))
    vi.stubGlobal('fetch', fetchMock)
    vi.stubEnv('WORDPRESS_GRAPHQL_URL', 'https://cms.example.test/graphql')
    await expect(getMalaysiaDocumentsHub()).rejects.toThrow('Content belongs to tio2-a, not tio2-my')
    expect(fetchMock).toHaveBeenCalledOnce()
  })
})
