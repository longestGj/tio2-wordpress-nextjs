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

function gradeLinkCount(markup: string): number {
  return (markup.match(/href="\/products\/(?:m-[^"]+|cr-901)\/"/gu) ?? []).length
}

describe('APP-000 renderer', () => {
  it('renders the approved reading order and 30 Grade links without public internal IDs', () => {
    const markup = renderToStaticMarkup(<MalaysiaApplicationHub applicationHub={dto()} />)
    const headings = [contract.hero.h1, contract.applicationPaths.heading, contract.evaluation.heading, contract.support.heading, contract.finalRfq.heading]
    const positions = headings.map((heading) => markup.indexOf(heading))
    expect(positions.every((position) => position >= 0)).toBe(true)
    expect(positions).toEqual([...positions].sort((a, b) => a - b))
    expect(gradeLinkCount(markup)).toBe(30)
    expect(markup).not.toMatch(/APP-000|APP000-EDGE|GLOBAL-CHROME-005|data-(?:site-id|site-scope|source-page|grade-occurrence|grade-state|support-action|application-action|module)|(?:currentPageId|sourcePageId|targetPageId|siteScope|edgeId|contractId)["']?\s*[:=]/iu)
  })

  it('uses atomic omission and plain Grade fallback for unavailable targets', () => {
    const markup = renderToStaticMarkup(<MalaysiaApplicationHub applicationHub={dto({
      'APP-COAT': false, 'GRADE-M350': false, 'DOC-000': false, 'CONV-RFQ': false,
    })} />)
    expect(markup).not.toContain(`href="${contract.applications[0].href}"`)
    expect(markup).not.toContain('href="/products/m-350/"')
    expect(markup).toContain('>M-350</span>')
    expect(markup).not.toContain(contract.support.items[1].actionLabel)
    expect(markup).not.toContain(contract.finalRfq.heading)
  })

  it.each([
    ['child application', {'APP-COAT': false}, contract.applications[0].actionLabel],
    ['grade', {'GRADE-M350': false}, 'href="/products/m-350/"'],
    ['product support', {'PRODUCT-000': false}, contract.support.items[0].actionLabel],
    ['document support', {'DOC-000': false}, contract.support.items[1].actionLabel],
    ['market support', {'MARKET-000': false}, contract.support.items[2].actionLabel],
  ])('omits only the unavailable %s destination', (label, readiness, prohibitedFragment) => {
    const markup = renderToStaticMarkup(<MalaysiaApplicationHub applicationHub={dto(readiness)} />)
    expect(markup).not.toContain(prohibitedFragment)
    expect(markup).toContain(contract.evaluation.heading)
    if (label !== 'grade') expect(gradeLinkCount(markup)).toBe(30)
  })

  it('renders the exact full, applications-only, grades-only, mixed and no-destination variants', () => {
    const applicationIds = contract.applications.flatMap((item) => item.targetPageId ? [item.targetPageId] : [])
    const gradeIds = [...new Set(contract.applications.flatMap((item) => item.grades.map((grade) => grade.targetPageId)))]
    const supportIds = contract.support.items.map((item) => item.targetPageId)
    const off = (ids: readonly string[]) => Object.fromEntries(ids.map((id) => [id, false]))

    const full = renderToStaticMarkup(<MalaysiaApplicationHub applicationHub={dto()} />)
    expect(full).toContain(contract.applicationPaths.sentences.both)

    const gradesOnly = renderToStaticMarkup(<MalaysiaApplicationHub applicationHub={dto(off(applicationIds))} />)
    expect(gradesOnly).toContain(contract.applicationPaths.sentences.gradesOnly)
    expect(gradesOnly).not.toContain(contract.applicationPaths.sentences.applicationsOnly)

    const applicationsOnly = renderToStaticMarkup(<MalaysiaApplicationHub applicationHub={dto(off(gradeIds))} />)
    expect(applicationsOnly).toContain(contract.applicationPaths.sentences.applicationsOnly)
    expect(applicationsOnly).not.toContain(contract.applicationPaths.sentences.gradesOnly)

    const mixed = renderToStaticMarkup(<MalaysiaApplicationHub applicationHub={dto({'APP-COAT': false, 'GRADE-M350': false})} />)
    expect(mixed).toContain(contract.applicationPaths.sentences.both)
    expect(mixed).not.toContain(`href="${contract.applications[0].href}"`)
    expect(mixed).toContain('>M-350</span>')

    const noDestination = renderToStaticMarkup(<MalaysiaApplicationHub applicationHub={dto({
      ...off(applicationIds), ...off(gradeIds), ...off(supportIds), 'CONV-RFQ': false,
    })} />)
    expect(noDestination).toContain(contract.applicationPaths.qualification)
    expect(noDestination).not.toContain(contract.applicationPaths.sentences.both)
    expect(noDestination).not.toContain(contract.support.heading)
    expect(noDestination).not.toContain(contract.finalRfq.heading)
    expect(gradeLinkCount(noDestination)).toBe(0)
    expect((noDestination.match(/<span>(?:M-|CR-)/gu) ?? [])).toHaveLength(30)
  })
})
