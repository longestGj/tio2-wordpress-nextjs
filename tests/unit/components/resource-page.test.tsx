// @vitest-environment jsdom

import {cleanup, render, screen, within} from '@testing-library/react'
import {afterEach, describe, expect, it} from 'vitest'

import {TechnicalResourcePageRenderer} from '@/components/resources/technical-resource-page'
import {ResourceBody, ResourceDisclaimer, ResourceFaq} from '@/components/resources/resource-body'
import {ResourceBreadcrumbs} from '@/components/resources/resource-breadcrumbs'
import {ResourceEnquiry} from '@/components/resources/resource-enquiry'
import {ResourceHero} from '@/components/resources/resource-hero'
import {ResourceOverview} from '@/components/resources/resource-overview'
import {ResourceRelatedContent} from '@/components/resources/resource-related-content'
import {resolveCanonicalEditorialTarget} from '@/lib/editorial/content-targets'
import type {EditorialLinkResolver} from '@/lib/editorial/types'
import type {SiteAResourceContentManifest} from '@/lib/resources/content-manifest'
import {toTechnicalResourcePageDto} from '@/lib/resources/dto'
import {groupResourceRelationships, selectResourceCtas} from '@/lib/resources/presentation-policy'
import {resolveResourcePresentation} from '@/lib/resources/presentation'
import {buildResourceBreadcrumbItems} from '@/lib/seo/resource-jsonld'
import {getSiteConfig} from '@/sites'
import type {TechnicalResourcePageInput} from '@/lib/resources/schema'
import type {TechnicalResourcePageDto} from '@/lib/resources/types'
import resourceManifestJson from '@/tests/fixtures/editorial/site-a-resources.synthetic.json'
import approvedResourceManifestJson from '@/tests/fixtures/editorial/site-a-resources.approved.json'

const resourceManifest =
  resourceManifestJson as unknown as SiteAResourceContentManifest
const approvedResourceManifest =
  approvedResourceManifestJson as unknown as SiteAResourceContentManifest

const technicalExplainerIds = [
  'article-01',
  'article-02',
  'article-03',
  'article-04',
  'article-05',
  'article-06',
] as const

const resolveTarget: EditorialLinkResolver = (target) => {
  const canonical = resolveCanonicalEditorialTarget(target.type, target.id)
  return canonical
    ? {
        ...canonical.target,
        title: `Visible ${target.type} ${target.id}`,
        path: canonical.path,
        href:
          target.type === 'resource' && target.id === 'article-01'
            ? canonical.path
            : null,
      }
    : null
}

function resourceInput(id: 'resources-hub' | 'article-01') {
  const source = resourceManifest.records.find((record) => record.identity.id === id)
  if (!source) throw new Error(`Missing Resource fixture: ${id}`)
  const input = structuredClone(source) as TechnicalResourcePageInput
  if (id === 'article-01') {
    input.relationships = [
      {type: 'application', id: 'coatings'},
      {type: 'resource', id: 'article-02'},
      {type: 'product', id: 'TP-P100'},
    ]
  }
  return input
}

function resourceFixture(id: 'resources-hub' | 'article-01') {
  return toTechnicalResourcePageDto(resourceInput(id), resolveTarget)
}

function approvedResourceFixture(id: (typeof approvedResourceManifest.records)[number]['identity']['id']) {
  const source = approvedResourceManifest.records.find(
    (record) => record.identity.id === id,
  )
  if (!source) throw new Error(`Missing approved Resource fixture: ${id}`)
  return toTechnicalResourcePageDto(
    structuredClone(source) as TechnicalResourcePageInput,
    resolveTarget,
  )
}

function mutateFixture(
  mutation: (resource: TechnicalResourcePageDto) => void,
  id: 'resources-hub' | 'article-01' = 'resources-hub',
) {
  const resource = structuredClone(resourceFixture(id))
  mutation(resource)
  return resource
}

function orderedSectionNames(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      '[data-resource-section], [data-editorial-section]',
    ),
  ).map(
    (element) =>
      element.dataset.resourceSection ?? element.dataset.editorialSection,
  )
}

afterEach(cleanup)

describe('TechnicalResourcePageRenderer', () => {
  it('composes the Hub around customer questions and approved learning paths', () => {
    const resource = resourceFixture('resources-hub')
    const {container} = render(
      <TechnicalResourcePageRenderer resource={resource} />,
    )
    const page = container.querySelector<HTMLElement>(
      '[data-resource-mode="hub"]',
    )

    expect(orderedSectionNames(page as HTMLElement)).toEqual([
      'breadcrumb',
      'hero',
      'decision-rail',
      'topic-picker',
      'learning-paths',
      'how-to-use',
      'common-mistakes',
      'related-content',
      'cta-group',
      'faq',
      'technical-disclaimer',
    ])
    expect(container.querySelectorAll('[data-resource-learning-path]')).toHaveLength(4)
    expect(
      Array.from(container.querySelectorAll('[data-resource-learning-path]')).map(
        (path) => path.querySelectorAll('[data-resource-card]').length,
      ),
    ).toEqual([3, 3, 1, 3])
    expect(
      container.querySelector('[data-resource-action="request-tds"]'),
    ).toBeNull()
  })

  it('renders the shared compact article frame with semantic boundaries', () => {
    const resource = resourceFixture('article-01')
    const presentation = resolveResourcePresentation(resource.identity.id)
    if (!presentation) throw new Error('Expected article presentation')
    const {container} = render(
      <article>
        <ResourceBreadcrumbs
          items={buildResourceBreadcrumbItems(
            resource,
            getSiteConfig('tio2-a'),
            (_siteId, path) => path === resource.identity.path,
          )}
        />
        <ResourceHero resource={resource} presentation={presentation} />
        <ResourceOverview
          guideItems={presentation.guideItems}
          keyTakeaways={resource.keyTakeaways}
        />
        <ResourceBody
          commonMistakes={resource.commonMistakes}
          evaluationMethod={resource.evaluationMethod}
          practicalImplications={resource.practicalImplications}
          sections={resource.sections.slice(0, 2)}
        />
        <ResourceRelatedContent
          groups={groupResourceRelationships(resource.relationships)}
        />
        <ResourceEnquiry ctas={selectResourceCtas(resource)} mode={presentation.mode} />
        <ResourceFaq faqs={resource.faqs} />
        <ResourceDisclaimer html={resource.disclaimerHtml} />
      </article>,
    )

    expect(
      screen.getByRole('navigation', {name: 'In this guide'}),
    ).not.toBeNull()
    expect(
      within(screen.getByRole('navigation', {name: 'In this guide'})).getAllByRole(
        'link',
      ),
    ).toHaveLength(6)
    expect(screen.getByText('Key conclusions', {selector: 'p'})).not.toBeNull()
    expect(
      container.querySelector('[data-resource-section="decision-rail"]'),
    ).not.toBeNull()
    expect(
      container.querySelector('[data-resource-section="evaluation-method"]'),
    ).not.toBeNull()
    expect(
      container.querySelector('[data-resource-section="related-content"] a'),
    ).toBeNull()
    expect(
      container.querySelector('[data-resource-section="related-content"] span'),
    ).not.toBeNull()
  })

  it.each(technicalExplainerIds)(
    'composes approved %s as a technical explainer with complete guide modules',
    (id) => {
      const resource = approvedResourceFixture(id)
      const {container} = render(
        <TechnicalResourcePageRenderer resource={resource} />,
      )
      const page = container.querySelector<HTMLElement>(
        '[data-resource-mode="technical-explainer"]',
      )
      const guide = within(page as HTMLElement).getByRole('navigation', {
        name: 'In this guide',
      })

      expect(container.querySelectorAll('h1')).toHaveLength(1)
      expect(page?.dataset.resourceMode).toBe('technical-explainer')
      expect(within(guide).getAllByRole('link')).toHaveLength(6)
      for (const link of within(guide).getAllByRole('link')) {
        const target = link.getAttribute('href')
        expect(target).toMatch(/^#resource-/)
        expect(page?.querySelector(target as string)).not.toBeNull()
      }
      expect(
        container.querySelector('[data-resource-section="common-mistakes"]'),
      ).not.toBeNull()
      expect(
        container.querySelector('[data-resource-section="evaluation-method"]'),
      ).not.toBeNull()
      expect(
        container.querySelector('[data-resource-section="cta-group"]'),
      ).not.toBeNull()
      expect(
        container.querySelector('[data-editorial-section="faq"]'),
      ).not.toBeNull()
      expect(
        container.querySelector('[data-editorial-section="technical-disclaimer"]'),
      ).not.toBeNull()
      expect(
        container.querySelector('[data-resource-comparison]'),
      ).not.toBeNull()
    },
  )

  it('composes article-04 in the approved concept-to-validation order', () => {
    const resource = approvedResourceFixture('article-04')
    const {container} = render(
      <TechnicalResourcePageRenderer resource={resource} />,
    )
    const page = container.querySelector<HTMLElement>(
      '[data-resource-mode="technical-explainer"]',
    )

    expect(orderedSectionNames(page as HTMLElement)).toEqual([
      'breadcrumb',
      'hero',
      'decision-rail',
      'overview',
      'body-sections',
      'practical-implications',
      'common-mistakes',
      'evaluation-method',
      'related-content',
      'cta-group',
      'faq',
      'technical-disclaimer',
    ])
    expect(container.querySelector('[data-resource-body-id="section-7"]')).toBeNull()
    expect(container.querySelectorAll('[data-resource-example]')).toHaveLength(2)
    expect(container.querySelector('[data-resource-action="request-tds"]')).not.toBeNull()
    expect(
      container.querySelector('[data-resource-body-id="section-5"]')
        ?.nextElementSibling,
    ).toBe(container.querySelector('[data-resource-comparison]'))
  })

  it('keeps the evaluation-guide presentation on the legacy article renderer', () => {
    const resource = approvedResourceFixture('article-07')
    const {container} = render(
      <TechnicalResourcePageRenderer resource={resource} />,
    )
    const page = container.querySelector<HTMLElement>('[data-resource-mode]')
    const expected = [
      'hero',
      'direct-answer',
      'key-takeaways',
      'body-section-section-1',
      'body-section-section-2',
      'body-section-section-3',
      'body-section-section-4',
      'body-section-section-5',
      'body-section-section-6',
      'comparison-table',
      'practical-implications',
      'common-mistakes',
      'evaluation-method',
      'related-content',
      'faq',
      'cta-group',
      'technical-disclaimer',
    ]

    expect(page?.dataset.resourceMode).toBe('article')
    expect(page?.className).toContain('page')
    expect(page?.className).toContain('resourceExperience')
    expect(orderedSectionNames(page as HTMLElement)).toEqual(expected)
    expect(container.querySelectorAll('h1')).toHaveLength(1)
    expect(
      screen.getByRole('heading', {level: 1, name: resource.hero.headline}),
    ).not.toBeNull()

    const sections = Array.from(
      (page as HTMLElement).querySelectorAll<HTMLElement>('section'),
    )
    for (const section of sections) {
      const labelledBy = section.getAttribute('aria-labelledby')
      const heading = labelledBy ? document.getElementById(labelledBy) : null
      expect(labelledBy).toBeTruthy()
      expect(heading?.matches('h1, h2')).toBe(true)
      expect(heading ? section.contains(heading) : false).toBe(true)
    }
  })

  it('renders the visible direct answer, takeaways, semantic table, FAQ, CTA, and disclaimer without hidden copies', () => {
    const resource = approvedResourceFixture('article-01')
    const {container} = render(
      <TechnicalResourcePageRenderer resource={resource} />,
    )
    const hero = container.querySelector('[data-resource-section="hero"]')
    const directAnswer = container.querySelector<HTMLElement>(
      '#resource-direct-answer',
    )
    const takeaways = container.querySelector<HTMLElement>(
      '[data-resource-section="overview"]',
    )
    const tableSection = container.querySelector<HTMLElement>(
      '[data-resource-comparison]',
    )
    const table = within(tableSection as HTMLElement).getByRole('table', {
      name: 'Comparison Table',
    })
    const takeawayList = takeaways?.querySelector(
      '#resource-key-conclusions-heading + ul',
    )

    expect(hero?.contains(directAnswer as Node)).toBe(true)
    expect(directAnswer?.innerHTML).toContain(resource.hero.directAnswer)
    expect(
      within(takeawayList as HTMLElement).getAllByRole('listitem').map(
        (item) => item.textContent,
      ),
    ).toEqual(resource.keyTakeaways)
    expect(within(table).getAllByRole('columnheader')).toHaveLength(
      resource.comparisonTable?.columns.length ?? 0,
    )
    expect(
      within(table)
        .getAllByRole('columnheader')
        .every((header) => header.getAttribute('scope') === 'col'),
    ).toBe(true)
    expect(within(table).getAllByRole('cell').map((cell) => cell.textContent)).toEqual(
      resource.comparisonTable?.rows.flat(),
    )
    expect(container.querySelectorAll('[data-editorial-faq-item]')).toHaveLength(
      resource.faqs.length,
    )
    expect(
      container.querySelector('[data-resource-section="cta-group"]')?.textContent,
    ).toContain(
      resource.ctas.find(({kind}) => kind === 'discuss-application')?.label,
    )
    expect(
      container.querySelector('[data-editorial-section="technical-disclaimer"]')
        ?.innerHTML,
    ).toContain(resource.disclaimerHtml)
  })

  it('derives Hub learning-path cards and relationships only from resolved links', () => {
    const resource = resourceFixture('resources-hub')
    const {container} = render(
      <TechnicalResourcePageRenderer resource={resource} />,
    )
    const children = container.querySelector<HTMLElement>(
      '[data-resource-section="learning-paths"]',
    )
    const related = container.querySelector<HTMLElement>(
      '[data-resource-section="related-content"]',
    )

    expect(children?.querySelectorAll('[data-resource-card]')).toHaveLength(
      resource.children.length,
    )
    expect(children?.querySelectorAll('a')).toHaveLength(1)
    expect(children?.querySelector('a')?.getAttribute('href')).toBe(
      '/resources/rutile-vs-anatase-titanium-dioxide',
    )
    expect(related?.querySelectorAll('li') ?? []).toHaveLength(
      resource.relationships.length,
    )
    expect(related?.querySelectorAll('a') ?? []).toHaveLength(0)
  })

  it('omits only a null comparison table and never renders Article child navigation', () => {
    const resource = mutateFixture(
      (value) => {
        value.comparisonTable = null
      },
      'article-01',
    )
    const {container} = render(
      <TechnicalResourcePageRenderer resource={resource} />,
    )

    expect(
      container.querySelector('[data-resource-comparison]'),
    ).toBeNull()
    expect(
      container.querySelector('[data-editorial-section="child-navigation"]'),
    ).toBeNull()
    expect(
      orderedSectionNames(
        container.querySelector('[data-resource-mode]') as HTMLElement,
      ),
    ).toEqual([
      'breadcrumb',
      'hero',
      'decision-rail',
      'overview',
      'body-sections',
      'practical-implications',
      'common-mistakes',
      'evaluation-method',
      'related-content',
      'cta-group',
      'faq',
      'technical-disclaimer',
    ])
  })

  it.each(['guide', 'comparison', 'testing-method', 'case-study'] as const)(
    'fails closed when the future %s kind has no registered renderer',
    (kind) => {
      const resource = mutateFixture((value) => {
        value.identity.kind = kind
      }, 'article-01')
      const {container} = render(
        <TechnicalResourcePageRenderer resource={resource} />,
      )

      expect(container.childElementCount).toBe(0)
    },
  )

  it('fails closed for partial, unknown, and nonrectangular resolved DTOs', () => {
    const complete = resourceFixture('resources-hub')
    const invalid = [
      {...complete, keyTakeaways: complete.keyTakeaways.slice(0, 2)},
      {
        ...complete,
        identity: {
          ...complete.identity,
          id: 'unknown-document',
          slug: 'unknown-document',
          path: '/resources/unknown-document',
        },
      },
      {
        ...complete,
        comparisonTable: {columns: ['One', 'Two'], rows: [['Only one']]},
      },
    ]

    for (const resource of invalid) {
      const {container, unmount} = render(
        <TechnicalResourcePageRenderer resource={resource as never} />,
      )
      expect(container.childElementCount).toBe(0)
      unmount()
    }
  })

  it.each([
    [
      'script markup in the direct answer',
      (resource: TechnicalResourcePageDto) => {
        resource.hero.directAnswer = '<p>Visible.</p><script>alert(1)</script>'
      },
    ],
    [
      'an event handler in a section',
      (resource: TechnicalResourcePageDto) => {
        resource.sections[0]!.html = '<p onclick="track()">Visible.</p>'
      },
    ],
    [
      'unsupported FAQ markup',
      (resource: TechnicalResourcePageDto) => {
        resource.faqs[0]!.answerHtml = '<section>Visible.</section>'
      },
    ],
    [
      'a PDF CTA path',
      (resource: TechnicalResourcePageDto) => {
        resource.ctas[0]!.href = '/resources/technical-data-sheet.pdf'
      },
    ],
  ] as const)('rejects %s without sanitizing or filtering at render time', (_name, mutate) => {
    const {container} = render(
      <TechnicalResourcePageRenderer resource={mutateFixture(mutate)} />,
    )
    expect(container.childElementCount).toBe(0)
  })

  it.each([
    [
      'a known Resource ID bound to another Resource path',
      (resource: TechnicalResourcePageDto) => {
        resource.children[0]!.path =
          '/resources/chloride-vs-sulfate-titanium-dioxide'
        resource.children[0]!.href =
          '/resources/chloride-vs-sulfate-titanium-dioxide'
      },
    ],
    [
      'an unknown Application ID on a valid-looking path',
      (resource: TechnicalResourcePageDto) => {
        const link = resource.relationships.find(({type}) => type === 'application')!
        link.id = 'unknown-application'
        link.path = '/applications/unknown-application'
        link.href = '/applications/unknown-application'
      },
    ],
    [
      'a known Product ID bound to another Product path',
      (resource: TechnicalResourcePageDto) => {
        const link = resource.relationships.find(({type}) => type === 'product')!
        link.path = '/products/tp-p300'
        link.href = '/products/tp-p300'
      },
    ],
  ] as const)('rejects %s at the exact canonical target boundary', (_name, mutate) => {
    const {container} = render(
      <TechnicalResourcePageRenderer resource={mutateFixture(mutate)} />,
    )
    expect(container.childElementCount).toBe(0)
  })

  it.each([
    [
      'a forbidden TDS field on a child',
      (resource: TechnicalResourcePageDto) => {
        Object.assign(resource.children[0]!, {
          tdsUrl: '/resources/technical-data-sheet.pdf',
        })
      },
    ],
    [
      'an arbitrary extra field on a child',
      (resource: TechnicalResourcePageDto) => {
        Object.assign(resource.children[0]!, {trackingId: 'synthetic-tracker'})
      },
    ],
    [
      'a forbidden source field on a relationship',
      (resource: TechnicalResourcePageDto) => {
        Object.assign(resource.relationships[0]!, {
          sourcePath: 'C:\\private\\resource.txt',
        })
      },
    ],
    [
      'an arbitrary extra field on a relationship',
      (resource: TechnicalResourcePageDto) => {
        Object.assign(resource.relationships[0]!, {debugNote: 'private'})
      },
    ],
  ] as const)('rejects %s at the strict resolved-link boundary', (_name, mutate) => {
    const {container} = render(
      <TechnicalResourcePageRenderer resource={mutateFixture(mutate)} />,
    )
    expect(container.childElementCount).toBe(0)
  })

  it('accepts authoritative plain text with harmless internal whitespace', () => {
    const input = resourceInput('article-01')
    input.practicalImplications[0] =
      'Compare two  fictional systems\nunder representative conditions.'
    const resource = toTechnicalResourcePageDto(input, resolveTarget)
    const {container} = render(
      <TechnicalResourcePageRenderer resource={resource} />,
    )

    expect(
      container.querySelector('[data-resource-mode="technical-explainer"]'),
    ).not.toBeNull()
    expect(container.textContent).toContain(
      'Compare two  fictional systems\nunder representative conditions.',
    )
  })
})
