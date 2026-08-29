import {existsSync, readFileSync} from 'node:fs'

import {describe, expect, it} from 'vitest'

import {validateSiteAApplicationManifest} from '@/lib/applications/content-manifest'

const reviewPath =
  'docs/seo/site-a-applications/page-reviews/masterbatch.review-v2.json'

describe('approved Masterbatch Detail content contract', () => {
  it('keeps the Masterbatch query and candidate routes inside the frozen page boundary', () => {
    expect(existsSync(reviewPath), 'Masterbatch review content is missing').toBe(
      true,
    )
    if (!existsSync(reviewPath)) return

    const [page] = validateSiteAApplicationManifest(
      {
        version: '0.1',
        siteId: 'tio2-a',
        records: [JSON.parse(readFileSync(reviewPath, 'utf8'))],
      },
      {allowIncomplete: true},
    ).records
    expect(page?.identity).toMatchObject({
      id: 'masterbatch',
      path: '/applications/titanium-dioxide-for-masterbatch',
      level: 'detail',
      parentId: 'plastics',
    })
    expect(page?.seo).toEqual({
      title: 'Titanium Dioxide for Masterbatch | TIOVAR',
      description:
        'Evaluate titanium dioxide for masterbatch and white masterbatch by resin, let-down, dispersion, processing and finished-product requirements.',
    })
    expect(
      page?.startingProducts.map(({productId, role}) => [productId, role]),
    ).toEqual([
      ['TP-P100', 'primary'],
      ['TP-P110', 'alternative'],
      ['TP-P200', 'alternative'],
    ])
    expect(page?.relationships).toEqual([
      {type: 'resource', id: 'article-05'},
      {type: 'product', id: 'TP-P100'},
      {type: 'application', id: 'film-masterbatch'},
      {type: 'product', id: 'TP-P110'},
      {type: 'product', id: 'TP-P200'},
      {type: 'application', id: 'outdoor-pvc'},
      {type: 'resource', id: 'article-03'},
      {type: 'resource', id: 'article-07'},
      {type: 'application', id: 'plastics'},
    ])
    expect(page?.hero.directAnswer).toContain(
      'titanium dioxide for masterbatch',
    )
    expect(page?.hero.directAnswer).toContain('TP-P100')
    expect(page?.hero.directAnswer).not.toContain('TP-P110')
    expect(page?.hero.directAnswer).not.toContain('TP-P200')
    expect(page?.startingProducts[0]?.summaryHtml).toContain(
      'dispersion in polymer systems and processing behavior',
    )
    expect(page?.startingProducts[0]?.summaryHtml).not.toContain(
      'processing performance',
    )
    expect(page?.decisionGuide.powderDataLimits).toBe(
      'Define the resin system, let-down conditions, processing window and finished-product target before comparing candidates. Use a matched control and keep the formulation and process conditions consistent throughout the trial.',
    )
    expect(page?.decisionGuide.validationPlan[0]).not.toContain(
      'Do not select a grade from powder checks alone.',
    )
    expect(page?.bodySections.find(({id}) => id === 'evaluation-boundary')).toEqual({
      id: 'evaluation-boundary',
      heading: 'Do Not Transfer Results Across Masterbatch Routes',
      html: '<p>A result in general PE or PP masterbatch does not establish suitability for film or exterior-plastics applications. Evaluate film construction, extrusion conditions, exposure requirements and finished-product criteria within the relevant route.</p>',
    })
    expect(page?.ctas.map(({kind}) => kind)).toEqual([
      'discuss-application',
      'request-tds',
      'request-sample',
    ])
    expect(page?.faqs).toHaveLength(4)
    expect(page?.hero.directAnswer).not.toMatch(
      /\b(?:manufacturer|factory|producer)\b/iu,
    )
  })
})
