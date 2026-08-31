// @vitest-environment jsdom

import {readFileSync, readdirSync} from 'node:fs'
import {resolve} from 'node:path'

import {cleanup, render, screen, within} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {afterEach, describe, expect, it, vi} from 'vitest'

import {KnownGradeFilter} from '@/components/products/known-grade-filter'
import {ProductPageRenderer} from '@/components/products/product-page-renderer'
import {ProductsHub} from '@/components/products/products-hub'
import {resolveCanonicalEditorialTarget} from '@/lib/editorial/content-targets'
import type {EditorialLinkResolver, EditorialTarget} from '@/lib/editorial/types'
import {toProductsHubPageDto} from '@/lib/products/page-dto'
import {SITE_A_PRODUCT_IDENTITIES} from '@/lib/products/page-graph'
import type {
  ProductPageResolver,
  ProductsHubPageDto,
} from '@/lib/products/page-types'
import {productsHubPageInput} from '@/tests/fixtures/products/product-pages'

vi.mock('next/font/google', () => ({
  Source_Sans_3: () => ({variable: 'source-sans-font'}),
  Space_Grotesk: () => ({variable: 'space-grotesk-font'}),
}))

const EXPECTED_SECTION_ORDER = [
  'breadcrumb',
  'hero',
  'decision-rail',
  'product-families',
  'known-grade',
  'decision-path',
  'application-boundary',
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
  'TP-P100',
  'TP-P110',
  'TP-P120',
  'TP-P200',
  'TP-P300',
  'TP-P310',
  'TP-P320',
  'TP-P330',
  'TP-PA100',
  'TP-PA110',
  'TP-PA120',
  'TP-I100',
  'TP-I200',
  'TP-S100',
  'TP-H100',
  'TP-U100',
] as const

const KNOWN_GRADE_COPY = {
  eyebrow: 'Known Grade',
  heading: 'Already know the grade?',
  help: 'Search a TIOVAR grade to open the corresponding product page.',
  searchLabel: 'Find a TIOVAR grade',
  searchPlaceholder: 'Try TP-C120 or C120',
  noResults: 'No matching grade',
} as const

const productPaths = new Map<string, string>(
  SITE_A_PRODUCT_IDENTITIES.map(({id, path}) => [id, path]),
)
const titles = new Map<string, string>([
  ['applications-hub', 'Applications'],
  ['article-03', 'Why TiO₂ Content Alone Does Not Determine Performance'],
  ['article-06', 'How Surface Treatment Changes Titanium Dioxide Performance'],
  ['article-07', 'How to Evaluate a Titanium Dioxide Alternative Grade'],
])

function pathFor(target: EditorialTarget): string | null {
  if (target.type === 'product') return productPaths.get(target.id) ?? null
  return resolveCanonicalEditorialTarget(target.type, target.id)?.path ?? null
}

function hubFixture(authorized: readonly string[] = []): ProductsHubPageDto {
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
  return toProductsHubPageDto(structuredClone(productsHubPageInput), resolver)
}

function visibleGradeIds(container: HTMLElement): string[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>('[data-known-grade-item]'),
    (item) => item.dataset.knownGradeItem ?? '',
  )
}

afterEach(cleanup)

describe('ProductsHub', () => {
  it('renders the exact approved Hub flow, counts, semantics, and closed links', () => {
    const page = hubFixture(['/products/coatings/tp-c120'])
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
        name: 'Titanium Dioxide Products',
      }),
    ).not.toBeNull()

    const familyCards = Array.from(
      container.querySelectorAll<HTMLElement>('[data-product-family]'),
    )
    expect(familyCards).toHaveLength(8)
    expect(
      familyCards.map((card) =>
        Number(card.querySelector('[data-product-family-count]')?.textContent),
      ),
    ).toEqual([9, 4, 4, 3, 2, 1, 1, 1])
    expect(container.querySelectorAll('[data-known-grade-item]')).toHaveLength(25)

    const breadcrumb = screen.getByRole('navigation', {name: 'Breadcrumb'})
    expect(within(breadcrumb).getByRole('list')).not.toBeNull()
    expect(within(breadcrumb).getByText('Products').getAttribute('aria-current')).toBe(
      'page',
    )
    expect(within(breadcrumb).getAllByRole('link')).toHaveLength(1)
    expect(within(breadcrumb).getByRole('link', {name: 'Home'}).getAttribute('href')).toBe(
      '/',
    )

    expect(screen.getAllByRole('link', {name: 'Discuss Your Application'})).not.toHaveLength(0)
    expect(screen.getAllByRole('link', {name: 'Request a TDS'})).not.toHaveLength(0)
    expect(screen.getByRole('contentinfo').textContent).toContain('TIOVAR')
    const experience = container.querySelector<HTMLElement>(
      '[data-product-experience]',
    )
    expect(experience?.querySelector('header a')).not.toBeNull()
    expect(experience?.querySelector('header summary')).not.toBeNull()
    expect(experience?.querySelector('footer a')).not.toBeNull()
    expect(container.querySelector('a[download]')).toBeNull()
    expect(container.querySelector('a[href$=".pdf" i]')).toBeNull()
    expect(container.querySelector('a[href*="/tds" i]')).toBeNull()

    const authorizedHrefs = new Set([
      '/',
      '/#product-families',
      '/products/coatings/tp-c120',
      '/#documents',
      '/#inquiry',
      'mailto:contact@tio2products.com?subject=discuss-application',
      'mailto:contact@tio2products.com?subject=request-tds',
    ])
    expect(
      Array.from(container.querySelectorAll<HTMLAnchorElement>('a[href]')).every(
        ({href}) => authorizedHrefs.has(new URL(href).pathname + new URL(href).hash) ||
          authorizedHrefs.has(href.replace(/^http:\/\/localhost:3000/u, '')) ||
          authorizedHrefs.has(href),
      ),
    ).toBe(true)
  })

  it('renders the exact approved v0.5 Hero CTA group and missing Hub copy', () => {
    const page = hubFixture()
    const {container} = render(<ProductsHub page={page} />)
    const hero = container.querySelector<HTMLElement>(
      '[data-product-section="hero"]',
    )
    const families = container.querySelector<HTMLElement>(
      '[data-product-section="product-families"]',
    )
    const boundary = container.querySelector<HTMLElement>(
      '[data-product-section="application-boundary"]',
    )
    const resources = container.querySelector<HTMLElement>(
      '[data-product-section="technical-resources"]',
    )
    const enquiry = container.querySelector<HTMLElement>(
      '[data-product-section="technical-enquiry"]',
    )

    expect(
      within(hero as HTMLElement)
        .getAllByRole('link')
        .map((link) => [link.textContent, link.getAttribute('href')]),
    ).toEqual([
      ['Browse Product Families', '#product-families'],
      [
        'Discuss Your Application',
        'mailto:contact@tio2products.com?subject=discuss-application',
      ],
    ])
    expect(families?.textContent).toContain(
      'Each family brings together titanium dioxide grades for a defined application and processing environment. Compare product positioning and technical focus before reviewing individual grades.',
    )
    expect(boundary?.textContent).toContain('Two Ways to Begin')
    expect(boundary?.textContent).toContain(
      'Use Products to compare the TIOVAR portfolio or review a known grade. Use Applications when your starting point is a formulation, resin, process or finished-product requirement.',
    )
    expect(resources?.textContent).toContain(
      'SelectionWhy TiO₂ Content Alone Does Not Determine PerformanceSee how pigment properties work together in an industrial formulation.',
    )
    expect(resources?.textContent).toContain(
      'TreatmentHow Surface Treatment Changes Titanium Dioxide PerformanceConnect surface treatment with dispersion, processing and finished-product performance.',
    )
    expect(resources?.textContent).toContain(
      'ValidationHow to Evaluate a Titanium Dioxide Alternative GradePlan a matched comparison using the formulation and test conditions that matter.',
    )
    expect(
      Array.from(
        enquiry?.querySelectorAll<HTMLElement>('[data-enquiry-context-field]') ?? [],
        (field) => field.textContent,
      ),
    ).toEqual([
      'Application or resin system',
      'Target market',
      'Current grade or benchmark',
      'Required quantity',
      'Performance priorities and processing conditions',
    ])
    expect(enquiry?.querySelector('ul')).not.toBeNull()
  })

  it('renders all approved visible template copy from the DTO presentation object', async () => {
    const user = userEvent.setup()
    const page = hubFixture() as ProductsHubPageDto & {
      presentation: Record<string, unknown>
    }
    page.presentation = {
      breadcrumb: {
        homeLabel: 'Fixture home',
        currentLabel: 'Fixture products',
        homeHref: '/',
      },
      hero: {
        imageAlt: 'Fixture image alternative',
        familyAction: {label: 'Fixture family action', href: '#product-families'},
        enquiryAction: {
          kind: 'discuss-application',
          label: 'Fixture enquiry action',
          href: 'mailto:contact@tio2products.com?subject=discuss-application',
        },
      },
      families: {
        eyebrow: 'Fixture families eyebrow',
        heading: 'Fixture families heading',
        intro: 'Fixture families intro.',
        singularCountLabel: 'fixture unit',
        pluralCountLabel: 'fixture units',
      },
      knownGrade: {
        eyebrow: 'Fixture grade eyebrow',
        heading: 'Fixture grade heading',
        help: 'Fixture grade help.',
        searchLabel: 'Fixture search label',
        searchPlaceholder: 'Fixture search placeholder',
        noResults: 'Fixture no results',
      },
      decisionPath: {
        eyebrow: 'Fixture decision eyebrow',
        heading: 'Fixture decision heading',
      },
      applicationBoundary: {
        eyebrow: 'Fixture boundary eyebrow',
        heading: 'Fixture boundary heading',
        intro: 'Fixture boundary intro.',
      },
      resources: {
        eyebrow: 'Fixture resources eyebrow',
        heading: 'Fixture resources heading',
        cards: [
          {category: 'Fixture category one', description: 'Fixture description one.'},
          {category: 'Fixture category two', description: 'Fixture description two.'},
          {category: 'Fixture category three', description: 'Fixture description three.'},
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

    const {container} = render(<ProductsHub page={page} />)

    for (const expected of [
      'Fixture home',
      'Fixture products',
      'Fixture family action',
      'Fixture enquiry action',
      'Fixture families eyebrow',
      'Fixture families heading',
      'Fixture families intro.',
      '9 fixture units',
      '1 fixture unit',
      'Fixture grade eyebrow',
      'Fixture grade heading',
      'Fixture grade help.',
      'Fixture boundary eyebrow',
      'Fixture boundary intro.',
      'Fixture resources heading',
      'Fixture category one',
      'Fixture description three.',
      'Fixture context five',
      'Fixture FAQ heading',
      'Fixture disclaimer label',
      'Fixture footer description.',
    ]) {
      expect(container.textContent).toContain(expected)
    }
    expect(
      container.querySelector('[data-product-section="hero"] img')?.getAttribute(
        'alt',
      ),
    ).toBe('Fixture image alternative')
    expect(
      screen.getByRole('searchbox', {name: 'Fixture search label'}).getAttribute(
        'placeholder',
      ),
    ).toBe('Fixture search placeholder')
    await user.type(
      screen.getByRole('searchbox', {name: 'Fixture search label'}),
      'not-present',
    )
    expect(screen.getByText('Fixture no results')).not.toBeNull()
  })

  it('renders DTO copy and only authorized links while preserving closed target titles', () => {
    const page = hubFixture(['/resources/what-is-cbu-in-titanium-dioxide'])
    const {container} = render(<ProductsHub page={page} />)
    const applicationBoundary = container.querySelector<HTMLElement>(
      '[data-product-section="application-boundary"]',
    )

    expect(container.innerHTML).toContain(page.hero.directAnswer)
    expect(
      within(applicationBoundary as HTMLElement).getByText(
        page.applicationBoundary.link.title,
      ),
    ).not.toBeNull()
    expect(
      screen.queryByRole('link', {name: page.applicationBoundary.link.title}),
    ).toBeNull()
    for (const resource of page.resources) {
      expect(screen.getByText(resource.title)).not.toBeNull()
      if (resource.href) {
        expect(screen.getByRole('link', {name: resource.title}).getAttribute('href')).toBe(
          resource.href,
        )
      } else {
        expect(screen.queryByRole('link', {name: resource.title})).toBeNull()
      }
    }
    expect(
      Array.from(container.querySelectorAll('[data-product-faq-item]')),
    ).toHaveLength(page.faqs.length)
    expect(
      container.querySelector('[data-product-section="technical-disclaimer"]')?.innerHTML,
    ).toContain(page.disclaimerHtml)
  })

  it('uses a correctly sized, responsive, priority Next Image for the Hub hero', () => {
    const {container} = render(<ProductsHub page={hubFixture()} />)
    const image = container.querySelector<HTMLImageElement>(
      '[data-product-section="hero"] img',
    )

    expect(image?.getAttribute('src')).toContain('products-hub-hero.jpg')
    expect(image?.getAttribute('alt')).toBe(
      'Titanium dioxide products for industrial applications',
    )
    expect(image?.getAttribute('width')).toBe('1400')
    expect(image?.getAttribute('height')).toBe('788')
    expect(image?.getAttribute('sizes')).toBe('(max-width: 700px) 100vw, 62vw')
    expect(image?.getAttribute('fetchpriority')).toBe('high')
  })
})

describe('KnownGradeFilter', () => {
  it('ships all 25 grades in the initial HTML and preserves source order', () => {
    const page = hubFixture()
    const {container} = render(
      <KnownGradeFilter copy={KNOWN_GRADE_COPY} grades={page.knownGrades} />,
    )

    expect(visibleGradeIds(container)).toEqual(EXPECTED_GRADE_IDS)
  })

  it.each(['C120', 'tp-c120'])('matches %s to TP-C120 only', async (query) => {
    const user = userEvent.setup()
    const page = hubFixture()
    const {container} = render(
      <KnownGradeFilter copy={KNOWN_GRADE_COPY} grades={page.knownGrades} />,
    )

    await user.type(screen.getByRole('searchbox', {name: 'Find a TIOVAR grade'}), query)

    expect(visibleGradeIds(container)).toEqual(['TP-C120'])
  })

  it('restores all grades for an empty query and never reorders matches', async () => {
    const user = userEvent.setup()
    const page = hubFixture()
    const {container} = render(
      <KnownGradeFilter copy={KNOWN_GRADE_COPY} grades={page.knownGrades} />,
    )
    const search = screen.getByRole('searchbox', {name: 'Find a TIOVAR grade'})

    await user.type(search, 'tp-')
    expect(visibleGradeIds(container)).toEqual(EXPECTED_GRADE_IDS)
    await user.clear(search)
    expect(visibleGradeIds(container)).toEqual(EXPECTED_GRADE_IDS)
  })

  it('shows a neutral empty state without recommendation or ranking language', async () => {
    const user = userEvent.setup()
    const page = hubFixture()
    const {container} = render(
      <KnownGradeFilter copy={KNOWN_GRADE_COPY} grades={page.knownGrades} />,
    )

    await user.type(
      screen.getByRole('searchbox', {name: 'Find a TIOVAR grade'}),
      'not-a-grade',
    )

    expect(screen.getByText('No matching grade')).not.toBeNull()
    expect(container.textContent).not.toMatch(/best|recommend(?:ed|ation)?|rank(?:ed|ing)?/iu)
  })
})

describe('approved v0.5 Products CSS and assets', () => {
  it('uses the approved tokens, boundary, focus, mobile reflow, and motion contract', () => {
    const componentDirectory = resolve(process.cwd(), 'components/products')
    const sharedCss = readFileSync(
      resolve(componentDirectory, 'product-layout.module.css'),
      'utf8',
    )
    const hubCss = readFileSync(
      resolve(componentDirectory, 'products-hub.module.css'),
      'utf8',
    )
    const css = `${sharedCss}\n${hubCss}`

    expect(css).toContain('--product-navy: #0a1f44;')
    expect(css).toContain('--product-navy-2: #112d59;')
    expect(css).toContain('--product-ink: #10203a;')
    expect(css).toContain('--product-muted: #5d687a;')
    expect(css).toContain('--product-silver: #c7ccd3;')
    expect(css).toContain('--product-ice: #f5f7f9;')
    expect(css).toContain('--product-focus: #4f82c4;')
    expect(css).toMatch(/width:\s*min\(100%,\s*1180px\)/u)
    expect(css).toMatch(/outline:\s*3px solid var\(--product-focus\)/u)
    expect(css).toContain('.productExperience a:focus-visible')
    expect(css).toContain('.productExperience button:focus-visible')
    expect(css).toContain('.productExperience input:focus-visible')
    expect(css).toContain('.productExperience summary:focus-visible')
    expect(css).toMatch(
      /\.enquiryInner\s*\{[\s\S]*?grid-template-columns:\s*\.8fr 1\.2fr/u,
    )
    expect(css).toMatch(/@media\s*\(max-width:\s*700px\)/u)
    expect(css).toMatch(/grid-template-columns:\s*1fr/u)
    expect(css).toMatch(/overflow(?:-x)?:\s*(?:clip|hidden)/u)
    expect(css).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/u)
    expect(css).not.toMatch(
      /neon|glass|backdrop-filter|text-shadow|#0b3b2f|#0d3b2e|#0f5132|#2f6b4f/iu,
    )
  })

  it('keeps approved visible Product copy out of component source', () => {
    const componentDirectory = resolve(process.cwd(), 'components/products')
    const source = [
      'known-grade-filter.tsx',
      'product-collection-hero.tsx',
      'product-enquiry-panel.tsx',
      'product-resource-links.tsx',
      'products-hub.tsx',
    ]
      .map((fileName) => readFileSync(resolve(componentDirectory, fileName), 'utf8'))
      .join('\n')

    for (const forbiddenLiteral of [
      'Product Families',
      'Start with the product family',
      'Already know the grade?',
      'Try TP-C120 or C120',
      'No matching grade',
      'Decision Path',
      'Two Ways to Begin',
      'Build a stronger comparison plan',
      'Technical Resource',
      'Common Questions',
      'Frequently Asked Questions',
      'Technical Disclaimer',
      'Application-specific titanium dioxide products',
    ]) {
      expect(source).not.toContain(forbiddenLiteral)
    }
  })

  it('defines every CSS Module class referenced by the new Products components', () => {
    const componentDirectory = resolve(process.cwd(), 'components/products')
    const componentNames = [
      'product-breadcrumbs.tsx',
      'product-decision-rail.tsx',
      'product-collection-hero.tsx',
      'product-enquiry-panel.tsx',
      'product-resource-links.tsx',
      'known-grade-filter.tsx',
      'products-hub.tsx',
    ]
    const source = componentNames
      .map((fileName) => readFileSync(resolve(componentDirectory, fileName), 'utf8'))
      .join('\n')
    const css = [
      'product-layout.module.css',
      'products-hub.module.css',
    ]
      .map((fileName) => readFileSync(resolve(componentDirectory, fileName), 'utf8'))
      .join('\n')
    const referencedClasses = new Set(
      Array.from(
        source.matchAll(
          /(?<![-\w])(?:layout|styles)\.([A-Za-z][A-Za-z0-9_]*)/gu,
        ),
        (match) => match[1],
      ),
    )
    const definedClasses = new Set(
      Array.from(
        css.matchAll(/^\.([A-Za-z][A-Za-z0-9_]*)/gmu),
        (match) => match[1],
      ),
    )

    expect(
      Array.from(referencedClasses).filter(
        (className) => !definedClasses.has(className),
      ),
    ).toEqual([])
  })

  it('copies all three approved hero assets byte-for-byte', () => {
    const sourceDirectory = resolve(
      process.cwd(),
      'docs/prototypes/site-a-products/assets',
    )
    const publicDirectory = resolve(process.cwd(), 'public/site-a/products')

    for (const fileName of [
      'products-hub-hero.jpg',
      'coatings-family-hero.png',
      'tp-c120-hero.png',
    ]) {
      expect(readFileSync(resolve(publicDirectory, fileName))).toEqual(
        readFileSync(resolve(sourceDirectory, fileName)),
      )
    }
    expect(readdirSync(publicDirectory)).not.toContain('tiovar-logo.png')
  }, 30_000)
})
