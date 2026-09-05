import {renderToStaticMarkup} from 'react-dom/server'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import approvedContract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-document-tds.json'
import {toMalaysiaDocumentTdsDto} from '@/lib/wordpress/document-tds-v01-dto'
import {getSiteConfig} from '@/sites'

const mocks = vi.hoisted(() => ({getCurrentSite: vi.fn(), getMalaysiaDocumentTds: vi.fn()}))
vi.mock('next/font/google', () => ({Inter: () => ({variable: 'inter-font'})}))
vi.mock('@/lib/sites/current-site', () => ({getCurrentSite: mocks.getCurrentSite}))
vi.mock('@/lib/wordpress/document-tds-v01-queries', () => ({getMalaysiaDocumentTds: mocks.getMalaysiaDocumentTds}))

const dto = toMalaysiaDocumentTdsDto({
  id: 'document-tds-1', modifiedGmt: '2026-09-05T01:02:03', status: 'publish',
  siteScopes: {nodes: [{slug: 'tio2-my'}]}, publishingFields: {publicPath: '/documents/tds-sds-coa'},
  malaysiaDocumentTdsContractJson: JSON.stringify(approvedContract),
  routeReadiness: {'CONV-DOC': true, 'DOC-000': true, 'DOC-REACH': false, 'DOC-COO': false},
})

beforeEach(() => {
  mocks.getCurrentSite.mockReturnValue(getSiteConfig('tio2-my'))
  mocks.getMalaysiaDocumentTds.mockResolvedValue(dto)
})
afterEach(() => { vi.clearAllMocks(); vi.resetModules() })

describe('DOC-TDS route', () => {
  it('does not pass governance or evidence controls across the public RSC client boundary', async () => {
    const route = await import('@/app/documents/tds-sds-coa/page')
    const publicPayload = JSON.stringify(await route.default())

    for (const forbidden of [
      'schema_version',
      'package_id',
      'PROVISIONAL_URL',
      'FACT_EVIDENCE_REQUIRED',
      'canonical_activation',
      'request_contract',
      'source_normalization',
      'render_when',
      'evidence_controls',
      'direct_downloads',
      'grade_document_availability_matrix',
      'buyer_visible_internal_terms',
      'guaranteed delivery',
      'routeReadiness',
    ]) expect(publicPayload).not.toContain(forbidden)
  })

  it('renders exactly one scoped page and one JSON-LD graph', async () => {
    const diagnostic = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const route = await import('@/app/documents/tds-sds-coa/page')
    const html = renderToStaticMarkup(await route.default())
    expect(html).toContain('data-page-id="DOC-TDS"')
    expect(html.match(/application\/ld\+json/gu)).toHaveLength(1)
    expect(html).toContain('"@type":"WebPage"')
    expect(diagnostic.mock.calls.flat().join(' ')).not.toContain('unique "key" prop')
    diagnostic.mockRestore()
  })

  it('fails before querying when the active site is not tio2-my', async () => {
    mocks.getCurrentSite.mockReturnValue(getSiteConfig('tio2-b'))
    const route = await import('@/app/documents/tds-sds-coa/page')
    await expect(route.default()).rejects.toMatchObject({digest: 'NEXT_HTTP_ERROR_FALLBACK;404'})
    expect(mocks.getMalaysiaDocumentTds).not.toHaveBeenCalled()
  })
})
