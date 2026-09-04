import {renderToStaticMarkup} from 'react-dom/server'
import {describe, expect, it} from 'vitest'

import {MalaysiaDocumentTdsPage} from '@/components/sites/tio2-my/documents/document-tds-page'
import approvedContract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-document-tds.json'
import {toMalaysiaDocumentTdsDto} from '@/lib/wordpress/document-tds-v01-dto'

function page(readiness: Record<string, boolean>) {
  return toMalaysiaDocumentTdsDto({
    id: 'document-tds-1', modifiedGmt: '2026-09-05T01:02:03', status: 'publish',
    siteScopes: {nodes: [{slug: 'tio2-my'}]}, publishingFields: {publicPath: '/documents/tds-sds-coa'},
    malaysiaDocumentTdsContractJson: JSON.stringify(approvedContract), routeReadiness: readiness,
  })
}

const ready = {'CONV-DOC': true, 'DOC-000': true, 'DOC-REACH': false, 'DOC-COO': false}

describe('DOC-TDS page template', () => {
  it('renders the exact module order, one H1, shared Chrome and all FAQ answers in SSR HTML', () => {
    const html = renderToStaticMarkup(<MalaysiaDocumentTdsPage page={page(ready)} structuredData={null} />)
    const modules = [...html.matchAll(/data-module="([^"]+)"/gu)].map((match) => match[1])
    expect(modules).toEqual(approvedContract.modules.map((module) => module.id))
    expect(html.match(/<h1/gu)).toHaveLength(1)
    expect(html).toContain('data-page-id="DOC-TDS"')
    expect(html).toContain('aria-current="page"><span>Documents</span>')
    const questions = approvedContract.modules[7] as {items: Array<{answer: string}>}
    for (const item of questions.items) expect(html).toContain(item.answer)
  })

  it('uses one synchronized href for all three primary actions', () => {
    const html = renderToStaticMarkup(<MalaysiaDocumentTdsPage page={page(ready)} structuredData={null} />)
    const hrefs = [...html.matchAll(/data-doc-request="primary"[^>]*href="([^"]+)"/gu)].map((match) => match[1])
    expect(hrefs).toHaveLength(3)
    expect(new Set(hrefs)).toEqual(new Set(['/request-documents/']))
  })

  it('removes all request actions and unavailable related cards atomically when routes are ineligible', () => {
    const html = renderToStaticMarkup(<MalaysiaDocumentTdsPage page={page({
      'CONV-DOC': false, 'DOC-000': false, 'DOC-REACH': false, 'DOC-COO': false,
    })} structuredData={null} />)
    expect(html).not.toContain('data-doc-request="primary"')
    expect(html).not.toContain('data-related-page-id=')
    const main = html.match(/<main[\s\S]*?<\/main>/u)?.[0] ?? ''
    expect(main).not.toMatch(/href="\/contact|mailto:|tel:|request-a-quote/iu)
    expect(html).toContain('data-source-page="DOC-TDS"')
  })
})
