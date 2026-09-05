import {afterEach, describe, expect, it, vi} from 'vitest'

import {getMalaysiaDocumentReach} from '@/lib/wordpress/document-reach-v01-queries'
import approvedContract from '@/tests/fixtures/documents/doc-reach/gate7/DOC-REACH_GATE7_SOURCE_PAYLOAD_V0.1.json'

afterEach(() => vi.restoreAllMocks())

describe('DOC-REACH GraphQL query', () => {
  it('uses the exact Malaysia field and scope-separated route/content cache tags', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (_input, init) => {
      const body = JSON.parse(String(init?.body)) as {query: string}
      expect(body.query).toContain('malaysiaDocumentReachRecordJson')
      return new Response(JSON.stringify({data: {malaysiaDocumentReachRecordJson: JSON.stringify({
        id: 'document-reach-901', modifiedGmt: '2026-09-05T01:02:03', status: 'publish',
        siteScopes: {nodes: [{slug: 'tio2-my'}]}, publishingFields: {publicPath: '/documents/reach'},
        malaysiaDocumentReachContractJson: JSON.stringify(approvedContract),
        routeReadiness: {'CONV-DOC': true, 'DOC-000': true, 'MARKET-EU-001': true},
        sourceReadiness: Object.fromEntries((approvedContract.modules[6].items as Array<{url: string}>).map(({url}) => [url, true])),
      })}}), {status: 200, headers: {'content-type': 'application/json'}})
    })
    const dto = await getMalaysiaDocumentReach()
    expect(dto.page.page_id).toBe('DOC-REACH')
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock.mock.calls[0]?.[1]?.next).toMatchObject({
      tags: ['route:tio2-my:/documents/reach', 'content:tio2-my--document-reach'],
    })
  })
})
