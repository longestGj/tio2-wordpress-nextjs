import {http, HttpResponse} from 'msw'
import {beforeEach, describe, expect, it, vi} from 'vitest'

const publicRoutePolicy = vi.hoisted(() => ({approved: new Set<string>()}))

vi.mock('@/sites/public-routes', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/sites/public-routes')>()),
  isPublicRoute: (siteId: string, path: string) =>
    publicRoutePolicy.approved.has(`${siteId}:${path}`),
}))

import {
  SITE_A_APPLICATION_IDENTITIES,
} from '@/lib/applications/content-manifest'
import {ApplicationContractError} from '@/lib/applications/dto'
import type {EditorialTarget} from '@/lib/editorial/types'
import {SITE_A_PRODUCT_IDS} from '@/lib/products/content-manifest'
import {SITE_A_RESOURCE_IDENTITIES} from '@/lib/resources/content-manifest'
import {ResourceContractError} from '@/lib/resources/dto'
import {
  applicationListTag,
  applicationTag,
  resourceListTag,
  resourceTag,
} from '@/lib/wordpress/cache-tags'
import {getSiteApplication} from '@/lib/wordpress/application-queries'
import {getSiteResource} from '@/lib/wordpress/resource-queries'
import {getSiteConfig} from '@/sites'
import applicationManifest from '@/tests/fixtures/editorial/site-a-applications.synthetic.json'
import resourceManifest from '@/tests/fixtures/editorial/site-a-resources.synthetic.json'
import {graphqlEndpoint} from '@/tests/mocks/handlers'
import {server} from '@/tests/mocks/server'

interface GraphQLRequestBody {
  readonly query?: string
  readonly variables?: Record<string, unknown>
}

const applicationRecord = structuredClone(applicationManifest.records[1])
const resourceRecord = structuredClone(resourceManifest.records[1])

function canonicalTarget(target: EditorialTarget) {
  if (target.type === 'application') {
    const identity = SITE_A_APPLICATION_IDENTITIES.find(([id]) => id === target.id)
    if (!identity) throw new Error(`Unknown test Application: ${target.id}`)
    return {type: target.type, id: target.id, path: identity[2]}
  }
  if (target.type === 'resource') {
    const identity = SITE_A_RESOURCE_IDENTITIES.find(([id]) => id === target.id)
    if (!identity) throw new Error(`Unknown test Resource: ${target.id}`)
    return {type: target.type, id: target.id, path: identity[2]}
  }
  if (!SITE_A_PRODUCT_IDS.includes(target.id as (typeof SITE_A_PRODUCT_IDS)[number])) {
    throw new Error(`Unknown test Product: ${target.id}`)
  }
  return {type: target.type, id: target.id, path: `/products/${target.id.toLowerCase()}`}
}

function serializedLink(target: {type: string; id: string}) {
  if (!['application', 'resource', 'product'].includes(target.type)) {
    throw new Error(`Unknown test target type: ${target.type}`)
  }
  const canonical = canonicalTarget(target as EditorialTarget)
  return {
    targetType: canonical.type,
    targetKey: canonical.id,
    title: `Synthetic ${canonical.id}`,
    path: canonical.path,
    href: null,
  }
}

function applicationResponse(overrides: Record<string, unknown> = {}) {
  const record = applicationRecord
  const relationships = record.relationships.map(serializedLink)
  return {
    tio2Application: {
      id: 'application-coatings',
      databaseId: 201,
      slug: record.identity.slug,
      title: record.identity.title,
      modifiedGmt: record.identity.modified,
      status: 'publish',
      siteScopes: {nodes: [{slug: 'tio2-a'}]},
      siteAApplicationFields: {
        applicationId: record.identity.id,
        applicationLevel: record.identity.level,
        family: record.identity.family,
        parentApplication: serializedLink({
          type: 'application',
          id: record.identity.parentId as string,
        }),
        metaTitle: record.seo.title,
        metaDescription: record.seo.description,
        eyebrow: record.hero.eyebrow,
        headline: record.hero.headline,
        directAnswer: record.hero.directAnswer,
        applicationContext: record.decisionGuide.context,
        buyerProblem: record.decisionGuide.buyerProblem,
        selectionFactors: record.decisionGuide.selectionFactors,
        powderDataLimits: record.decisionGuide.powderDataLimits,
        validationPlan: record.decisionGuide.validationPlan,
        customerInputs: record.decisionGuide.customerInputs,
        bodySections: record.bodySections,
        faqItems: record.faqs,
        childApplications: record.children.map(serializedLink),
        relatedApplications: relationships.filter(({targetType}) => targetType === 'application'),
        relatedResources: relationships.filter(({targetType}) => targetType === 'resource'),
        relatedProducts: relationships.filter(({targetType}) => targetType === 'product'),
        ctas: record.ctas,
        technicalDisclaimer: record.disclaimerHtml,
      },
      ...overrides,
    },
  }
}

function resourceResponse(overrides: Record<string, unknown> = {}) {
  const record = resourceRecord
  const relationships = record.relationships.map(serializedLink)
  return {
    tio2Document: {
      id: 'resource-article-01',
      databaseId: 301,
      slug: record.identity.slug,
      title: record.identity.title,
      modifiedGmt: record.identity.modified,
      status: 'publish',
      siteScopes: {nodes: [{slug: 'tio2-a'}]},
      siteATechnicalResourceFields: {
        resourceId: record.identity.id,
        resourceKind: record.identity.kind,
        cluster: record.identity.cluster,
        metaTitle: record.seo.title,
        metaDescription: record.seo.description,
        eyebrow: record.hero.eyebrow,
        headline: record.hero.headline,
        directAnswer: record.hero.directAnswer,
        keyTakeaways: record.keyTakeaways,
        sections: record.sections,
        comparisonTable: record.comparisonTable
          ? {
              columns: record.comparisonTable.columns,
              rows: record.comparisonTable.rows.map((cells) => ({cells})),
            }
          : null,
        practicalImplications: record.practicalImplications,
        commonMistakes: record.commonMistakes,
        evaluationMethod: record.evaluationMethod,
        faqItems: record.faqs,
        childResources: record.children.map(serializedLink),
        relatedApplications: relationships.filter(({targetType}) => targetType === 'application'),
        relatedResources: relationships.filter(({targetType}) => targetType === 'resource'),
        relatedProducts: relationships.filter(({targetType}) => targetType === 'product'),
        ctas: record.ctas,
        technicalDisclaimer: record.disclaimerHtml,
      },
      ...overrides,
    },
  }
}

beforeEach(() => {
  process.env.WORDPRESS_GRAPHQL_URL = graphqlEndpoint
  publicRoutePolicy.approved.clear()
})

describe('Application and Resource cache tags', () => {
  it('builds deterministic exact stable-ID and list tags', () => {
    expect(applicationTag('tio2-a', 'coatings')).toBe('application:tio2-a:coatings')
    expect(applicationListTag('tio2-a')).toBe('application-list:tio2-a')
    expect(resourceTag('tio2-a', 'article-01')).toBe('resource:tio2-a:article-01')
    expect(resourceListTag('tio2-a')).toBe('resource-list:tio2-a')
  })

  it('rejects invalid stable IDs before constructing a cache tag', () => {
    expect(() => applicationTag('tio2-a', 'Coatings')).toThrow('Invalid Application ID')
    expect(() => resourceTag('tio2-a', '../article-01')).toThrow('Invalid Resource ID')
  })
})

describe('public Application and Technical Resource queries', () => {
  it('returns null before WordPress access while canonical routes remain unapproved', async () => {
    let requests = 0
    server.use(http.post(graphqlEndpoint, () => {
      requests += 1
      return HttpResponse.json({data: applicationResponse()})
    }))

    await expect(
      getSiteApplication(getSiteConfig('tio2-a'), applicationRecord.identity.path),
    ).resolves.toBeNull()
    await expect(
      getSiteResource(getSiteConfig('tio2-a'), resourceRecord.identity.path),
    ).resolves.toBeNull()
    await expect(
      getSiteApplication(getSiteConfig('tio2-a'), '/applications/not-approved'),
    ).resolves.toBeNull()
    await expect(
      getSiteResource(getSiteConfig('tio2-b'), resourceRecord.identity.path),
    ).resolves.toBeNull()
    expect(requests).toBe(0)
  })

  it('queries only guarded Application fields and canonicalizes a complete approved record path', async () => {
    publicRoutePolicy.approved.add(`tio2-a:${applicationRecord.identity.path}`)
    let observedInit: (RequestInit & {next?: {tags?: readonly string[]}}) | undefined
    server.use(http.post(graphqlEndpoint, async ({request}) => {
      const body = (await request.json()) as GraphQLRequestBody
      expect(body.query).toContain('siteAApplicationFields')
      expect(body.query).not.toContain('technicalFields')
      expect(body.variables).toEqual({slug: 'coatings'})
      return HttpResponse.json({data: applicationResponse()})
    }))
    const interceptedFetch = globalThis.fetch
    globalThis.fetch = async (input, init) => {
      observedInit = init as typeof observedInit
      return interceptedFetch(input, init)
    }

    try {
      const result = await getSiteApplication(
        getSiteConfig('tio2-a'),
        `${applicationRecord.identity.path}/`,
      )
      expect(result).toMatchObject({
        identity: {...applicationRecord.identity, modified: '2026-08-27T08:00:00.000Z'},
        hero: applicationRecord.hero,
        decisionGuide: applicationRecord.decisionGuide,
      })
      expect(result?.children).toHaveLength(applicationRecord.children.length)
      expect(result?.relationships).toEqual([
        {type: 'product', id: 'TP-P100', title: 'Synthetic TP-P100', path: '/products/tp-p100', href: null},
        {type: 'resource', id: 'article-01', title: 'Synthetic article-01', path: '/resources/rutile-vs-anatase-titanium-dioxide', href: null},
      ])
    } finally {
      globalThis.fetch = interceptedFetch
    }
    expect(observedInit?.cache).toBe('force-cache')
    expect(observedInit?.next?.tags).toEqual([
      'site:tio2-a',
      'application:tio2-a:coatings',
      'application-list:tio2-a',
      'route:tio2-a:/applications/coatings',
    ])
  })

  it('queries only guarded Resource fields and normalizes a complete approved record', async () => {
    publicRoutePolicy.approved.add(`tio2-a:${resourceRecord.identity.path}`)
    server.use(http.post(graphqlEndpoint, async ({request}) => {
      const body = (await request.json()) as GraphQLRequestBody
      expect(body.query).toContain('siteATechnicalResourceFields')
      expect(body.query).not.toContain('technicalFields')
      expect(body.variables).toEqual({slug: resourceRecord.identity.slug})
      return HttpResponse.json({data: resourceResponse()})
    }))

    const result = await getSiteResource(
      getSiteConfig('tio2-a'),
      resourceRecord.identity.path,
    )

    expect(result).toMatchObject({
      identity: {...resourceRecord.identity, modified: '2026-08-27T08:00:00.000Z'},
      hero: resourceRecord.hero,
      comparisonTable: resourceRecord.comparisonTable,
    })
  })

  it('returns null for missing, non-published, wrong-site, and identity-mismatched records', async () => {
    publicRoutePolicy.approved.add(`tio2-a:${applicationRecord.identity.path}`)
    const cases = [
      {tio2Application: null},
      applicationResponse({status: 'draft'}),
      applicationResponse({siteScopes: {nodes: [{slug: 'tio2-b'}]}}),
      applicationResponse({slug: 'other'}),
      applicationResponse({
        siteAApplicationFields: {
          ...applicationResponse().tio2Application.siteAApplicationFields,
          applicationId: 'plastics',
        },
      }),
    ]

    for (const data of cases) {
      server.use(http.post(graphqlEndpoint, () => HttpResponse.json({data})))
      await expect(
        getSiteApplication(getSiteConfig('tio2-a'), applicationRecord.identity.path),
      ).resolves.toBeNull()
    }
  })

  it('rejects incomplete guarded fields instead of rendering partial output', async () => {
    publicRoutePolicy.approved.add(`tio2-a:${applicationRecord.identity.path}`)
    const fields = applicationResponse().tio2Application.siteAApplicationFields
    server.use(http.post(graphqlEndpoint, () => HttpResponse.json({data: applicationResponse({
      siteAApplicationFields: {...fields, metaTitle: ''},
    })})))

    await expect(
      getSiteApplication(getSiteConfig('tio2-a'), applicationRecord.identity.path),
    ).rejects.toBeInstanceOf(ApplicationContractError)
  })

  it('rejects duplicated, unresolved, noncanonical, or unsafe serialized relationships', async () => {
    publicRoutePolicy.approved.add(`tio2-a:${resourceRecord.identity.path}`)
    const base = resourceResponse().tio2Document.siteATechnicalResourceFields
    const valid = base.relatedApplications[0]
    const cases = [
      [valid, valid],
      [{...valid, targetKey: 'unknown-application'}],
      [{...valid, path: '/applications/plastics'}],
      [{...valid, title: '<script>unsafe</script>'}],
    ]

    for (const relatedApplications of cases) {
      server.use(http.post(graphqlEndpoint, () => HttpResponse.json({data: resourceResponse({
        siteATechnicalResourceFields: {...base, relatedApplications},
      })})))
      await expect(
        getSiteResource(getSiteConfig('tio2-a'), resourceRecord.identity.path),
      ).rejects.toBeInstanceOf(ResourceContractError)
    }
  })
})
