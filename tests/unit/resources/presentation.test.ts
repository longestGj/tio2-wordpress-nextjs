import {describe, expect, it} from 'vitest'

import {
  ARTICLE_07_SCORECARD,
  RESOURCE_HUB_CARD_SUMMARY_BY_ID,
  RESOURCE_LEARNING_PATHS,
  RESOURCE_PRESENTATION_BY_ID,
  resolveResourcePresentation,
} from '@/lib/resources/presentation'
import {
  groupResourceRelationships,
  hasVisibleComparison,
  selectResourceCtas,
  visibleBodySections,
} from '@/lib/resources/presentation-policy'
import {SITE_A_RESOURCE_IDENTITIES} from '@/lib/resources/content-manifest'
import {resolveCanonicalEditorialTarget} from '@/lib/editorial/content-targets'
import type {EditorialLinkResolver} from '@/lib/editorial/types'
import type {SiteAResourceContentManifest} from '@/lib/resources/content-manifest'
import {toTechnicalResourcePageDto} from '@/lib/resources/dto'
import resourceManifestJson from '@/tests/fixtures/editorial/site-a-resources.approved.json'

const resourceManifest =
  resourceManifestJson as unknown as SiteAResourceContentManifest

const resolveTarget: EditorialLinkResolver = (target) => {
  const canonical = resolveCanonicalEditorialTarget(target.type, target.id)
  return canonical
    ? {
        ...canonical.target,
        title: `Visible ${target.type} ${target.id}`,
        path: canonical.path,
        href: null,
      }
    : null
}

function resourceFixture(id: string) {
  const source = resourceManifest.records.find((record) => record.identity.id === id)
  if (!source) throw new Error(`Missing Resource fixture: ${id}`)
  return toTechnicalResourcePageDto(structuredClone(source), resolveTarget)
}

describe('Site A Resource presentation registry', () => {
  it('keeps every article-07 scorecard cell in the approved source section', () => {
    const source = resourceManifest.records
      .find(({identity}) => identity.id === 'article-07')
      ?.sections.find(({id}) => id === 'section-4')?.html
    if (!source) throw new Error('Missing approved article-07 scorecard source')
    const normalize = (value: string) => value.replace(/\s+/gu, ' ').trim()
    const cells = [
      ...ARTICLE_07_SCORECARD.columns,
      ...ARTICLE_07_SCORECARD.rows.flat(),
    ]

    for (const cell of cells) {
      expect(normalize(source)).toContain(normalize(cell))
    }
  })

  it('keeps every Hub card summary aligned with its approved SEO description', () => {
    const approvedDescriptions = Object.fromEntries(
      resourceManifest.records
        .filter(({identity}) => identity.id !== 'resources-hub')
        .map(({identity, seo}) => [identity.id, seo.description]),
    )

    expect(RESOURCE_HUB_CARD_SUMMARY_BY_ID).toEqual(approvedDescriptions)
  })

  it('covers every canonical identity with the approved mode', () => {
    expect(Object.keys(RESOURCE_PRESENTATION_BY_ID).sort()).toEqual(
      SITE_A_RESOURCE_IDENTITIES.map(([id]) => id).sort(),
    )
    expect(resolveResourcePresentation('resources-hub')?.mode).toBe('hub')
    for (const index of [1, 2, 3, 4, 5, 6]) {
      expect(resolveResourcePresentation(`article-0${index}`)?.mode).toBe(
        'technical-explainer',
      )
    }
    for (const id of ['article-07', 'article-08', 'article-09', 'article-10']) {
      expect(resolveResourcePresentation(id)?.mode).toBe('evaluation-guide')
    }
    expect(resolveResourcePresentation('article-99')).toBeNull()
  })

  it('defines the comparison insertion point for every technical explainer', () => {
    expect(
      Object.fromEntries(
        ['article-01', 'article-02', 'article-03', 'article-04', 'article-05', 'article-06'].map(
          (id) => [id, resolveResourcePresentation(id)?.comparisonAfterBodySectionId],
        ),
      ),
    ).toEqual({
      'article-01': 'section-2',
      'article-02': 'section-3',
      'article-03': 'section-4',
      'article-04': 'section-5',
      'article-05': 'section-5',
      'article-06': 'section-5',
    })
  })

  it('uses the approved learning-path order and counts', () => {
    expect(
      RESOURCE_LEARNING_PATHS.map(({label, articleIds}) => [
        label,
        articleIds.length,
      ]),
    ).toEqual([
      ['TiO₂ Fundamentals', 3],
      ['Performance Interpretation', 3],
      ['Grade Replacement', 1],
      ['Application Testing', 3],
    ])
    expect(RESOURCE_LEARNING_PATHS.flatMap(({articleIds}) => articleIds)).toEqual(
      SITE_A_RESOURCE_IDENTITIES.slice(1).map(([id]) => id),
    )
  })
})

describe('Technical Resource presentation policy', () => {
  it('keeps only discussion CTA on resources without product relationships', () => {
    const hub = resourceFixture('resources-hub')
    const article07 = resourceFixture('article-07')

    expect(selectResourceCtas(hub)).toEqual({
      discuss: expect.objectContaining({kind: 'discuss-application'}),
      requestTds: null,
    })
    expect(selectResourceCtas(article07).requestTds).toBeNull()
  })

  it('allows a TDS enquiry only when a validated product relationship exists', () => {
    const article04 = resourceFixture('article-04')

    expect(selectResourceCtas(article04).requestTds).toEqual(
      expect.objectContaining({kind: 'request-tds'}),
    )
  })

  it('groups validated relationships by target type without fabricating href values', () => {
    const article04 = resourceFixture('article-04')

    expect(groupResourceRelationships(article04.relationships)).toEqual({
      products: expect.arrayContaining([
        expect.objectContaining({id: 'TP-I100'}),
        expect.objectContaining({id: 'TP-C200'}),
      ]),
      applications: expect.arrayContaining([
        expect.objectContaining({id: 'printing-inks'}),
        expect.objectContaining({id: 'high-pvc-flat-paint'}),
      ]),
      resources: [expect.objectContaining({id: 'article-03'})],
    })
    expect(
      groupResourceRelationships(article04.relationships).products,
    ).toEqual(expect.arrayContaining([expect.objectContaining({href: null})]))
  })

  it('suppresses only presentation-designated body sections', () => {
    const article04 = resourceFixture('article-04')

    expect(
      visibleBodySections(article04, resolveResourcePresentation('article-04')!).map(
        ({id}) => id,
      ),
    ).toEqual([
      'section-1',
      'section-2',
      'section-3',
      'section-4',
      'section-5',
      'section-6',
    ])
  })

  it('shows a comparison only when both the presentation and resource permit one', () => {
    expect(
      hasVisibleComparison(
        resourceFixture('article-04'),
        resolveResourcePresentation('article-04')!,
      ),
    ).toBe(true)
    expect(
      hasVisibleComparison(
        resourceFixture('resources-hub'),
        resolveResourcePresentation('resources-hub')!,
      ),
    ).toBe(false)
  })
})
