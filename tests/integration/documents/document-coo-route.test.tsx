import {renderToStaticMarkup} from 'react-dom/server'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {toMalaysiaDocumentCooDto} from '@/lib/wordpress/document-coo-v04-dto'
import approvedContract from '@/tests/fixtures/documents/doc-coo/gate6/DOC-COO_GATE6_PUBLIC_PAYLOAD_V0.4.json'
import {getSiteConfig} from '@/sites'

const mocks = vi.hoisted(() => ({getCurrentSite: vi.fn(), getMalaysiaDocumentCoo: vi.fn()}))
vi.mock('@/lib/sites/current-site', () => ({getCurrentSite: mocks.getCurrentSite}))
vi.mock('@/lib/wordpress/document-coo-v04-queries', () => ({getMalaysiaDocumentCoo: mocks.getMalaysiaDocumentCoo}))

const dto = toMalaysiaDocumentCooDto({
  id: 'document-coo-1', modifiedGmt: '2026-09-08T08:00:00', status: 'publish',
  siteScopes: {nodes: [{slug: 'tio2-my'}]}, publishingFields: {publicPath: '/documents/certificate-of-origin'},
  malaysiaDocumentCooContractJson: JSON.stringify(approvedContract),
})

beforeEach(() => {
  mocks.getCurrentSite.mockReturnValue(getSiteConfig('tio2-my'))
  mocks.getMalaysiaDocumentCoo.mockResolvedValue(dto)
})
afterEach(() => { vi.clearAllMocks(); vi.resetModules() })

describe('DOC-COO route', () => {
  it('renders one scoped route and keeps raw CMS/governance fields outside public output', async () => {
    const route = await import('@/app/documents/certificate-of-origin/page')
    const element = await route.default()
    const publicPayload = JSON.stringify(element)
    const html = renderToStaticMarkup(element)
    expect(html).toContain('data-page-id="DOC-COO"')
    expect(html.match(/application\/ld\+json/gu)).toHaveLength(1)
    for (const forbidden of ['malaysiaDocumentCooContractJson', 'siteScopes', 'publishingFields', 'PROVISIONAL_URL', 'FACT_EVIDENCE_REQUIRED']) {
      expect(publicPayload).not.toContain(forbidden)
    }
  })

  it('fails before querying outside site_scope=tio2-my', async () => {
    mocks.getCurrentSite.mockReturnValue(getSiteConfig('tio2-b'))
    const route = await import('@/app/documents/certificate-of-origin/page')
    await expect(route.default()).rejects.toMatchObject({digest: 'NEXT_HTTP_ERROR_FALLBACK;404'})
    expect(mocks.getMalaysiaDocumentCoo).not.toHaveBeenCalled()
  })
})
