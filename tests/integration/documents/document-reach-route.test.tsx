import {renderToStaticMarkup} from 'react-dom/server'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import approvedContract from '@/tests/fixtures/documents/doc-reach/gate7/DOC-REACH_GATE7_SOURCE_PAYLOAD_V0.1.json'
import {toMalaysiaDocumentReachDto} from '@/lib/wordpress/document-reach-v01-dto'
import {getSiteConfig} from '@/sites'

const mocks = vi.hoisted(() => ({getCurrentSite: vi.fn(), getMalaysiaDocumentReach: vi.fn()}))
vi.mock('next/font/google', () => ({Inter: () => ({variable: 'inter-font'})}))
vi.mock('@/lib/sites/current-site', () => ({getCurrentSite: mocks.getCurrentSite}))
vi.mock('@/lib/wordpress/document-reach-v01-queries', () => ({getMalaysiaDocumentReach: mocks.getMalaysiaDocumentReach}))

const dto = toMalaysiaDocumentReachDto({
  id: 'document-reach-1', modifiedGmt: '2026-09-05T01:02:03', status: 'publish',
  siteScopes: {nodes: [{slug: 'tio2-my'}]}, publishingFields: {publicPath: '/documents/reach'},
  malaysiaDocumentReachContractJson: JSON.stringify(approvedContract),
  routeReadiness: {'CONV-DOC': true, 'DOC-000': true, 'MARKET-EU-001': true},
  sourceReadiness: Object.fromEntries((approvedContract.modules[6].items as Array<{url: string}>).map(({url}) => [url, true])),
})

beforeEach(() => {
  mocks.getCurrentSite.mockReturnValue(getSiteConfig('tio2-my'))
  mocks.getMalaysiaDocumentReach.mockResolvedValue(dto)
})
afterEach(() => { vi.clearAllMocks(); vi.resetModules() })

describe('DOC-REACH route', () => {
  it('keeps governance and dependency state outside the public component boundary', async () => {
    const route = await import('@/app/documents/reach/page')
    const publicPayload = JSON.stringify(await route.default())
    for (const forbidden of [
      'schema_version', 'package_id', 'PROVISIONAL_URL', 'FACT_EVIDENCE_REQUIRED',
      'canonical_activation', 'request_contract', 'source_normalization', 'render_when',
      'evidence_controls', 'routeReadiness',
    ]) expect(publicPayload).not.toContain(forbidden)
  })

  it('renders one scoped page and exactly one two-node JSON-LD graph', async () => {
    const route = await import('@/app/documents/reach/page')
    const html = renderToStaticMarkup(await route.default())
    expect(html).toContain('data-page-id="DOC-REACH"')
    expect(html.match(/application\/ld\+json/gu)).toHaveLength(1)
    expect(html.match(/"@type":"(WebPage|BreadcrumbList)"/gu)).toHaveLength(2)
  })

  it('fails before querying outside site_scope=tio2-my', async () => {
    mocks.getCurrentSite.mockReturnValue(getSiteConfig('tio2-b'))
    const route = await import('@/app/documents/reach/page')
    await expect(route.default()).rejects.toMatchObject({digest: 'NEXT_HTTP_ERROR_FALLBACK;404'})
    expect(mocks.getMalaysiaDocumentReach).not.toHaveBeenCalled()
  })
})
