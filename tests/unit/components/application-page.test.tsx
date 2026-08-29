// @vitest-environment jsdom

import {cleanup, render, screen, within} from '@testing-library/react'
import {afterEach, describe, expect, it} from 'vitest'

import {ApplicationPageRenderer} from '@/components/applications/application-page'
import {ApplicationBodySections} from '@/components/applications/application-body-sections'
import {toApplicationPageDto} from '@/lib/applications/dto'
import {validateSiteAApplicationManifest} from '@/lib/applications/content-manifest'
import type {ApplicationPageInput} from '@/lib/applications/schema'
import type {ApplicationPageDto} from '@/lib/applications/types'
import {resolveCanonicalEditorialTarget} from '@/lib/editorial/content-targets'
import type {EditorialLinkResolver} from '@/lib/editorial/types'
import {
  applicationCategoryInput,
  applicationDetailInput,
  applicationHubInput,
  universalApplicationDetailInput,
} from '@/tests/fixtures/editorial/application-pages'
import plasticsReview from '@/docs/seo/site-a-applications/page-reviews/plastics.review-v1.json'
import masterbatchReview from '@/docs/seo/site-a-applications/page-reviews/masterbatch.review-v2.json'

const EXPECTED_ORDER = {
  hub: [
    'breadcrumb',
    'hero',
    'child-navigation',
    'cross-application',
    'selection-factors',
    'powder-data-limitation',
    'validation-plan',
    'related-content',
    'customer-inputs',
    'cta-group',
    'faq',
    'technical-disclaimer',
  ],
  category: [
    'breadcrumb',
    'hero',
    'child-navigation',
    'starting-products',
    'selection-factors',
    'powder-data-limitation',
    'validation-plan',
    'related-content',
    'customer-inputs',
    'cta-group',
    'faq',
    'technical-disclaimer',
  ],
  detail: [
    'breadcrumb',
    'hero',
    'starting-products',
    'customer-context',
    'selection-factors',
    'validation-plan',
    'related-content',
    'customer-inputs',
    'cta-group',
    'faq',
    'technical-disclaimer',
  ],
} as const

const resolveTarget: EditorialLinkResolver = (target) => ({
  ...(resolveCanonicalEditorialTarget(target.type, target.id)?.target ?? target),
  title: `Resolved ${target.type} ${target.id}`,
  path:
    resolveCanonicalEditorialTarget(target.type, target.id)?.path ??
    `/unknown/${target.id}`,
  href:
    target.id === 'article-01'
      ? '/resources/rutile-vs-anatase-titanium-dioxide'
      : target.id === 'TP-C120'
        ? '/products/tp-c120'
        : null,
})

function applicationInput(
  level: ApplicationPageDto['identity']['level'],
): ApplicationPageInput {
  const source =
    level === 'hub'
      ? applicationHubInput
      : level === 'category'
        ? applicationCategoryInput
        : applicationDetailInput
  const input = structuredClone(source) as unknown as ApplicationPageInput
  const nonProducts = input.relationships.filter(({type}) => type !== 'product')
  if (level === 'hub') {
    input.relationships = [...nonProducts, {type: 'product', id: 'TP-P100'}]
    input.startingProducts = []
  } else if (level === 'category') {
    input.relationships = [
      ...nonProducts,
      {type: 'product', id: 'TP-C120'},
      {type: 'product', id: 'TP-C100'},
    ]
    input.startingProducts = [
      {
        productId: 'TP-C120',
        role: 'candidate',
        label: 'Water-based paint',
        summaryHtml: '<p>Use as a controlled fictional evaluation candidate.</p>',
      },
      {
        productId: 'TP-C100',
        role: 'candidate',
        label: 'General coatings',
        summaryHtml: '<p>Compare independently in the target formulation.</p>',
      },
    ]
  } else {
    input.relationships = [
      ...nonProducts,
      {type: 'product', id: 'TP-C120'},
      {type: 'product', id: 'TP-C100'},
      {type: 'product', id: 'TP-C110'},
    ]
    input.startingProducts = [
      {
        productId: 'TP-C120',
        role: 'primary',
        label: 'Primary starting point',
        summaryHtml: '<p>Use as the first fictional water-based paint trial.</p>',
      },
      {
        productId: 'TP-C100',
        role: 'alternative',
        label: 'Alternative starting point',
        summaryHtml: '<p>Compare independently where its direction fits.</p>',
      },
      {
        productId: 'TP-C110',
        role: 'alternative',
        label: 'Alternative starting point',
        summaryHtml: '<p>Screen as a separate formulation candidate.</p>',
      },
    ]
    input.ctas = [
      {kind: 'discuss-application', label: 'Discuss Formulation', href: '/contact'},
      {kind: 'request-tds', label: 'Request a TDS', href: '/contact'},
      {kind: 'request-sample', label: 'Request a Sample', href: '/contact'},
    ]
  }
  return input
}

function applicationFixture(
  level: ApplicationPageDto['identity']['level'],
): ApplicationPageDto {
  return toApplicationPageDto(applicationInput(level), resolveTarget)
}

function universalApplicationFixture(): ApplicationPageDto {
  return toApplicationPageDto(
    structuredClone(universalApplicationDetailInput),
    resolveTarget,
  )
}

const plasticsChildTitles: Readonly<Record<string, string>> = {
  'film-masterbatch': 'Titanium Dioxide for PET, PE & PP Film Masterbatch',
  'lcp-high-temperature-plastics':
    'Titanium Dioxide for LCP & High-Temperature Engineering Plastics',
  masterbatch: 'Titanium Dioxide for Masterbatch',
  'outdoor-pvc': 'Titanium Dioxide for Outdoor PVC & Weatherable Plastics',
  polycarbonate: 'Titanium Dioxide for Polycarbonate & Engineering Plastics',
  'soft-pvc-solar-backsheet':
    'Titanium Dioxide for Soft PVC & Solar Backsheet Film',
  'uv-resistant-engineering-plastics':
    'UV-Resistant Titanium Dioxide for Engineering Plastics',
}

function plasticsApplicationFixture(): ApplicationPageDto {
  const [input] = validateSiteAApplicationManifest(
    {version: '0.1', siteId: 'tio2-a', records: [plasticsReview]},
    {allowIncomplete: true},
  ).records
  if (!input) throw new Error('Missing Plastics review fixture')
  return toApplicationPageDto(input, (target) => {
    const canonical = resolveCanonicalEditorialTarget(target.type, target.id)
    if (!canonical) return null
    return {
      ...canonical.target,
      title:
        plasticsChildTitles[target.id] ??
        (target.type === 'product' ? target.id : `Resolved ${target.type} ${target.id}`),
      path: canonical.path,
      href: null,
    }
  })
}

const masterbatchTitles: Readonly<Record<string, string>> = {
  'article-05': 'Why TiO2 Content Alone Does Not Determine Performance',
  'film-masterbatch': 'Titanium Dioxide for PET, PE & PP Film Masterbatch',
  'outdoor-pvc': 'Titanium Dioxide for Outdoor PVC & Weatherable Plastics',
  'article-03': 'What Is CBU in Titanium Dioxide?',
  'article-07': 'How to Evaluate a Titanium Dioxide Alternative Grade',
  plastics: 'Titanium Dioxide for Plastics',
}

function masterbatchApplicationFixture(): ApplicationPageDto {
  const [input] = validateSiteAApplicationManifest(
    {version: '0.1', siteId: 'tio2-a', records: [masterbatchReview]},
    {allowIncomplete: true},
  ).records
  if (!input) throw new Error('Missing Masterbatch review fixture')
  return toApplicationPageDto(input, (target) => {
    const canonical = resolveCanonicalEditorialTarget(target.type, target.id)
    if (!canonical) return null
    return {
      ...canonical.target,
      title:
        masterbatchTitles[target.id] ??
        (target.type === 'product' ? target.id : `Resolved ${target.type} ${target.id}`),
      path: canonical.path,
      href: null,
    }
  })
}

function mutateFixture(
  mutation: (application: ApplicationPageDto) => void,
): ApplicationPageDto {
  const application = structuredClone(applicationFixture('hub'))
  mutation(application)
  return application
}

afterEach(cleanup)

describe('ApplicationPageRenderer', () => {
  it('omits only legacy Product prose replaced by the structured Product bridge', () => {
    render(
      <ApplicationBodySections
        sections={[
          {id: 'legacy-products', heading: 'Legacy products', html: '<p>Duplicate.</p>'},
          {id: 'evaluation-boundary', heading: 'Evaluation boundary', html: '<p>Keep this.</p>'},
        ]}
        omitIds={new Set(['legacy-products'])}
      />,
    )

    expect(screen.queryByText('Legacy products')).toBeNull()
    expect(screen.getByText('Evaluation boundary')).not.toBeNull()
  })

  it.each(['hub', 'category', 'detail'] as const)(
    'selects the controlled %s mode and preserves the complete decision flow',
    (level) => {
      const application = applicationFixture(level)
      const {container} = render(
        <ApplicationPageRenderer application={application} />,
      )
      const page = container.querySelector<HTMLElement>('[data-application-mode]')
      const sections = Array.from(
        container.querySelectorAll<HTMLElement>(
          '[data-application-section], [data-editorial-section]',
        ),
      )

      expect(page?.dataset.applicationMode).toBe(level)
      expect(
        sections.map(
          (section) =>
            section.dataset.applicationSection ??
            section.dataset.editorialSection,
        ),
      ).toEqual(EXPECTED_ORDER[level])
      expect(container.querySelectorAll('h1')).toHaveLength(1)
      expect(
        screen.getByRole('heading', {
          level: 1,
          name: application.hero.headline,
        }),
      ).not.toBeNull()
      expect(screen.queryByRole('heading', {level: 1, name: application.identity.title})).toBeNull()

      for (const section of sections.filter((element) => element.matches('section'))) {
        const labelledBy = section.getAttribute('aria-labelledby')
        const heading = labelledBy ? document.getElementById(labelledBy) : null
        expect(labelledBy).toBeTruthy()
        expect(heading?.matches('h1, h2')).toBe(true)
        expect(heading ? section.contains(heading) : false).toBe(true)
      }
    },
  )

  it('shows the exact direct answer inside the hero and keeps FAQ parity', () => {
    const application = applicationFixture('hub')
    const {container} = render(
      <ApplicationPageRenderer application={application} />,
    )
    const hero = container.querySelector('[data-application-section="hero"]')
    const faqItems = Array.from(
      container.querySelectorAll<HTMLElement>('[data-editorial-faq-item]'),
    )

    expect(hero?.innerHTML).toContain(application.hero.directAnswer)
    expect(faqItems).toHaveLength(application.faqs.length)
    expect(faqItems.map((item) => item.textContent)).toEqual(
      application.faqs.map((faq) => `${faq.question}Use a fictional, representative test plan.`),
    )
  })

  it('renders one semantic breadcrumb trail with only the public Homepage linked', () => {
    const application = applicationFixture('detail')
    render(<ApplicationPageRenderer application={application} />)

    const breadcrumb = screen.getByRole('navigation', {name: 'Breadcrumb'})
    expect(within(breadcrumb).getByRole('list')).not.toBeNull()
    expect(
      within(breadcrumb).getByText(application.identity.title).getAttribute(
        'aria-current',
      ),
    ).toBe('page')
    expect(within(breadcrumb).getAllByRole('link')).toHaveLength(1)
    expect(
      within(breadcrumb).getByRole('link', {name: 'Home'}).getAttribute('href'),
    ).toBe('/')
  })

  it('renders the primary Product bridge and preserves its CTA hierarchy', () => {
    render(<ApplicationPageRenderer application={applicationFixture('detail')} />)
    const primary = screen.getByTestId('application-starting-product-TP-C120')

    expect(within(primary).getByText('Primary starting point')).not.toBeNull()
    expect(
      within(primary).getByRole('link', {name: 'View TP-C120'}).getAttribute('href'),
    ).toBe('/products/tp-c120')
    expect(
      within(primary).getByRole('link', {name: 'Request a TDS'}).getAttribute('href'),
    ).toBe('/contact')
    expect(
      within(primary).getByRole('link', {name: 'Request a Sample'}).getAttribute('href'),
    ).toBe('/contact')
    expect(
      within(primary).getByRole('link', {name: 'Discuss Formulation'}).getAttribute('href'),
    ).toBe('/contact')
  })

  it.each(['hub', 'category', 'detail'] as const)(
    'gives every %s hero fragment link a rendered target',
    (level) => {
      const {container} = render(
        <ApplicationPageRenderer application={applicationFixture(level)} />,
      )
      const heroNavigation = screen.getByRole('navigation', {
        name: 'On this page',
      })
      const fragments = within(heroNavigation).getAllByRole('link')
        .map((link) => link.getAttribute('href'))

      expect(fragments).not.toContain(null)
      for (const fragment of fragments) {
        expect(fragment).toMatch(/^#[a-z0-9-]+$/u)
        expect(container.querySelector(fragment as string)).not.toBeNull()
      }
    },
  )

  it('uses customer-facing labels and renders category candidates as native disclosure rows', () => {
    const {container} = render(
      <ApplicationPageRenderer application={applicationFixture('category')} />,
    )

    expect(screen.queryByText('Customer Context')).toBeNull()
    expect(screen.queryByText('Buyer problem')).toBeNull()
    expect(screen.getByRole('heading', {name: 'What Controls the First Screen'})).not.toBeNull()
    expect(container.querySelectorAll('details[data-application-candidate]')).toHaveLength(2)
  })

  it('renders the approved Plastics category language without Coatings residue', () => {
    const application = plasticsApplicationFixture()
    const {container} = render(
      <ApplicationPageRenderer application={application} />,
    )
    const breadcrumb = screen.getByRole('navigation', {name: 'Breadcrumb'})
    const routes = container.querySelector<HTMLElement>(
      '[data-application-section="child-navigation"]',
    )

    expect(within(breadcrumb).getByText('Plastics')).not.toBeNull()
    expect(within(breadcrumb).queryByText(application.identity.title)).toBeNull()
    expect(routes?.textContent).toContain('Plastics routes')
    expect(routes?.textContent).toContain('Choose the Plastics route')
    expect(routes?.textContent).toContain('Titanium Dioxide for Film Masterbatch')
    expect(routes?.textContent).toContain('Titanium Dioxide for General Masterbatch')
    expect(routes?.textContent).toContain('Titanium Dioxide for Polycarbonate')
    expect(routes?.textContent).not.toContain('Coating')
    expect(
      screen.getByRole('heading', {name: 'Key Selection Factors for Plastics'}),
    ).not.toBeNull()
    expect(
      screen.getByRole('heading', {
        name: 'Match the Plastics Route to a Starting Candidate',
      }),
    ).not.toBeNull()
    expect(container.querySelectorAll('details[data-application-candidate]')).toHaveLength(9)
    expect(container.textContent).toContain('PRODUCT')
    expect(container.textContent).toContain('TECHNICAL RESOURCE')
    expect(container.textContent).toContain('Prepare a Focused Application Discussion')
  })

  it('renders the approved Masterbatch refinement as one integrated selection flow', () => {
    const application = masterbatchApplicationFixture()
    const {container} = render(
      <ApplicationPageRenderer application={application} />,
    )
    const selection = container.querySelector<HTMLElement>(
      '[data-application-section="selection-factors"]',
    )
    const related = container.querySelector<HTMLElement>(
      '[data-editorial-section="related-content"]',
    )
    const heroImage = container.querySelector<HTMLImageElement>(
      '[data-application-section="hero"] img',
    )

    expect(
      screen.getByRole('heading', {name: 'Understand the Complete Masterbatch System'}),
    ).not.toBeNull()
    expect(selection?.querySelectorAll('ol > li')).toHaveLength(4)
    expect(selection?.textContent).toContain(
      'Technical note — CBU and color interpretation',
    )
    expect(selection?.textContent).toContain(
      'Do Not Transfer Results Across Masterbatch Routes',
    )
    expect(selection?.textContent).toContain('Request a TDS')
    expect(container.querySelector('[data-application-body-sections]')).toBeNull()
    expect(related?.textContent).toContain('TECHNICAL RESOURCE')
    expect(related?.textContent).toContain('APPLICATION')
    expect(related?.textContent).toContain('CATEGORY')
    expect(container.querySelector('#documents')?.textContent).toContain(
      'Request the relevant TDS and supporting technical information for the grade you are evaluating.',
    )
    expect(container.querySelector('#inquiry')?.textContent).toContain(
      'Share the application, formulation and process context needed to identify a realistic evaluation starting point and plan the next trial.',
    )
    expect(heroImage?.getAttribute('src')).toContain(
      'masterbatch-detail-hero-v2.png',
    )
  })

  it('derives child cards and relationships only from DTO links without creating dead anchors', () => {
    const application = applicationFixture('hub')
    const {container} = render(
      <ApplicationPageRenderer application={application} />,
    )
    const childNavigation = container.querySelector<HTMLElement>(
      '[data-application-section="child-navigation"]',
    )
    const related = container.querySelector<HTMLElement>(
      '[data-editorial-section="related-content"]',
    )

    expect(childNavigation?.textContent).toContain(application.children[0]?.title)
    expect(childNavigation?.querySelectorAll('a')).toHaveLength(0)
    expect(related?.textContent).toContain(application.relationships[0]?.title)
    expect(related?.textContent).toContain(application.relationships[1]?.title)
    expect(related?.querySelectorAll('a')).toHaveLength(1)
    expect(related?.querySelector('a')?.getAttribute('href')).toBe(
      '/resources/rutile-vs-anatase-titanium-dioxide',
    )
  })

  it('uses only DTO CTA labels and hrefs and keeps the disclaimer visible', () => {
    const application = applicationFixture('detail')
    const {container} = render(
      <ApplicationPageRenderer application={application} />,
    )
    const ctaGroup = container.querySelector<HTMLElement>(
      '[data-editorial-section="cta-group"]',
    )
    const links = within(ctaGroup as HTMLElement).getAllByRole('link')
    const disclaimer = container.querySelector<HTMLElement>(
      '[data-editorial-section="technical-disclaimer"]',
    )

    expect(links.map((link) => link.textContent)).toEqual(
      application.ctas.map((cta) => cta.label),
    )
    expect(links.map((link) => link.getAttribute('href'))).toEqual(
      application.ctas.map((cta) => cta.href),
    )
    expect(disclaimer?.innerHTML).toContain(application.disclaimerHtml)
    expect(container.querySelector('#documents')).not.toBeNull()
    expect(container.querySelector('#documents')?.textContent).toContain(
      'Request the documents needed for your evaluation',
    )
  })

  it('fails closed instead of rendering an unknown mode or a partial DTO', () => {
    const application = applicationFixture('hub')
    const {container, rerender} = render(
      <ApplicationPageRenderer
        application={{
          ...application,
          identity: {...application.identity, level: 'unknown'},
        } as never}
      />,
    )

    expect(container.childElementCount).toBe(0)

    rerender(
      <ApplicationPageRenderer
        application={{...application, decisionGuide: undefined} as never}
      />,
    )
    expect(container.childElementCount).toBe(0)

    rerender(
      <ApplicationPageRenderer
        application={{
          ...application,
          faqs: [{...application.faqs[0], answerHtml: undefined}],
        } as never}
      />,
    )
    expect(container.childElementCount).toBe(0)

    const category = applicationFixture('category')
    const incompleteApplications = [
      {
        ...category,
        identity: {...category.identity, parentId: undefined},
      },
      {...application, bodySections: application.bodySections.slice(0, 1)},
      {...application, faqs: application.faqs.slice(0, 3)},
      {
        ...application,
        decisionGuide: {
          ...application.decisionGuide,
          selectionFactors: application.decisionGuide.selectionFactors.slice(0, 2),
        },
      },
    ]

    for (const incomplete of incompleteApplications) {
      rerender(
        <ApplicationPageRenderer application={incomplete as never} />,
      )
      expect(container.childElementCount).toBe(0)
    }
  })

  it.each([
    [
      'a noncanonical own identity',
      (application: ApplicationPageDto) => {
        application.identity.family = 'Wrong family'
      },
    ],
    [
      'a missing canonical Hub child',
      (application: ApplicationPageDto) => {
        application.children = application.children.slice(1)
      },
    ],
    [
      'a canonical child assigned to the wrong parent',
      (application: ApplicationPageDto) => {
        application.children[0] = application.children[1]!
      },
    ],
  ] as const)(
    'rejects %s at the canonical Application graph boundary',
    (_name, mutate) => {
      const {container} = render(
        <ApplicationPageRenderer application={mutateFixture(mutate)} />,
      )

      expect(container.childElementCount).toBe(0)
    },
  )

  it('rejects universal-multi-application when any required cross-category edge is missing', () => {
    const application = universalApplicationFixture()
    application.relationships = application.relationships.filter(
      ({type, id}) => !(type === 'application' && id === 'printing-inks'),
    )

    const {container} = render(
      <ApplicationPageRenderer application={application} />,
    )

    expect(container.childElementCount).toBe(0)
  })

  it.each([
    [
      'script markup in the direct answer',
      (application: ApplicationPageDto) => {
        application.hero.directAnswer =
          '<p>Visible answer.</p><script>alert(1)</script>'
      },
    ],
    [
      'an event handler in a body section',
      (application: ApplicationPageDto) => {
        application.bodySections[0]!.html = '<p onclick="track()">Visible body.</p>'
      },
    ],
    [
      'unsupported markup in an FAQ answer',
      (application: ApplicationPageDto) => {
        application.faqs[0]!.answerHtml = '<section>Visible answer.</section>'
      },
    ],
    [
      'rich content that becomes empty in the disclaimer',
      (application: ApplicationPageDto) => {
        application.disclaimerHtml = '<img src="x" onerror="alert(1)">'
      },
    ],
  ] as const)('rejects %s instead of rendering hostile rich text', (_name, mutate) => {
    const {container} = render(
      <ApplicationPageRenderer application={mutateFixture(mutate)} />,
    )

    expect(container.childElementCount).toBe(0)
  })

  it.each([
    [
      'a noncanonical child path',
      (application: ApplicationPageDto) => {
        application.children[0]!.path = '/applications/coatings/'
      },
    ],
    [
      'an unsafe relationship path',
      (application: ApplicationPageDto) => {
        const relationship = application.relationships.find(
          ({type}) => type === 'resource',
        )
        if (!relationship) throw new Error('Missing Resource fixture')
        relationship.path = 'javascript:alert(1)'
      },
    ],
    [
      'an unsafe relationship href',
      (application: ApplicationPageDto) => {
        const relationship = application.relationships.find(
          ({type}) => type === 'resource',
        )
        if (!relationship) throw new Error('Missing Resource fixture')
        relationship.href = 'javascript:alert(1)'
      },
    ],
    [
      'a relationship href that differs from its canonical path',
      (application: ApplicationPageDto) => {
        const relationship = application.relationships.find(
          ({type}) => type === 'resource',
        )
        if (!relationship) throw new Error('Missing Resource fixture')
        relationship.href = '/resources/article-02'
      },
    ],
    [
      'markup in a resolved child title',
      (application: ApplicationPageDto) => {
        application.children[0]!.title = '<strong>Resolved child</strong>'
      },
    ],
    [
      'a private location in a relationship title',
      (application: ApplicationPageDto) => {
        application.relationships[0]!.title = 'Open /tmp/private-source.txt'
      },
    ],
  ] as const)('rejects %s at the resolved-link boundary', (_name, mutate) => {
    const {container} = render(
      <ApplicationPageRenderer application={mutateFixture(mutate)} />,
    )

    expect(container.childElementCount).toBe(0)
  })

  it.each([
    ['a forbidden TDS field on a child', false, {tdsUrl: '/private/tds.pdf'}],
    ['an arbitrary extra field on a child', false, {trackingId: 'synthetic-tracker'}],
    ['a forbidden source field on a relationship', true, {sourcePath: 'C:\\private\\source.txt'}],
    ['an arbitrary extra field on a relationship', true, {debugNote: 'private'}],
  ] as const)(
    'rejects %s at the strict resolved-link boundary',
    (_name, relationship, extra) => {
      const application = applicationFixture('hub')
      Object.assign(
        relationship ? application.relationships[0]! : application.children[0]!,
        extra,
      )

      const {container} = render(
        <ApplicationPageRenderer application={application} />,
      )
      expect(container.childElementCount).toBe(0)
    },
  )

  it.each(['javascript:alert(1)', '/contact/'])(
    'rejects unsafe or noncanonical CTA href %s',
    (href) => {
      const application = mutateFixture((value) => {
        value.ctas[0]!.href = href
      })
      const {container} = render(
        <ApplicationPageRenderer application={application} />,
      )

      expect(container.childElementCount).toBe(0)
    },
  )

  it.each([
    [
      'a known Application ID with another known Application path',
      (application: ApplicationPageDto) => {
        application.children[0]!.path = '/applications/plastics'
        application.children[0]!.href = '/applications/plastics'
      },
    ],
    [
      'a known Resource ID with another known Resource path',
      (application: ApplicationPageDto) => {
        const relationship = application.relationships.find(
          ({type}) => type === 'resource',
        )
        if (!relationship) throw new Error('Missing Resource fixture')
        relationship.path = '/resources/chloride-vs-sulfate-titanium-dioxide'
        relationship.href = '/resources/chloride-vs-sulfate-titanium-dioxide'
      },
    ],
    [
      'a known Product ID with another known Product path',
      (application: ApplicationPageDto) => {
        const relationship = application.relationships.find(
          ({type}) => type === 'product',
        )
        if (!relationship) throw new Error('Missing Product fixture')
        relationship.path = '/products/tp-p300'
        relationship.href = '/products/tp-p300'
      },
    ],
    [
      'an unknown Application ID with a valid-looking path',
      (application: ApplicationPageDto) => {
        application.children[0]!.id = 'unknown-category'
        application.children[0]!.path = '/applications/unknown-category'
        application.children[0]!.href = '/applications/unknown-category'
      },
    ],
    [
      'an unknown Resource ID with a valid-looking path',
      (application: ApplicationPageDto) => {
        const relationship = application.relationships.find(
          ({type}) => type === 'resource',
        )
        if (!relationship) throw new Error('Missing Resource fixture')
        relationship.id = 'article-99'
        relationship.path = '/resources/article-99'
        relationship.href = '/resources/article-99'
      },
    ],
    [
      'an unknown Product ID with a valid-looking path',
      (application: ApplicationPageDto) => {
        const relationship = application.relationships.find(
          ({type}) => type === 'product',
        )
        if (!relationship) throw new Error('Missing Product fixture')
        relationship.id = 'TP-X999'
        relationship.path = '/products/tp-x999'
        relationship.href = '/products/tp-x999'
      },
    ],
  ] as const)(
    'rejects %s at the canonical target boundary',
    (_name, mutate) => {
      const {container} = render(
        <ApplicationPageRenderer application={mutateFixture(mutate)} />,
      )

      expect(container.childElementCount).toBe(0)
    },
  )

  it('renders a complete authoritative DTO with harmless internal whitespace', () => {
    const input = applicationInput('hub')
    input.decisionGuide.context =
      'This synthetic hub groups  fictional\n evaluation contexts.'
    const application = toApplicationPageDto(input, resolveTarget)
    const {container} = render(
      <ApplicationPageRenderer application={application} />,
    )

    expect(container.querySelector('[data-application-mode="hub"]')).not.toBeNull()
    expect(container.textContent).toContain(
      'This synthetic hub groups  fictional\n evaluation contexts.',
    )
  })
})
