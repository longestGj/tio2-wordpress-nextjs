// @vitest-environment jsdom

import {readFileSync} from 'node:fs'
import {resolve} from 'node:path'

import {cleanup, render, screen, within} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {afterEach, describe, expect, it, vi} from 'vitest'

import {ProductFamily} from '@/components/products/product-family'
import {ProductPageRenderer} from '@/components/products/product-page-renderer'
import {ProductResourceLinks} from '@/components/products/product-resource-links'
import {resolveCanonicalEditorialTarget} from '@/lib/editorial/content-targets'
import type {EditorialLinkResolver, EditorialTarget} from '@/lib/editorial/types'
import {toProductFamilyPageDto} from '@/lib/products/page-dto'
import {SITE_A_PRODUCT_IDENTITIES} from '@/lib/products/page-graph'
import type {
  ProductFamilyPageDto,
  ProductPageResolver,
} from '@/lib/products/page-types'
import {coatingsFamilyPageInput} from '@/tests/fixtures/products/product-pages'

vi.mock('next/font/google', () => ({
  Source_Sans_3: () => ({variable: 'source-sans-font'}),
  Space_Grotesk: () => ({variable: 'space-grotesk-font'}),
}))

const EXPECTED_SECTION_ORDER = [
  'breadcrumb',
  'hero',
  'decision-rail',
  'family-navigation',
  'grade-comparison',
  'selection-method',
  'validation-method',
  'technical-resources',
  'technical-enquiry',
  'faq',
  'technical-disclaimer',
] as const

const EXPECTED_GRADE_IDS = [
  'TP-C050',
  'TP-C100',
  'TP-C110',
  'TP-C120',
  'TP-C200',
  'TP-C300',
  'TP-C310',
  'TP-C400',
  'TP-C410',
] as const

const FAMILY_PRESENTATION = {
  breadcrumb: {homeLabel: 'Home', productsLabel: 'Products'},
  hero: {
    imageAlt: 'Titanium dioxide for coatings',
    familyActionLabel: 'Explore Coatings Grades',
    enquiryAction: {
      kind: 'discuss-application',
      label: 'Discuss Your Application',
    },
  },
  familyNavigation: {
    eyebrow: 'Family Navigation',
    heading: 'Explore coatings grades',
    intro:
      'Filter the coatings portfolio by application, compare the candidate grades and open the relevant Product Detail pages before formulation trials.',
    searchLabel: 'Filter coatings grades by model',
    searchPlaceholder: 'Filter by model',
    singularResultLabel: 'matching grade',
    pluralResultLabel: 'matching grades',
    resetLabel: 'Reset filters',
    noResults: 'No matching coatings grades',
    candidateActionLabel: 'View Product',
    candidates: [
      {productId: 'TP-C050', highlights: 'Low ion content · Electrical resistivity · Whiteness · Gloss', badge: null},
      {productId: 'TP-C100', highlights: 'Neutral tint · Hiding power · Whiteness · Durability', badge: null},
      {productId: 'TP-C110', highlights: 'Neutral tint · Hiding power · Whiteness · Durability', badge: null},
      {productId: 'TP-C120', highlights: 'Relatively low viscosity · Bluish tone · Hiding power · Gloss · Durability', badge: 'Premium'},
      {productId: 'TP-C200', highlights: 'Dry hiding power · Weather resistance · Water dispersibility · Oil absorption', badge: null},
      {productId: 'TP-C300', highlights: 'Durability · Weather resistance · Gloss · Hiding power', badge: null},
      {productId: 'TP-C310', highlights: 'Water dispersibility · Storage stability · Weather resistance · Chalk resistance', badge: null},
      {productId: 'TP-C400', highlights: 'Ultra-high weather resistance · Chalk resistance · Color retention · Dispersibility', badge: null},
      {productId: 'TP-C410', highlights: 'Extremely high weather resistance · Chalk resistance · Color retention · Dispersibility', badge: null},
    ],
  },
  comparison: {
    eyebrow: 'Grade Comparison',
    heading: 'Compare coatings grades',
    intro:
      'Compare the application focus, key formulation priorities and available surface-treatment or product-positioning information for all nine coatings grades. Full Typical Properties tables are provided on the Product Detail pages.',
    regionLabel: 'Coatings grade comparison table',
    headers: {
      grade: 'Grade',
      applicationFocus: 'Application Focus',
      performanceFocus: 'Key Performance Focus',
      surfaceTreatmentPositioning: 'Surface Treatment / Positioning',
    },
    noteLabel: 'Comparison note:',
    note:
      'Grade numbers do not represent a performance ranking. Final selection should be confirmed under matched formulation and test conditions.',
  },
  selectionApplication: {
    heading: 'Need coating-application guidance?',
    description:
      'The Coatings Application page covers formulation problems, subapplication routes and selection factors in greater depth, while this page focuses on the TIOVAR coatings portfolio.',
    actionLabel: 'Explore Coatings Applications',
  },
  validation: {
    eyebrow: 'Validation Method',
    heading: 'Move from grade selection to finished-film evidence',
  },
  resources: {
    eyebrow: 'Technical Resources',
    heading: 'Build the next stage of your coatings comparison',
    cards: [
      {
        category: 'High-PVC',
        description: 'Understand why formulation balance matters above CPVC.',
      },
      {
        category: 'Durability',
        description: 'Connect pigment selection with the complete exposure protocol.',
      },
      {
        category: 'Comparison',
        description:
          'Compare candidate grades under matched formulation and test conditions.',
      },
    ],
  },
  enquiryContextFields: [
    'Binder chemistry',
    'PVC and solids',
    'Current pigment',
    'Application and cure',
    'Target properties, exposure and destination market',
  ],
  faq: {eyebrow: 'Common Questions', heading: 'Frequently Asked Questions'},
  disclaimerLabel: 'Technical Disclaimer',
  footerDescription:
    'Application-specific titanium dioxide products and technical support for industrial formulations.',
} as const

const productPaths = new Map<string, string>(
  SITE_A_PRODUCT_IDENTITIES.map(({id, path}) => [id, path]),
)
const titles = new Map<string, string>([
  ['coatings', 'Titanium Dioxide for Coatings'],
  ['article-08', 'How to Reduce TiO₂ Cost in High-PVC Flat Paint'],
  ['article-10', 'How to Choose Titanium Dioxide for Outdoor Durability'],
  ['article-07', 'How to Evaluate a Titanium Dioxide Alternative Grade'],
])

function pathFor(target: EditorialTarget): string | null {
  if (target.type === 'product') return productPaths.get(target.id) ?? null
  return resolveCanonicalEditorialTarget(target.type, target.id)?.path ?? null
}

function familyFixture(authorized: readonly string[] = []): ProductFamilyPageDto {
  const editorial: EditorialLinkResolver = (target) => {
    const path = pathFor(target)
    if (!path) return null
    return {
      ...target,
      title: titles.get(target.id) ?? target.id,
      path,
      href: authorized.includes(path) ? path : null,
    }
  }
  const resolver: ProductPageResolver = {
    editorial,
    publicHref: (path) => path === '/' || authorized.includes(path) ? path : null,
    ctaHref: (kind) => `mailto:contact@tio2products.com?subject=${kind}`,
  }
  const input = {
    ...structuredClone(coatingsFamilyPageInput),
    presentation: structuredClone(FAMILY_PRESENTATION),
  }
  return toProductFamilyPageDto(input, resolver)
}

function candidateIds(container: HTMLElement): string[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>('[data-family-candidate]'),
    (item) => item.dataset.familyCandidate ?? '',
  )
}

function visibleCandidateIds(container: HTMLElement): string[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>('[data-family-candidate]:not([hidden])'),
    (item) => item.dataset.familyCandidate ?? '',
  )
}

function comparisonIds(container: HTMLElement): string[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>('[data-family-comparison-row]'),
    (item) => item.dataset.familyComparisonRow ?? '',
  )
}

afterEach(cleanup)

describe('ProductFamily', () => {
  it('renders the exact approved Family flow, one H1, and both complete nine-grade lists', () => {
    const page = familyFixture(['/products/coatings/tp-c120'])
    const {container} = render(<ProductPageRenderer page={page} />)
    const sections = Array.from(
      container.querySelectorAll<HTMLElement>('[data-product-section]'),
    )

    expect(sections.map((section) => section.dataset.productSection)).toEqual(
      EXPECTED_SECTION_ORDER,
    )
    expect(container.querySelectorAll('h1')).toHaveLength(1)
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Titanium Dioxide Products for Coatings',
      }),
    ).not.toBeNull()
    expect(candidateIds(container)).toEqual(EXPECTED_GRADE_IDS)
    expect(comparisonIds(container)).toEqual(EXPECTED_GRADE_IDS)
    expect(screen.getAllByRole('columnheader').map(({textContent}) => textContent)).toEqual([
      'Grade',
      'Application Focus',
      'Key Performance Focus',
      'Surface Treatment / Positioning',
    ])
    expect(screen.getByRole('region', {name: 'Coatings grade comparison table'}).tabIndex).toBe(0)

    const breadcrumb = screen.getByRole('navigation', {name: 'Breadcrumb'})
    expect(within(breadcrumb).getByText('Coatings').getAttribute('aria-current')).toBe(
      'page',
    )
    expect(within(breadcrumb).getAllByRole('link').map((link) => link.textContent)).toEqual([
      'Home',
    ])
    expect(screen.getByRole('contentinfo').textContent).toContain('TIOVAR')
  })

  it('keeps a closed Products breadcrumb as text instead of a dead canonical anchor', () => {
    render(<ProductFamily page={familyFixture()} />)
    const breadcrumb = screen.getByRole('navigation', {name: 'Breadcrumb'})

    expect(within(breadcrumb).getAllByRole('link').map((link) => link.textContent)).toEqual([
      'Home',
    ])
    expect(within(breadcrumb).getByText('Products').closest('a')).toBeNull()
  })

  it('renders approved visible template copy from the Family DTO only', () => {
    const page = familyFixture()
    page.presentation = {
      ...structuredClone(FAMILY_PRESENTATION),
      breadcrumb: {
        ...page.presentation.breadcrumb,
        homeLabel: 'Fixture home',
        productsLabel: 'Fixture products',
      },
      hero: {
        imageAlt: 'Fixture family image',
        familyAction: {label: 'Fixture family action', href: '#family-candidates'},
        enquiryAction: {
          kind: 'discuss-application',
          label: 'Fixture enquiry action',
          href: 'mailto:contact@tio2products.com?subject=discuss-application',
        },
      },
      familyNavigation: {
        ...FAMILY_PRESENTATION.familyNavigation,
        candidates: FAMILY_PRESENTATION.familyNavigation.candidates.map(
          (candidate) => ({...candidate}),
        ),
        eyebrow: 'Fixture navigation eyebrow',
        heading: 'Fixture navigation heading',
        intro: 'Fixture navigation intro.',
        searchLabel: 'Fixture search label',
        searchPlaceholder: 'Fixture search placeholder',
        resetLabel: 'Fixture reset',
        noResults: 'Fixture no results',
        candidateActionLabel: 'Fixture candidate action',
      },
      comparison: {
        ...FAMILY_PRESENTATION.comparison,
        eyebrow: 'Fixture comparison eyebrow',
        heading: 'Fixture comparison heading',
        intro: 'Fixture comparison intro.',
        regionLabel: 'Fixture comparison region',
        noteLabel: 'Fixture note label',
        note: 'Fixture comparison note.',
      },
      selectionApplication: {
        heading: 'Fixture application heading',
        description: 'Fixture application description.',
        actionLabel: 'Fixture application action',
      },
      validation: {
        eyebrow: 'Fixture validation eyebrow',
        heading: 'Fixture validation heading',
      },
      resources: {
        eyebrow: 'Fixture resources eyebrow',
        heading: 'Fixture resources heading',
        cards: [
          {category: 'Fixture category one', description: 'Fixture resource one.'},
          {category: 'Fixture category two', description: 'Fixture resource two.'},
          {category: 'Fixture category three', description: 'Fixture resource three.'},
        ],
      },
      enquiryContextFields: [
        'Fixture context one',
        'Fixture context two',
        'Fixture context three',
        'Fixture context four',
        'Fixture context five',
      ],
      faq: {eyebrow: 'Fixture FAQ eyebrow', heading: 'Fixture FAQ heading'},
      disclaimerLabel: 'Fixture disclaimer label',
      footerDescription: 'Fixture footer description.',
    }

    const {container} = render(<ProductFamily page={page} />)

    for (const expected of [
      'Fixture home',
      'Fixture products',
      'Fixture family action',
      'Fixture enquiry action',
      'Fixture navigation eyebrow',
      'Fixture navigation intro.',
      'Fixture candidate action',
      'Fixture comparison heading',
      'Fixture comparison intro.',
      'Fixture note label',
      'Fixture application heading',
      'Fixture application action',
      'Fixture validation heading',
      'Fixture resources heading',
      'Fixture category one',
      'Fixture resource three.',
      'Fixture context five',
      'Fixture FAQ heading',
      'Fixture disclaimer label',
      'Fixture footer description.',
    ]) {
      expect(container.textContent).toContain(expected)
    }
    expect(screen.getByRole('searchbox', {name: 'Fixture search label'}).getAttribute('placeholder')).toBe(
      'Fixture search placeholder',
    )
    expect(container.querySelector('[data-product-section="hero"] img')?.getAttribute('alt')).toBe(
      'Fixture family image',
    )
    expect(screen.getByRole('region', {name: 'Fixture comparison region'})).not.toBeNull()
  })

  it('keeps product, application, resource, and TDS destinations request-only unless gated open', () => {
    const page = familyFixture([
      '/products/coatings/tp-c120',
      '/resources/evaluate-titanium-dioxide-alternative',
    ])
    const {container} = render(<ProductFamily page={page} />)

    expect(screen.getAllByRole('link', {name: 'View Product'})).toHaveLength(1)
    expect(screen.getByRole('link', {name: 'View Product'}).getAttribute('href')).toBe(
      '/products/coatings/tp-c120',
    )
    expect(screen.getAllByText('View Product')).toHaveLength(9)
    expect(
      screen.getByRole('link', {
        name: 'How to Evaluate a Titanium Dioxide Alternative Grade',
      }).getAttribute('href'),
    ).toBe('/resources/evaluate-titanium-dioxide-alternative')
    expect(screen.queryByRole('link', {name: 'Explore Coatings Applications'})).toBeNull()
    expect(container.querySelector('a[download]')).toBeNull()
    expect(container.querySelector('a[href$=".pdf" i]')).toBeNull()
    expect(container.querySelector('a[href*="/tds" i]')).toBeNull()
  })

  it('preserves every approved distinction without scoring or equivalence claims', () => {
    const {container} = render(<ProductFamily page={familyFixture()} />)
    const expectedDistinctions = new Map([
      ['TP-C050', /Electrophoretic/u],
      ['TP-C100', /General-purpose/u],
      ['TP-C110', /Multi-purpose/u],
      ['TP-C120', /Water-based interior and exterior wall emulsion paints[\s\S]*TIOVAR Premium/u],
      ['TP-C200', /high-PVC[\s\S]*dry hiding/iu],
      ['TP-C300', /High durability/u],
      ['TP-C310', /Waterborne Coatings/u],
      ['TP-C400', /Ultra-High Weatherability/u],
      ['TP-C410', /Extremely High Weather Resistance/u],
    ])

    for (const [productId, distinction] of expectedDistinctions) {
      const row = container.querySelector<HTMLElement>(
        `[data-family-comparison-row="${productId}"]`,
      )
      expect(row?.textContent).toMatch(distinction)
    }
    const candidatesAndRows = [
      ...container.querySelectorAll<HTMLElement>('[data-family-candidate]'),
      ...container.querySelectorAll<HTMLElement>('[data-family-comparison-row]'),
    ].map(({textContent}) => textContent).join(' ')
    expect(candidatesAndRows).not.toMatch(
      /\bbest\b|\bequivalent\b|\brecommend(?:ed|ation)?\b|\brank(?:ed|ing)?\b/iu,
    )
  })

  it('renders the nine approved candidate highlights independently from comparison copy', () => {
    const {container} = render(<ProductFamily page={familyFixture()} />)
    const expectedCandidates = new Map([
      ['TP-C050', 'Low ion content · Electrical resistivity · Whiteness · Gloss'],
      ['TP-C100', 'Neutral tint · Hiding power · Whiteness · Durability'],
      ['TP-C110', 'Neutral tint · Hiding power · Whiteness · Durability'],
      ['TP-C120', 'Relatively low viscosity · Bluish tone · Hiding power · Gloss · Durability'],
      ['TP-C200', 'Dry hiding power · Weather resistance · Water dispersibility · Oil absorption'],
      ['TP-C300', 'Durability · Weather resistance · Gloss · Hiding power'],
      ['TP-C310', 'Water dispersibility · Storage stability · Weather resistance · Chalk resistance'],
      ['TP-C400', 'Ultra-high weather resistance · Chalk resistance · Color retention · Dispersibility'],
      ['TP-C410', 'Extremely high weather resistance · Chalk resistance · Color retention · Dispersibility'],
    ])

    for (const [productId, highlights] of expectedCandidates) {
      const candidate = container.querySelector<HTMLElement>(
        `[data-family-candidate="${productId}"]`,
      )
      expect(candidate?.textContent).toContain(highlights)
    }
    const premiumCandidate = container.querySelector<HTMLElement>(
      '[data-family-candidate="TP-C120"]',
    )
    expect(within(premiumCandidate!).getByText('Premium')).not.toBeNull()

    const comparisonC400 = container.querySelector<HTMLElement>(
      '[data-family-comparison-row="TP-C400"]',
    )
    expect(comparisonC400?.textContent).toContain(
      'Ultra-high weather resistance, chalk resistance, color retention, gloss, hiding power',
    )
    expect(comparisonC400?.textContent).not.toContain('Dispersibility')
  })

  it('safely zips resource cards when an unchecked caller supplies an extra resource', () => {
    const resources = familyFixture().resources.concat({
      type: 'resource' as const,
      id: 'article-06',
      title: 'Extra resource',
      path: '/resources/surface-treatment-titanium-dioxide-performance',
      href: null,
    })

    const {container} = render(
      <ProductResourceLinks
        cards={FAMILY_PRESENTATION.resources.cards}
        resources={resources}
      />,
    )
    expect(container.querySelectorAll('article')).toHaveLength(3)
  })

  it('uses the correctly sized responsive priority Next Image for the Family hero', () => {
    const {container} = render(<ProductFamily page={familyFixture()} />)
    const image = container.querySelector<HTMLImageElement>(
      '[data-product-section="hero"] img',
    )

    expect(image?.getAttribute('src')).toContain('coatings-family-hero.png')
    expect(image?.getAttribute('alt')).toBe('Titanium dioxide for coatings')
    expect(image?.getAttribute('width')).toBe('1536')
    expect(image?.getAttribute('height')).toBe('1024')
    expect(image?.getAttribute('sizes')).toBe('(max-width: 700px) 100vw, 62vw')
    expect(image?.getAttribute('fetchpriority')).toBe('high')
  })
})

describe('FamilyProductFilter', () => {
  it('ships all candidates in source order and exposes every approved chip state', () => {
    const {container} = render(<ProductFamily page={familyFixture()} />)

    expect(candidateIds(container)).toEqual(EXPECTED_GRADE_IDS)
    expect(visibleCandidateIds(container)).toEqual(EXPECTED_GRADE_IDS)
    expect(screen.getByText('9 matching grades')).not.toBeNull()
    for (const label of [
      'All directions',
      'Water-based',
      'Architectural',
      'Automotive & exterior',
      'Specialty',
    ]) {
      const chip = screen.getByRole('button', {name: label})
      expect(chip.getAttribute('aria-pressed')).toBe(
        label === 'All directions' ? 'true' : 'false',
      )
    }
  })

  it('matches models, combines search with a chip, resets, and never filters the comparison table', async () => {
    const user = userEvent.setup()
    const {container} = render(<ProductFamily page={familyFixture()} />)
    const search = screen.getByRole('searchbox', {
      name: 'Filter coatings grades by model',
    })

    await user.type(search, 'c1')
    expect(visibleCandidateIds(container)).toEqual(['TP-C100', 'TP-C110', 'TP-C120'])
    expect(screen.getByText('3 matching grades')).not.toBeNull()
    expect(candidateIds(container)).toEqual(EXPECTED_GRADE_IDS)
    expect(comparisonIds(container)).toEqual(EXPECTED_GRADE_IDS)

    await user.click(screen.getByRole('button', {name: 'Automotive & exterior'}))
    expect(visibleCandidateIds(container)).toEqual([])
    expect(screen.getByText('No matching coatings grades')).not.toBeNull()
    expect(screen.getByRole('button', {name: 'Automotive & exterior'}).getAttribute('aria-pressed')).toBe(
      'true',
    )
    expect(comparisonIds(container)).toEqual(EXPECTED_GRADE_IDS)

    await user.clear(search)
    expect(visibleCandidateIds(container)).toEqual([
      'TP-C300',
      'TP-C310',
      'TP-C400',
      'TP-C410',
    ])
    await user.type(search, '310')
    expect(visibleCandidateIds(container)).toEqual(['TP-C310'])
    expect(screen.getByText('1 matching grade')).not.toBeNull()
    expect(comparisonIds(container)).toEqual(EXPECTED_GRADE_IDS)

    await user.click(screen.getByRole('button', {name: 'Reset filters'}))
    expect((search as HTMLInputElement).value).toBe('')
    expect(visibleCandidateIds(container)).toEqual(EXPECTED_GRADE_IDS)
    expect(screen.getByRole('button', {name: 'All directions'}).getAttribute('aria-pressed')).toBe(
      'true',
    )
    expect(comparisonIds(container)).toEqual(EXPECTED_GRADE_IDS)
  })

  it('shows neutral no-result feedback without candidate recommendation or scoring language', async () => {
    const user = userEvent.setup()
    const {container} = render(<ProductFamily page={familyFixture()} />)

    await user.type(
      screen.getByRole('searchbox', {name: 'Filter coatings grades by model'}),
      'not-a-grade',
    )

    const emptyState = screen.getByText('No matching coatings grades')
    expect(emptyState).not.toBeNull()
    expect(emptyState.textContent).not.toMatch(
      /best|equivalent|recommend(?:ed|ation)?|score|rank(?:ed|ing)?/iu,
    )
    expect(candidateIds(container)).toEqual(EXPECTED_GRADE_IDS)
    expect(comparisonIds(container)).toEqual(EXPECTED_GRADE_IDS)
  })
})

describe('approved v0.5 Family CSS and server boundary', () => {
  it('contains horizontal overflow to the labelled table region at mobile width', () => {
    const componentDirectory = resolve(process.cwd(), 'components/products')
    const sharedCss = readFileSync(
      resolve(componentDirectory, 'product-layout.module.css'),
      'utf8',
    )
    const familyCss = readFileSync(
      resolve(componentDirectory, 'product-family.module.css'),
      'utf8',
    )

    expect(sharedCss).toMatch(/\.productExperience\s*\{[\s\S]*?overflow:\s*clip/u)
    expect(sharedCss).toMatch(/\.productPage\s*\{[\s\S]*?overflow:\s*clip/u)
    expect(familyCss).toMatch(/@media\s*\(max-width:\s*700px\)/u)
    expect(familyCss).toMatch(
      /\.comparisonRegion\s*\{[\s\S]*?overflow-x:\s*auto/u,
    )
    expect(familyCss).toMatch(/\.comparisonTable\s*\{[\s\S]*?min-width:\s*900px/u)
    expect(familyCss).not.toMatch(/body\s*\{[\s\S]*?overflow-x:\s*auto/iu)
  })

  it('keeps the Family page server-rendered with only the filter marked as client code', () => {
    const componentDirectory = resolve(process.cwd(), 'components/products')
    const familySource = readFileSync(
      resolve(componentDirectory, 'product-family.tsx'),
      'utf8',
    )
    const filterSource = readFileSync(
      resolve(componentDirectory, 'family-product-filter.tsx'),
      'utf8',
    )

    expect(familySource).not.toMatch(/^['"]use client['"]/u)
    expect(filterSource).toMatch(/^['"]use client['"]/u)
    expect(filterSource).not.toMatch(/\basync\s+function\s+FamilyProductFilter\b/u)
    expect(filterSource).not.toContain('useEffect')
    expect(filterSource).not.toContain('useMemo')
    expect(filterSource).toContain("const ALL_FILTER_SLUG = 'all'")
    expect(filterSource).not.toMatch(/filters\[0\].*slug/u)
  })

  it('locks the approved v0.5 filter, comparison, selection, and validation declarations', () => {
    const familyCss = readFileSync(
      resolve(process.cwd(), 'components/products/product-family.module.css'),
      'utf8',
    )

    expect(familyCss).toMatch(/\.filterBar\s*\{[\s\S]*?position:\s*sticky[\s\S]*?top:\s*0[\s\S]*?border-block:\s*1px solid var\(--product-rule\)[\s\S]*?padding:\s*1rem 0/u)
    expect(familyCss).toMatch(/\.comparisonRegion\s*\{[\s\S]*?border:\s*1px solid var\(--product-silver\)/u)
    expect(familyCss).toMatch(/\.comparisonTable\s*\{[\s\S]*?background:\s*var\(--product-paper\)/u)
    expect(familyCss).toMatch(/\.comparisonTable thead th\s*\{[\s\S]*?color:\s*var\(--product-steel\)[\s\S]*?text-transform:\s*uppercase/u)
    expect(familyCss).not.toMatch(/\.comparisonTable thead th\s*\{[\s\S]*?background:\s*var\(--product-navy\)/u)
    expect(familyCss).toMatch(/\.selectionGrid\s*\{[\s\S]*?grid-template-columns:\s*0\.9fr 1\.1fr/u)
    expect(familyCss).toMatch(/\.validationList\s*\{[\s\S]*?gap:\s*1px[\s\S]*?background:\s*var\(--product-silver\)[\s\S]*?padding:\s*1px/u)
    expect(familyCss).not.toMatch(/\.validationList li\s*\{[\s\S]*?border-top:\s*4px/u)
  })

  it('keeps approved visible Family copy out of component source', () => {
    const componentDirectory = resolve(process.cwd(), 'components/products')
    const source = [
      'family-product-filter.tsx',
      'product-family.tsx',
    ].map((fileName) =>
      readFileSync(resolve(componentDirectory, fileName), 'utf8'),
    ).join('\n')

    for (const forbiddenLiteral of [
      'Family Navigation',
      'Explore coatings grades',
      'Filter by model',
      'No matching coatings grades',
      'View Product',
      'Grade Comparison',
      'Compare coatings grades',
      'Key Performance Focus',
      'Comparison note:',
      'Validation Method',
      'Technical Resources',
      'Common Questions',
      'Technical Disclaimer',
    ]) {
      expect(source).not.toContain(forbiddenLiteral)
    }
  })
})
