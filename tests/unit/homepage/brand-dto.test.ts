import {describe, expect, it} from 'vitest'

import {HomepageVersionError} from '@/lib/wordpress/homepage-dto'
import {toSiteABrandHomepageDto} from '@/lib/wordpress/homepage-v03-dto'
import {makeSiteABrandHomepageNode} from '@/tests/mocks/site-a-brand-homepage'

describe('toSiteABrandHomepageDto', () => {
  it('maps the approved Site A brand contract with exact bounded collections', () => {
    const dto = toSiteABrandHomepageDto(makeSiteABrandHomepageNode())

    expect(dto.identity).toMatchObject({
      siteId: 'tio2-a',
      path: '/',
      schemaVersion: 'homepage-v0.3-brand',
      status: 'publish',
    })
    expect(dto.hero.heading).toBe('Application-Specific Titanium Dioxide')
    expect(dto.about.metrics.map(({value}) => value)).toEqual(['12+', '30+', '30,000+'])
    expect(dto.routes.items).toHaveLength(3)
    expect(dto.applications.items).toHaveLength(6)
    expect(dto.productFamilies.items).toHaveLength(8)
    expect(dto.selection.factors).toHaveLength(4)
    expect(dto.resources.items).toHaveLength(4)
    expect(dto.process.steps).toHaveLength(5)
    expect(dto.documents.items).toHaveLength(4)
    expect(dto.faq.items).toHaveLength(4)
    expect(dto.documents.items[0]).toMatchObject({
      title: 'Technical Data Sheet',
      access: 'Request',
    })
    expect(dto.seo).toMatchObject({
      title: 'Titanium Dioxide Supplier & TiO2 Grades | TIOVAR',
      description: 'TIOVAR supplies application-specific titanium dioxide (TiO2) grades for coatings, plastics, masterbatch, inks and specialized industrial applications.',
    })
  })

  it('rejects another schema version without falling back', () => {
    const node = makeSiteABrandHomepageNode()
    node.homepageFields.homepageSchemaVersion = 'homepage-v0.2-editorial-geo'

    expect(() => toSiteABrandHomepageDto(node)).toThrow(HomepageVersionError)
  })

  it.each([
    ['routes', 'buyerRoutes', 2],
    ['applications', 'brandApplications', 5],
    ['product families', 'productFamilies', 7],
    ['selection factors', 'selectionFactors', 3],
    ['resources', 'technicalResources', 3],
    ['steps', 'evaluationSteps', 4],
    ['documents', 'controlledDocuments', 3],
    ['FAQ', 'brandFaqs', 3],
  ])('rejects an invalid %s count', (_label, key, count) => {
    const node = makeSiteABrandHomepageNode()
    Reflect.set(
      node.brandHomepageFields,
      key,
      (Reflect.get(node.brandHomepageFields, key) as unknown[]).slice(0, count),
    )

    expect(() => toSiteABrandHomepageDto(node)).toThrow()
  })
})
