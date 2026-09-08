import {renderToStaticMarkup} from 'react-dom/server'
import {describe, expect, it} from 'vitest'

import {MalaysiaApplicationHub} from '@/components/sites/tio2-my/applications/malaysia-application-hub'
import {toMalaysiaApplicationHubDto} from '@/lib/wordpress/application-hub-v01-dto'
import contract from '@/wordpress/plugins/tio2-site-model/config/tio2-my-application-hub.json'

function dto(overrides: Record<string, boolean> = {}) {
  return toMalaysiaApplicationHubDto({
    id: 'application-hub-1', modifiedGmt: '2026-09-08T08:00:00', status: 'publish',
    siteScopes: {nodes: [{slug: 'tio2-my'}]}, publishingFields: {publicPath: '/applications'},
    malaysiaApplicationHubContractJson: JSON.stringify(contract),
    routeReadiness: Object.fromEntries(contract.routeRegistry.map((route) => [route.targetPageId, overrides[route.targetPageId] ?? true])),
  })
}

describe('APP-000 renderer', () => {
  it('renders exact module order and 30 grade occurrences without public internal IDs', () => {
    const markup = renderToStaticMarkup(<MalaysiaApplicationHub applicationHub={dto()} />)
    expect([...markup.matchAll(/data-module="([^"]+)"/gu)].map((match) => match[1])).toEqual([
      'breadcrumb', 'hero', 'application-paths', 'evaluation-guide', 'procurement-paths', 'final-rfq',
    ])
    expect((markup.match(/data-grade-occurrence=/gu) ?? [])).toHaveLength(30)
    expect(markup).not.toContain('source_page_id')
    expect(markup).not.toContain('site_scope')
  })

  it('uses atomic omission and plain grade fallback for unavailable targets', () => {
    const markup = renderToStaticMarkup(<MalaysiaApplicationHub applicationHub={dto({
      'APP-COAT': false, 'GRADE-M350': false, 'DOC-000': false, 'CONV-RFQ': false,
    })} />)
    expect(markup).not.toContain('data-application-action="APP-COAT"')
    expect(markup).toContain('data-grade-occurrence="APP000-EDGE-COAT-01"')
    expect(markup).toContain('data-grade-state="plain"')
    expect(markup).not.toContain('data-support-action="DOC-000"')
    expect(markup).not.toContain('data-module="final-rfq"')
  })

  it.each([
    ['child application', {'APP-COAT': false}, 'data-application-action="APP-COAT"'],
    ['grade', {'GRADE-M350': false}, 'href="/products/m-350/" data-grade-state="linked"'],
    ['product support', {'PRODUCT-000': false}, 'data-support-action="PRODUCT-000"'],
    ['document support', {'DOC-000': false}, 'data-support-action="DOC-000"'],
    ['market support', {'MARKET-000': false}, 'data-support-action="MARKET-000"'],
  ])('omits only the unavailable %s destination', (_label, readiness, prohibited) => {
    const markup = renderToStaticMarkup(<MalaysiaApplicationHub applicationHub={dto(readiness)} />)
    expect(markup).not.toContain(prohibited)
    expect((markup.match(/data-grade-occurrence=/gu) ?? [])).toHaveLength(30)
    expect(markup).toContain('data-module="evaluation-guide"')
  })
})
