import {renderToStaticMarkup} from 'react-dom/server'
import {describe, expect, it} from 'vitest'

import {MalaysiaDocumentReachPage} from '@/components/sites/tio2-my/documents/document-reach-page'
import {toDocumentReachRenderModel} from '@/lib/documents/document-reach-render-model'
import approvedContract from '@/tests/fixtures/documents/doc-reach/gate7/DOC-REACH_GATE7_SOURCE_PAYLOAD_V0.1.json'
import {toMalaysiaDocumentReachDto} from '@/lib/wordpress/document-reach-v01-dto'

const allSourcesReady = Object.freeze(Object.fromEntries(
  (approvedContract.modules[6].items as Array<{url: string}>).map(({url}) => [url, true]),
))

function renderPage(
  readiness: Record<string, boolean>,
  sourceReadiness: Record<string, boolean> = allSourcesReady,
) {
  const dto = toMalaysiaDocumentReachDto({
    id: 'document-reach-1', modifiedGmt: '2026-09-05T01:02:03', status: 'publish',
    siteScopes: {nodes: [{slug: 'tio2-my'}]}, publishingFields: {publicPath: '/documents/reach'},
    malaysiaDocumentReachContractJson: JSON.stringify(approvedContract), routeReadiness: readiness,
    sourceReadiness,
  })
  return renderToStaticMarkup(<MalaysiaDocumentReachPage
    page={toDocumentReachRenderModel(dto)} structuredData={null}
  />)
}

const ready = {'CONV-DOC': true, 'DOC-000': true, 'MARKET-EU-001': true}

describe('DOC-REACH server page template', () => {
  it('renders one H1, exact eleven-module order and every FAQ answer in initial HTML', () => {
    const html = renderPage(ready)
    expect([...html.matchAll(/data-module="([^"]+)"/gu)].map((match) => match[1]))
      .toEqual(approvedContract.modules.map((module) => module.id))
    expect(html.match(/<h1/gu)).toHaveLength(1)
    expect(html).toContain('data-site-scope="tio2-my"')
    expect(html).toContain('data-page-id="DOC-REACH"')
    expect(html).toContain('aria-current="page"><span>Documents</span>')
    const faq = approvedContract.modules[8] as {items: Array<{answer: string}>}
    for (const item of faq.items) expect(html).toContain(item.answer)
    expect(html.match(/<button type="button" aria-expanded="false" aria-controls="doc-reach-answer-/gu)).toHaveLength(5)
    expect(html).not.toContain('<summary>')
  })

  it('renders exact approved answer and four source rows without inventing missing source dates', () => {
    const html = renderPage(ready)
    expect(html).toContain(approvedContract.answer_decision.approved_general_answer)
    expect(html.match(/data-official-source=/gu)).toHaveLength(4)
    expect(html.match(/Source updated:/gu)).toHaveLength(2)
    expect(html.match(/Site reviewed:/gu)).toHaveLength(4)
    const sourceItems = (approvedContract.modules[6] as {items: Array<{url: string}>}).items
    for (const source of sourceItems) {
      expect(html).toContain(`href="${source.url}"`)
      expect(new URL(source.url).protocol).toBe('https:')
    }
  })

  it('removes every field of one stale source row while retaining the other current rows', () => {
    const stale = (approvedContract.modules[6].items as Array<{
      name: string; scope: string; source_updated_date: string | null
      site_reviewed_date: string; link_label: string; url: string
    }>)[2]!
    const html = renderPage(ready, {...allSourcesReady, [stale.url]: false})
    expect(html.match(/data-official-source=/gu)).toHaveLength(3)
    for (const value of [stale.name, stale.scope, stale.source_updated_date, stale.link_label, stale.url]) {
      if (!value) continue
      expect(html).not.toContain(value)
    }
    expect(html.match(/Source updated:/gu)).toHaveLength(1)
  })

  it('keeps governance, query-only and excluded propositions out of buyer-visible HTML', () => {
    const html = renderPage(ready)
    for (const forbidden of [
      approvedContract.answer_decision.excluded_stronger_proposition,
      approvedContract.seo.query_language_only[0],
      'PROVISIONAL_URL', 'FACT_EVIDENCE_REQUIRED', 'receiver_state', 'render_when',
      'registration number', 'tonnage band',
    ]) expect(html.toLowerCase()).not.toContain(forbidden.toLowerCase())
  })

  it('uses the exact receiver href three times and its public semantic selection label', () => {
    const html = renderPage(ready)
    const hrefs = [...html.matchAll(/data-document-reach-request="primary"[^>]*href="([^"]+)"/gu)]
      .map((match) => match[1].replaceAll('&amp;', '&'))
    expect(hrefs).toHaveLength(3)
    expect(new Set(hrefs)).toEqual(new Set([
      '/request-documents/?document_types%5B%5D=other&additional_requirements=REACH%20documentation',
    ]))
    expect(html).toContain('REACH Documentation')
    expect(html).not.toContain('Other Documentation')
  })

  it('removes request action, selection panel and note atomically while retaining ready independent links', () => {
    const html = renderPage({'CONV-DOC': false, 'DOC-000': true, 'MARKET-EU-001': false})
    expect(html).not.toContain('data-document-reach-request=')
    expect(html).not.toContain('data-request-selection=')
    expect(html).not.toContain('Submission does not confirm document availability.')
    expect(html).toContain('data-related-page-id="DOC-000"')
    expect(html).not.toContain('data-related-page-id="MARKET-EU-001"')
    const main = html.match(/<main[\s\S]*?<\/main>/u)?.[0] ?? ''
    expect(main).not.toMatch(/href="\/contact|mailto:|tel:|request-a-quote/iu)
  })
})
