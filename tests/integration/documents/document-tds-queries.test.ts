import {afterEach, describe, expect, it, vi} from 'vitest'

import {GraphQLResponseError} from '@/lib/wordpress/client'
import {getMalaysiaDocumentTds} from '@/lib/wordpress/document-tds-v01-queries'
import contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-document-tds.json'

const source = (scope = 'tio2-my') => ({
  id: 'document-tds-1', modifiedGmt: '2026-09-05T01:02:03', status: 'publish',
  siteScopes: {nodes: [{slug: scope}]}, publishingFields: {publicPath: '/documents/tds-sds-coa'},
  malaysiaDocumentTdsContractJson: JSON.stringify(contract),
  routeReadiness: {'CONV-DOC': true, 'DOC-000': true, 'DOC-REACH': false, 'DOC-COO': false},
})

afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

describe('DOC-TDS GraphQL isolation', () => {
  it('uses one non-null Malaysia query and exact scope-local cache tags', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as {query: string; variables: Record<string, unknown>}
      expect(body.query).toContain('malaysiaDocumentTdsRecordJson')
      expect(body.variables).toEqual({})
      return new Response(JSON.stringify({data: {malaysiaDocumentTdsRecordJson: JSON.stringify(source())}}))
    })
    vi.stubGlobal('fetch', fetchMock)
    vi.stubEnv('WORDPRESS_GRAPHQL_URL', 'https://cms.example.test/graphql')
    await expect(getMalaysiaDocumentTds()).resolves.toMatchObject({page: {page_id: 'DOC-TDS'}})
    const next = (fetchMock.mock.calls[0]?.[1] as RequestInit & {next?: {tags?: string[]}}).next
    expect(next?.tags).toEqual([
      'route:tio2-my:/documents/tds-sds-coa', 'content:tio2-my--document-tds',
    ])
    expect(JSON.stringify(fetchMock.mock.calls)).not.toMatch(/tio2-a|tio2-b/iu)
  })

  it('propagates a missing record as an error without fallback', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      data: null, errors: [{message: 'The Malaysia DOC-TDS record is missing.'}],
    })))
    vi.stubGlobal('fetch', fetchMock)
    await expect(getMalaysiaDocumentTds()).rejects.toBeInstanceOf(GraphQLResponseError)
    expect(fetchMock).toHaveBeenCalledOnce()
  })
})
