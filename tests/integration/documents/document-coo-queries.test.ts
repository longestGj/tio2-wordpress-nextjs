import {afterEach, describe, expect, it, vi} from 'vitest'

import {getMalaysiaDocumentCoo} from '@/lib/wordpress/document-coo-v04-queries'
import approvedContract from '@/tests/fixtures/documents/doc-coo/gate6/DOC-COO_GATE6_PUBLIC_PAYLOAD_V0.4.json'

afterEach(() => vi.restoreAllMocks())

describe('DOC-COO GraphQL query', () => {
  it('uses the exact Malaysia field and page-specific route/content cache tags', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (_input, init) => {
      const body = JSON.parse(String(init?.body)) as {query: string}
      expect(body.query).toContain('malaysiaDocumentCooRecordJson')
      return new Response(JSON.stringify({data: {malaysiaDocumentCooRecordJson: JSON.stringify({
        id: 'document-coo-1', modifiedGmt: '2026-09-08T08:00:00', status: 'publish',
        siteScopes: {nodes: [{slug: 'tio2-my'}]}, publishingFields: {publicPath: '/documents/certificate-of-origin'},
        malaysiaDocumentCooContractJson: JSON.stringify(approvedContract),
      })}}), {status: 200, headers: {'content-type': 'application/json'}})
    })
    expect((await getMalaysiaDocumentCoo()).identity.pageId).toBe('DOC-COO')
    expect(fetchMock.mock.calls[0]?.[1]?.next).toMatchObject({tags: [
      'route:tio2-my:/documents/certificate-of-origin',
      'content:tio2-my--document-coo',
    ]})
  })
})
